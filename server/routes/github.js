const express = require('express');
const { body, validationResult } = require('express-validator');
const { Octokit } = require('octokit');
const crypto = require('crypto');
const User = require('../models/User');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const { createGitHubNotification } = require('../utils/notifications');
const { sendGitHubSyncNotification } = require('../utils/socketHandlers');

const router = express.Router();

// @route   GET /api/github/auth
// @desc    Initiate GitHub OAuth flow
// @access  Private
router.get('/auth', auth, async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in user session or temporary storage
    req.session.githubState = state;
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo&state=${state}`;
    
    res.json({ authUrl: githubAuthUrl });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/github/callback
// @desc    Handle GitHub OAuth callback
// @access  Public
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state parameter
    if (state !== req.session.githubState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || 'GitHub authentication failed' });
    }

    // Get user info from GitHub
    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: userData } = await octokit.rest.users.getAuthenticated();

    // Update user with GitHub credentials
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    user.githubToken = tokenData.access_token;
    user.githubUsername = userData.login;
    await user.save();

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/settings?github=success`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?github=error`);
  }
});

// @route   GET /api/github/repos
// @desc    Get user's GitHub repositories
// @access  Private
router.get('/repos', auth, async (req, res) => {
  try {
    if (!req.user.githubToken) {
      return res.status(400).json({ error: 'GitHub integration not connected' });
    }

    const octokit = new Octokit({ auth: req.user.githubToken });
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });

    res.json({ repos });
  } catch (error) {
    console.error('Get GitHub repos error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/github/connect-repo
// @desc    Connect a GitHub repository for issue sync
// @access  Private
router.post('/connect-repo', auth, [
  body('owner').notEmpty().withMessage('Repository owner is required'),
  body('repo').notEmpty().withMessage('Repository name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user.githubToken) {
      return res.status(400).json({ error: 'GitHub integration not connected' });
    }

    const { owner, repo } = req.body;

    const octokit = new Octokit({ auth: req.user.githubToken });

    // Verify repository access
    try {
      await octokit.rest.repos.get({ owner, repo });
    } catch (error) {
      return res.status(400).json({ error: 'Repository not found or access denied' });
    }

    // Store connected repository info
    req.user.connectedRepo = { owner, repo };
    await req.user.save();

    res.json({ 
      message: 'Repository connected successfully',
      repository: { owner, repo }
    });
  } catch (error) {
    console.error('Connect repo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/github/import-issues
// @desc    Import GitHub issues as tasks
// @access  Private
router.post('/import-issues', auth, async (req, res) => {
  try {
    if (!req.user.githubToken || !req.user.connectedRepo) {
      return res.status(400).json({ error: 'GitHub repository not connected' });
    }

    const { owner, repo } = req.user.connectedRepo;
    const octokit = new Octokit({ auth: req.user.githubToken });

    // Get open issues from GitHub
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100
    });

    const importedTasks = [];
    const skippedTasks = [];

    for (const issue of issues) {
      // Check if issue already exists
      const existingTask = await Task.findOne({ 
        githubIssueId: issue.id,
        githubRepository: `${owner}/${repo}`
      });

      if (existingTask) {
        skippedTasks.push(issue);
        continue;
      }

      // Create new task from GitHub issue
      const task = new Task({
        title: issue.title,
        description: issue.body || '',
        status: 'todo',
        priority: issue.labels.some(label => label.name.includes('high')) ? 'high' : 
                 issue.labels.some(label => label.name.includes('low')) ? 'low' : 'medium',
        creator: req.user._id,
        githubIssueId: issue.id,
        githubIssueNumber: issue.number,
        githubRepository: `${owner}/${repo}`,
        tags: issue.labels.map(label => label.name),
        dueDate: issue.due_on ? new Date(issue.due_on) : null
      });

      await task.save();
      await task.addActivity('created', req.user._id, 'Imported from GitHub issue');

      // Populate references
      await task.populate([
        { path: 'assignee', select: 'username email avatar' },
        { path: 'creator', select: 'username email avatar' }
      ]);

      importedTasks.push(task);

      // Create notification
      await createGitHubNotification(
        'issue-imported',
        { title: issue.title, html_url: issue.html_url },
        req.user._id
      );
    }

    // Send real-time notification
    sendGitHubSyncNotification('issues-imported', {
      imported: importedTasks.length,
      skipped: skippedTasks.length,
      repository: `${owner}/${repo}`
    });

    res.json({
      message: `Imported ${importedTasks.length} issues, skipped ${skippedTasks.length}`,
      importedTasks,
      skippedTasks
    });
  } catch (error) {
    console.error('Import issues error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/github/webhook
// @desc    Handle GitHub webhooks for real-time sync
// @access  Public
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')}`;

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { action, issue, repository } = req.body;
    const { owner, name } = repository;

    // Find tasks linked to this issue
    const tasks = await Task.find({
      githubIssueId: issue.id,
      githubRepository: `${owner.login}/${name}`
    }).populate('creator', 'username email');

    if (tasks.length === 0) {
      return res.json({ message: 'No linked tasks found' });
    }

    for (const task of tasks) {
      switch (action) {
        case 'closed':
          if (task.status !== 'done') {
            task.status = 'done';
            task.completedAt = new Date();
            await task.save();
            await task.addActivity('status-changed', task.creator._id, 'Closed via GitHub');
          }
          break;

        case 'reopened':
          if (task.status === 'done') {
            task.status = 'todo';
            task.completedAt = null;
            await task.save();
            await task.addActivity('status-changed', task.creator._id, 'Reopened via GitHub');
          }
          break;

        case 'edited':
          task.title = issue.title;
          task.description = issue.body || '';
          await task.save();
          await task.addActivity('updated', task.creator._id, 'Updated via GitHub');
          break;

        case 'assigned':
        case 'unassigned':
          // Handle assignee changes if needed
          break;
      }

      // Create notification
      await createGitHubNotification(
        action === 'closed' ? 'issue-closed' : 'issue-synced',
        { title: issue.title, html_url: issue.html_url },
        task.creator._id
      );
    }

    // Send real-time notification
    sendGitHubSyncNotification('webhook-received', {
      action,
      issue: issue.title,
      repository: `${owner.login}/${name}`,
      affectedTasks: tasks.length
    });

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/github/sync-task
// @desc    Sync task changes back to GitHub
// @access  Private
router.post('/sync-task/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.githubIssueId || !req.user.githubToken) {
      return res.status(400).json({ error: 'Task not linked to GitHub or GitHub not connected' });
    }

    const { owner, repo } = req.user.connectedRepo;
    const octokit = new Octokit({ auth: req.user.githubToken });

    // Update GitHub issue based on task status
    if (task.status === 'done') {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: task.githubIssueNumber,
        state: 'closed'
      });
    } else if (task.status === 'todo' || task.status === 'in-progress') {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: task.githubIssueNumber,
        state: 'open'
      });
    }

    // Update issue title and body if changed
    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: task.githubIssueNumber,
      title: task.title,
      body: task.description || ''
    });

    await task.addActivity('updated', req.user._id, 'Synced to GitHub');

    res.json({ message: 'Task synced to GitHub successfully' });
  } catch (error) {
    console.error('Sync task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/github/disconnect
// @desc    Disconnect GitHub integration
// @access  Private
router.delete('/disconnect', auth, async (req, res) => {
  try {
    req.user.githubToken = null;
    req.user.githubUsername = null;
    req.user.connectedRepo = null;
    await req.user.save();

    res.json({ message: 'GitHub integration disconnected' });
  } catch (error) {
    console.error('Disconnect GitHub error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/github/status
// @desc    Get GitHub integration status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const status = {
      connected: !!req.user.githubToken,
      username: req.user.githubUsername,
      repository: req.user.connectedRepo
    };

    res.json(status);
  } catch (error) {
    console.error('Get GitHub status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;