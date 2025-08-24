import express from 'express'
import Task from '../models/Task.js'
import User from '../models/User.js'

const router = express.Router()

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .populate('feedback.user', 'username email avatar')
      .sort({ createdAt: -1 })

    res.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .populate('feedback.user', 'username email avatar')

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create new task
router.post('/', async (req, res) => {
  try {
    const { title, description, assignee, priority, dueDate, estimatedHours } = req.body

    // Validation
    if (!title || !assignee || !dueDate) {
      return res.status(400).json({
        message: 'Title, assignee, and due date are required'
      })
    }

    // Check if assignee exists
    const assigneeUser = await User.findById(assignee)
    if (!assigneeUser) {
      return res.status(400).json({
        message: 'Assignee not found'
      })
    }

    const task = new Task({
      title,
      description,
      assignee,
      creator: req.user._id,
      priority: priority || 'medium',
      dueDate: new Date(dueDate),
      estimatedHours: estimatedHours || 0
    })

    await task.save()
    await task.populate('assignee', 'username email avatar')
    await task.populate('creator', 'username email avatar')

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('task-updated', {
      type: 'created',
      task,
      message: `New task "${task.title}" created by ${req.user.username}`
    })

    res.status(201).json(task)
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assignee, dueDate, estimatedHours, actualHours, googleDocUrl, googleDocTitle } = req.body

    const task = await Task.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Store old status for comparison
    const oldStatus = task.status

    // Update fields
    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (status !== undefined) task.status = status
    if (priority !== undefined) task.priority = priority
    if (assignee !== undefined) {
      const assigneeUser = await User.findById(assignee)
      if (!assigneeUser) {
        return res.status(400).json({ message: 'Assignee not found' })
      }
      task.assignee = assignee
    }
    if (dueDate !== undefined) task.dueDate = new Date(dueDate)
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours
    if (actualHours !== undefined) task.actualHours = actualHours
    if (googleDocUrl !== undefined) task.googleDocUrl = googleDocUrl
    if (googleDocTitle !== undefined) task.googleDocTitle = googleDocTitle

    await task.save()
    await task.populate('assignee', 'username email avatar')
    await task.populate('creator', 'username email avatar')
    await task.populate('feedback.user', 'username email avatar')

    // Emit real-time update
    const io = req.app.get('io')
    let message = `Task "${task.title}" updated by ${req.user.username}`
    
    if (status && status !== oldStatus) {
      const statusMap = {
        'todo': 'To Do',
        'inprogress': 'In Progress', 
        'done': 'Done'
      }
      message = `Task "${task.title}" moved to "${statusMap[status]}" by ${req.user.username}`
    }

    io.emit('task-updated', {
      type: 'updated',
      task,
      message
    })

    res.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    await Task.findByIdAndDelete(req.params.id)

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('task-updated', {
      type: 'deleted',
      taskId: req.params.id,
      message: `Task "${task.title}" deleted by ${req.user.username}`
    })

    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Add feedback to task
router.post('/:id/feedback', async (req, res) => {
  try {
    const { content } = req.body

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Feedback content is required' })
    }

    const task = await Task.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const feedback = {
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    }

    task.feedback.push(feedback)
    await task.save()
    await task.populate('feedback.user', 'username email avatar')

    // Get the newly added feedback with populated user
    const newFeedback = task.feedback[task.feedback.length - 1]

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('task-updated', {
      type: 'feedback-added',
      taskId: task._id,
      feedback: newFeedback,
      message: `${req.user.username} added feedback to "${task.title}"`
    })

    res.status(201).json(newFeedback)
  } catch (error) {
    console.error('Add feedback error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get tasks by user
router.get('/user/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.params.userId })
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .sort({ createdAt: -1 })

    res.json(tasks)
  } catch (error) {
    console.error('Get user tasks error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router