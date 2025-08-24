import express from 'express'
import Task from '../models/Task.js'
import User from '../models/User.js'
import mongoose from 'mongoose'
import multer from 'multer'

const router = express.Router()

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})
const upload = multer({ storage: storage })

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .populate('feedback.author', 'username email avatar')
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
      .populate('feedback.author', 'username email avatar')

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

    let assigneeUser = null

    // Handle assignee - can be either user ID or username
    if (mongoose.Types.ObjectId.isValid(assignee)) {
      // If assignee is a valid ObjectId, find the user
      assigneeUser = await User.findById(assignee)
    } else {
      // If assignee is a string (username), find or create user
      assigneeUser = await User.findOne({ username: assignee })
      
      if (!assigneeUser) {
        // Create a new user with the assignee name
        assigneeUser = new User({
          username: assignee,
          email: `${assignee.toLowerCase()}@example.com`, // Generate email
          password: 'tempPassword123', // Temporary password
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee)}&background=random`
        })
        await assigneeUser.save()
        console.log(`Created new user for assignee: ${assignee}`)
      }
    }

    if (!assigneeUser) {
      return res.status(400).json({
        message: 'Could not find or create assignee user'
      })
    }

    const task = new Task({
      title,
      description,
      assignee: assigneeUser._id,
      creator: req.user._id,
      priority: priority || 'medium',
      dueDate: new Date(dueDate),
      estimatedHours: estimatedHours || 0
    })

    await task.save()
    await task.populate('assignee', 'username email avatar')
    await task.populate('creator', 'username email avatar')

    // Emit real-time updates
    const io = req.app.get('io')
    
    // Emit task creation event
    io.emit('task-updated', {
      type: 'created',
      task,
      message: `New task "${task.title}" created by ${req.user.username}`
    })

    // Emit notification to assignee
    if (assigneeUser._id.toString() !== req.user._id.toString()) {
      io.to(`user-${assigneeUser._id}`).emit('notification', {
        id: Date.now().toString(),
        type: 'task',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${task.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
        link: '/dashboard'
      })
    }

    // Emit general notification to all users
    io.emit('notification', {
      id: Date.now().toString(),
      type: 'task',
      title: 'New Task Created',
      message: `${req.user.username} created a new task: "${task.title}"`,
      read: false,
      createdAt: new Date().toISOString(),
      link: '/dashboard'
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

    // Store old values for comparison
    const oldStatus = task.status
    const oldAssignee = task.assignee.toString()

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
    await task.populate('feedback.author', 'username email avatar')

    // Emit real-time updates
    const io = req.app.get('io')
    let message = `Task "${task.title}" updated by ${req.user.username}`
    
    // Handle status change notifications
    if (status && status !== oldStatus) {
      const statusMap = {
        'todo': 'To Do',
        'in-progress': 'In Progress', 
        'done': 'Done'
      }
      message = `Task "${task.title}" moved to "${statusMap[status]}" by ${req.user.username}`
      
      // Emit status change notification
      io.emit('notification', {
        id: Date.now().toString(),
        type: 'task',
        title: 'Task Status Updated',
        message: message,
        read: false,
        createdAt: new Date().toISOString(),
        link: '/dashboard'
      })

      // Special notification for task completion
      if (status === 'done') {
        io.emit('notification', {
          id: (Date.now() + 1).toString(),
          type: 'task',
          title: 'Task Completed! 🎉',
          message: `Task "${task.title}" has been completed by ${req.user.username}`,
          read: false,
          createdAt: new Date().toISOString(),
          link: '/dashboard'
        })
      }
    }

    // Handle assignee change notifications
    if (assignee && assignee !== oldAssignee) {
      const newAssignee = await User.findById(assignee)
      if (newAssignee && newAssignee._id.toString() !== req.user._id.toString()) {
        io.to(`user-${newAssignee._id}`).emit('notification', {
          id: (Date.now() + 2).toString(),
          type: 'task',
          title: 'Task Reassigned',
          message: `Task "${task.title}" has been assigned to you by ${req.user.username}`,
          read: false,
          createdAt: new Date().toISOString(),
          link: '/dashboard'
        })
      }
    }

    // Emit general task update event
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
    const { id } = req.params
    const { content } = req.body
    const { user } = req

    const task = await Task.findById(id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const feedback = {
      author: user._id,
      content: content,
      createdAt: new Date()
    }

    task.feedback.push(feedback)
    await task.save()

    // Populate the new feedback
    await task.populate('feedback.author', 'username email avatar')
    const newFeedback = task.feedback[task.feedback.length - 1]

    // Emit real-time updates
    const io = req.app.get('io')
    io.emit('task-updated', { 
      type: 'feedback-added', 
      taskId: task._id, 
      feedback: newFeedback,
      message: `${user.username} added feedback to "${task.title}"`
    })

    // Send notification to task assignee if different from feedback author
    if (task.assignee.toString() !== user._id.toString()) {
      io.to(`user-${task.assignee}`).emit('notification', {
        id: Date.now().toString(),
        type: 'feedback',
        title: 'New Feedback',
        message: `${user.username} added feedback to "${task.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
        link: `/dashboard?task=${task._id}`
      })
    }

    // General notification to all users
    io.emit('notification', {
      id: Date.now().toString(),
      type: 'feedback',
      title: 'New Feedback',
      message: `${user.username} added feedback to "${task.title}"`,
      read: false,
      createdAt: new Date().toISOString(),
      link: `/dashboard?task=${task._id}`
    })

    res.status(201).json(newFeedback)
  } catch (error) {
    console.error('Add feedback error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Add progress update to task
router.post('/:id/progress', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params
    const { content, type, checklist } = req.body
    const { user } = req

    const task = await Task.findById(id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Validate user can update this task
    if (task.assignee.toString() !== user._id.toString() && 
        task.creator.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' })
    }

    const progressUpdate = {
      author: user._id,
      type: type || 'text',
      content: content || '',
      createdAt: new Date()
    }

    // Handle checklist
    if (checklist && Array.isArray(JSON.parse(checklist))) {
      progressUpdate.checklist = JSON.parse(checklist).map(item => ({
        text: item.text,
        completed: false
      }))
    }

    // Handle file upload
    if (req.file) {
      progressUpdate.fileUrl = `/uploads/${req.file.filename}`
      progressUpdate.fileName = req.file.originalname
      progressUpdate.fileSize = req.file.size
      progressUpdate.type = 'file'
    }

    // Handle voice note (if implemented)
    if (req.body.voiceUrl) {
      progressUpdate.voiceUrl = req.body.voiceUrl
      progressUpdate.voiceDuration = req.body.voiceDuration
      progressUpdate.type = 'voice'
    }

    task.progressUpdates.push(progressUpdate)
    await task.save()

    // Populate author details for the new update
    await task.populate('progressUpdates.author', 'username email avatar')
    const newUpdate = task.progressUpdates[task.progressUpdates.length - 1]

    // Emit real-time updates
    const io = req.app.get('io')
    io.emit('task-updated', { 
      type: 'progress-added', 
      taskId: task._id, 
      update: newUpdate,
      message: `${user.username} added a progress update to "${task.title}"`
    })

    // Send notification to task creator if different from author
    if (task.creator.toString() !== user._id.toString()) {
      io.to(`user-${task.creator}`).emit('notification', {
        id: Date.now().toString(),
        type: 'task',
        title: 'Progress Update',
        message: `${user.username} added a progress update to "${task.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
        link: `/dashboard?task=${task._id}`
      })
    }

    res.status(201).json(newUpdate)
  } catch (error) {
    console.error('Add progress update error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update checklist item
router.put('/:taskId/progress/:updateId/checklist/:itemIndex', async (req, res) => {
  try {
    const { taskId, updateId, itemIndex } = req.params
    const { completed } = req.body
    const { user } = req

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const progressUpdate = task.progressUpdates.id(updateId)
    if (!progressUpdate) {
      return res.status(404).json({ message: 'Progress update not found' })
    }

    if (itemIndex >= progressUpdate.checklist.length) {
      return res.status(400).json({ message: 'Invalid checklist item index' })
    }

    const checklistItem = progressUpdate.checklist[itemIndex]
    checklistItem.completed = completed
    checklistItem.completedAt = completed ? new Date() : null
    checklistItem.completedBy = completed ? user._id : null

    await task.save()

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('task-updated', { 
      type: 'checklist-updated', 
      taskId: task._id, 
      updateId: updateId,
      itemIndex: parseInt(itemIndex),
      completed: completed,
      completedBy: user.username
    })

    res.json({ success: true, checklistItem })
  } catch (error) {
    console.error('Update checklist item error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete progress update
router.delete('/:taskId/progress/:updateId', async (req, res) => {
  try {
    const { taskId, updateId } = req.params
    const { user } = req

    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const progressUpdate = task.progressUpdates.id(updateId)
    if (!progressUpdate) {
      return res.status(404).json({ message: 'Progress update not found' })
    }

    // Only author or task creator can delete
    if (progressUpdate.author.toString() !== user._id.toString() && 
        task.creator.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this update' })
    }

    // Remove the update
    task.progressUpdates.pull(updateId)
    await task.save()

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('task-updated', { 
      type: 'progress-deleted', 
      taskId: task._id, 
      updateId: updateId,
      message: `${user.username} deleted a progress update from "${task.title}"`
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete progress update error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get task with all progress updates
router.get('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req

    const task = await Task.findById(id)
      .populate('progressUpdates.author', 'username email avatar')
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    // Check if user has access to this task
    if (task.assignee._id.toString() !== user._id.toString() && 
        task.creator._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this task' })
    }

    res.json({
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        creator: task.creator,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours
      },
      progressUpdates: task.progressUpdates.sort((a, b) => b.createdAt - a.createdAt)
    })
  } catch (error) {
    console.error('Get task progress error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get tasks by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const tasks = await Task.find({ assignee: userId })
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .populate('feedback.author', 'username email avatar')
      .sort({ createdAt: -1 })

    res.json(tasks)
  } catch (error) {
    console.error('Get tasks by user error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router