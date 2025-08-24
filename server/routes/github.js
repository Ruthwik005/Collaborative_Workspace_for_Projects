import express from 'express';
import { Octokit } from 'octokit';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { authMiddleware } from '../utils/authMiddleware.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Import Issues
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const octokit = new Octokit({ auth: user.github.accessToken });
    const [owner, repo] = user.github.repo.split('/');
    const { data: issues } = await octokit.request('GET /repos/{owner}/{repo}/issues', { owner, repo, state: 'open' });

    const tasksPromises = issues.map((issue) =>
      Task.create({
        title: issue.title,
        description: issue.body,
        githubIssueId: issue.number,
      })
    );
    const tasks = await Promise.all(tasksPromises);
    res.json(tasks);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GitHub Webhook endpoint
router.post('/webhook', async (req, res) => {
  const payload = req.body;
  if (payload.action === 'closed' && payload.issue) {
    const task = await Task.findOne({ githubIssueId: payload.issue.number });
    if (task) {
      task.status = 'Done';
      await task.save();
      const io = req.app.get('io');
      io.emit('task-updated', { type: 'update', task });
      await Notification.create({ message: `GitHub Issue #${payload.issue.number} was closed`, link: payload.issue.html_url });
    }
  }
  res.sendStatus(200);
});

export default router;