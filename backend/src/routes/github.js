import express from 'express'
import { Octokit } from 'octokit'
import User from '../models/User.js'
import Task from '../models/Task.js'

const router = express.Router()

// Connect GitHub account
router.post('/connect', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' })
    }

    // For Phase 2: Exchange code for access token
    // This is a placeholder implementation
    const mockAccessToken = 'github_access_token_placeholder'
    
    // Update user with GitHub info
    const user = await User.findById(req.user._id)
    user.githubAccessToken = mockAccessToken
    user.githubId = 'github_user_id_placeholder'
    await user.save()

    res.json({ 
      message: 'GitHub connected successfully',
      connected: true 
    })
  } catch (error) {
    console.error('GitHub connect error:', error)
    res.status(500).json({ message: 'Failed to connect GitHub' })
  }
})

// Set repository URL
router.post('/set-repo', async (req, res) => {
  try {
    const { repoUrl } = req.body

    if (!repoUrl) {
      return res.status(400).json({ message: 'Repository URL required' })
    }

    const user = await User.findById(req.user._id)
    user.githubRepoUrl = repoUrl
    await user.save()

    res.json({ 
      message: 'Repository set successfully',
      repoUrl 
    })
  } catch (error) {
    console.error('Set repo error:', error)
    res.status(500).json({ message: 'Failed to set repository' })
  }
})

// Import GitHub issues as tasks
router.post('/import', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user.githubAccessToken || !user.githubRepoUrl) {
      return res.status(400).json({ 
        message: 'GitHub not connected or repository not set' 
      })
    }

    // For Phase 2: Use actual Octokit to fetch issues
    // This is a placeholder implementation that creates mock tasks
    const mockIssues = [
      {
        id: '1',
        number: 1,
        title: 'Fix login bug',
        body: 'Users cannot log in with special characters in password',
        html_url: 'https://github.com/user/repo/issues/1',
        state: 'open'
      },
      {
        id: '2', 
        number: 2,
        title: 'Add dark mode',
        body: 'Implement dark mode theme toggle',
        html_url: 'https://github.com/user/repo/issues/2',
        state: 'open'
      }
    ]

    const importedTasks = []

    for (const issue of mockIssues) {
      // Check if task already exists
      const existingTask = await Task.findOne({ githubIssueId: issue.id })
      if (existingTask) continue

      const task = new Task({
        title: issue.title,
        description: issue.body || '',
        assignee: req.user._id,
        creator: req.user._id,
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        githubIssueId: issue.id,
        githubIssueNumber: issue.number,
        githubUrl: issue.html_url,
        status: issue.state === 'closed' ? 'done' : 'todo'
      })

      await task.save()
      await task.populate('assignee', 'username email avatar')
      await task.populate('creator', 'username email avatar')
      
      importedTasks.push(task)
    }

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('tasks-imported', {
      tasks: importedTasks,
      message: `${importedTasks.length} GitHub issues imported by ${req.user.username}`
    })

    res.json({
      message: `${importedTasks.length} issues imported successfully`,
      tasks: importedTasks
    })
  } catch (error) {
    console.error('Import GitHub issues error:', error)
    res.status(500).json({ message: 'Failed to import issues' })
  }
})

// GitHub webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const { action, issue } = req.body

    if (action === 'closed' && issue) {
      // Find corresponding task
      const task = await Task.findOne({ githubIssueId: issue.id.toString() })
      
      if (task && task.status !== 'done') {
        task.status = 'done'
        await task.save()
        await task.populate('assignee', 'username email avatar')
        await task.populate('creator', 'username email avatar')

        // Emit real-time update
        const io = req.app.get('io')
        io.emit('task-updated', {
          type: 'github-sync',
          task,
          message: `GitHub issue #${issue.number} was closed - task marked as done`
        })
      }
    }

    res.json({ message: 'Webhook processed' })
  } catch (error) {
    console.error('GitHub webhook error:', error)
    res.status(500).json({ message: 'Webhook processing failed' })
  }
})

// Get GitHub connection status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    res.json({
      connected: !!user.githubAccessToken,
      repoUrl: user.githubRepoUrl,
      githubId: user.githubId
    })
  } catch (error) {
    console.error('GitHub status error:', error)
    res.status(500).json({ message: 'Failed to get GitHub status' })
  }
})

export default router