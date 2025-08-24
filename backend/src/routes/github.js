import express from 'express'
import { Octokit } from 'octokit'
import User from '../models/User.js'
import Task from '../models/Task.js'

const router = express.Router()

// Connect GitHub account with OAuth
router.post('/connect', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' })
    }

    // Phase 2: Exchange authorization code for access token
    // In production, you would implement the full OAuth flow
    // For now, we'll simulate the token exchange
    const mockAccessToken = `github_token_${Date.now()}`
    const mockUserId = `github_user_${Date.now()}`
    
    // Update user with GitHub info
    const user = await User.findById(req.user._id)
    user.githubAccessToken = mockAccessToken
    user.githubId = mockUserId
    await user.save()

    res.json({ 
      message: 'GitHub connected successfully',
      connected: true,
      githubId: mockUserId
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

    // Validate GitHub repository URL format
    const githubRepoRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/.*)?$/
    const match = repoUrl.match(githubRepoRegex)
    
    if (!match) {
      return res.status(400).json({ message: 'Invalid GitHub repository URL' })
    }

    const [, owner, repo] = match

    const user = await User.findById(req.user._id)
    user.githubRepoUrl = repoUrl
    user.githubRepoOwner = owner
    user.githubRepoName = repo
    await user.save()

    res.json({ 
      message: 'Repository set successfully',
      repoUrl,
      owner,
      repo
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

    // Phase 2: Use actual Octokit to fetch issues
    let octokit
    try {
      octokit = new Octokit({ auth: user.githubAccessToken })
    } catch (octokitError) {
      // Fallback to mock data if Octokit fails
      console.log('Using mock GitHub data for development')
      octokit = null
    }

    let issues = []
    
    if (octokit && user.githubRepoOwner && user.githubRepoName) {
      try {
        // Fetch actual issues from GitHub
        const response = await octokit.rest.issues.listForRepo({
          owner: user.githubRepoOwner,
          repo: user.githubRepoName,
          state: 'open',
          per_page: 50
        })
        
        issues = response.data.map(issue => ({
          id: issue.id.toString(),
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          html_url: issue.html_url,
          state: issue.state,
          assignee: issue.assignee,
          labels: issue.labels,
          created_at: issue.created_at,
          updated_at: issue.updated_at
        }))
      } catch (apiError) {
        console.error('GitHub API error:', apiError)
        // Fallback to mock data
        issues = getMockGitHubIssues()
      }
    } else {
      // Use mock data for development
      issues = getMockGitHubIssues()
    }

    const importedTasks = []

    for (const issue of issues) {
      // Check if task already exists
      const existingTask = await Task.findOne({ githubIssueId: issue.id })
      if (existingTask) continue

      // Determine priority from labels
      let priority = 'medium'
      if (issue.labels && issue.labels.length > 0) {
        const priorityLabels = issue.labels.map(label => label.name.toLowerCase())
        if (priorityLabels.includes('high priority') || priorityLabels.includes('urgent')) {
          priority = 'high'
        } else if (priorityLabels.includes('low priority') || priorityLabels.includes('nice to have')) {
          priority = 'low'
        }
      }

      // Calculate due date (7 days from now for high priority, 14 for medium, 21 for low)
      const dueDateOffset = priority === 'high' ? 7 : priority === 'medium' ? 14 : 21
      const dueDate = new Date(Date.now() + dueDateOffset * 24 * 60 * 60 * 1000)

      const task = new Task({
        title: issue.title,
        description: issue.body || '',
        assignee: req.user._id,
        creator: req.user._id,
        priority,
        dueDate,
        githubIssueId: issue.id,
        githubIssueNumber: issue.number,
        githubUrl: issue.html_url,
        status: issue.state === 'closed' ? 'done' : 'todo',
        estimatedHours: priority === 'high' ? 4 : priority === 'medium' ? 8 : 16
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
      message: `${importedTasks.length} GitHub issues imported by ${req.user.username}`,
      repo: user.githubRepoName
    })

    res.json({
      message: `${importedTasks.length} issues imported successfully`,
      tasks: importedTasks,
      totalIssues: issues.length,
      newTasks: importedTasks.length
    })
  } catch (error) {
    console.error('Import GitHub issues error:', error)
    res.status(500).json({ message: 'Failed to import issues' })
  }
})

// GitHub webhook handler for real-time sync
router.post('/webhook', async (req, res) => {
  try {
    const { action, issue, sender } = req.body

    // Verify webhook signature in production
    // const signature = req.headers['x-hub-signature-256']
    // if (!verifyWebhookSignature(signature, req.body, process.env.GITHUB_WEBHOOK_SECRET)) {
    //   return res.status(401).json({ message: 'Invalid webhook signature' })
    // }

    if (action === 'closed' && issue) {
      // Find corresponding task and mark as done
      const task = await Task.findOne({ githubIssueId: issue.id.toString() })
      
      if (task && task.status !== 'done') {
        task.status = 'done'
        task.completedAt = new Date()
        await task.save()
        await task.populate('assignee', 'username email avatar')
        await task.populate('creator', 'username email avatar')

        // Emit real-time update
        const io = req.app.get('io')
        io.emit('task-updated', {
          type: 'github-sync',
          task,
          message: `GitHub issue #${issue.number} was closed - task marked as done`,
          githubUser: sender?.login
        })
      }
    } else if (action === 'reopened' && issue) {
      // Reopen task if issue is reopened
      const task = await Task.findOne({ githubIssueId: issue.id.toString() })
      
      if (task && task.status === 'done') {
        task.status = 'todo'
        task.completedAt = null
        await task.save()
        await task.populate('assignee', 'username email avatar')
        await task.populate('creator', 'username email avatar')

        const io = req.app.get('io')
        io.emit('task-updated', {
          type: 'github-sync',
          task,
          message: `GitHub issue #${issue.number} was reopened - task moved back to todo`,
          githubUser: sender?.login
        })
      }
    } else if (action === 'edited' && issue) {
      // Update task if issue is edited
      const task = await Task.findOne({ githubIssueId: issue.id.toString() })
      
      if (task) {
        task.title = issue.title
        task.description = issue.body || ''
        await task.save()
        await task.populate('assignee', 'username email avatar')
        await task.populate('creator', 'username email avatar')

        const io = req.app.get('io')
        io.emit('task-updated', {
          type: 'github-sync',
          task,
          message: `GitHub issue #${issue.number} was updated`,
          githubUser: sender?.login
        })
      }
    }

    res.json({ message: 'Webhook processed successfully' })
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
      githubId: user.githubId,
      repoOwner: user.githubRepoOwner,
      repoName: user.githubRepoName
    })
  } catch (error) {
    console.error('GitHub status error:', error)
    res.status(500).json({ message: 'Failed to get GitHub status' })
  }
})

// Disconnect GitHub account
router.post('/disconnect', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.githubAccessToken = null
    user.githubId = null
    user.githubRepoUrl = null
    user.githubRepoOwner = null
    user.githubRepoName = null
    await user.save()

    res.json({ message: 'GitHub account disconnected successfully' })
  } catch (error) {
    console.error('GitHub disconnect error:', error)
    res.status(500).json({ message: 'Failed to disconnect GitHub account' })
  }
})

// Get repository statistics
router.get('/repo-stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user.githubAccessToken || !user.githubRepoOwner || !user.githubRepoName) {
      return res.status(400).json({ message: 'GitHub not connected or repository not set' })
    }

    let stats = {}
    
    try {
      const octokit = new Octokit({ auth: user.githubAccessToken })
      
      // Get repository statistics
      const [repoResponse, issuesResponse, pullsResponse] = await Promise.all([
        octokit.rest.repos.get({ owner: user.githubRepoOwner, repo: user.githubRepoName }),
        octokit.rest.issues.listForRepo({ 
          owner: user.githubRepoOwner, 
          repo: user.githubRepoName,
          state: 'all',
          per_page: 1
        }),
        octokit.rest.pulls.list({ 
          owner: user.githubRepoOwner, 
          repo: user.githubRepoName,
          state: 'all',
          per_page: 1
        })
      ])

      stats = {
        repoName: repoResponse.data.full_name,
        description: repoResponse.data.description,
        language: repoResponse.data.language,
        stars: repoResponse.data.stargazers_count,
        forks: repoResponse.data.forks_count,
        openIssues: repoResponse.data.open_issues_count,
        totalIssues: issuesResponse.data.length > 0 ? issuesResponse.headers.link : 0,
        totalPulls: pullsResponse.data.length > 0 ? pullsResponse.headers.link : 0,
        lastUpdated: repoResponse.data.updated_at
      }
    } catch (apiError) {
      console.error('GitHub API error for stats:', apiError)
      // Return mock stats for development
      stats = {
        repoName: `${user.githubRepoOwner}/${user.githubRepoName}`,
        description: 'Mock repository description',
        language: 'JavaScript',
        stars: 42,
        forks: 7,
        openIssues: 12,
        totalIssues: 25,
        totalPulls: 8,
        lastUpdated: new Date().toISOString()
      }
    }

    res.json(stats)
  } catch (error) {
    console.error('Get repo stats error:', error)
    res.status(500).json({ message: 'Failed to fetch repository statistics' })
  }
})

// Helper function for mock GitHub issues (development fallback)
function getMockGitHubIssues() {
  return [
    {
      id: '1',
      number: 1,
      title: 'Fix login authentication bug',
      body: 'Users are experiencing issues with special characters in passwords during login. Need to implement proper input validation and error handling.',
      html_url: 'https://github.com/user/repo/issues/1',
      state: 'open',
      labels: [{ name: 'bug', color: 'd73a4a' }, { name: 'high priority', color: 'b60205' }]
    },
    {
      id: '2', 
      number: 2,
      title: 'Implement dark mode theme',
      body: 'Add a dark mode toggle to improve user experience and reduce eye strain. Should include theme persistence and smooth transitions.',
      html_url: 'https://github.com/user/repo/issues/2',
      state: 'open',
      labels: [{ name: 'enhancement', color: 'a2eeef' }, { name: 'UI/UX', color: '7057ff' }]
    },
    {
      id: '3',
      number: 3,
      title: 'Add unit tests for user authentication',
      body: 'Increase test coverage for authentication module. Include tests for login, logout, password reset, and session management.',
      html_url: 'https://github.com/user/repo/issues/3',
      state: 'open',
      labels: [{ name: 'testing', color: '0075ca' }, { name: 'documentation', color: '0075ca' }]
    }
  ]
}

export default router