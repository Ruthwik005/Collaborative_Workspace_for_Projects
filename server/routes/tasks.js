const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');
const { emitTaskUpdate } = require('../utils/socketHandlers');

const router = express.Router();

// Validation middleware
const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'done'])
    .withMessage('Status must be todo, in-progress, or done'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
];

// @route   GET /api/tasks
// @desc    Get all tasks with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      assignee,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;
    if (priority) filter.priority = priority;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(filter)
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .populate('feedback.user', 'username email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', auth, validateTask, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      priority,
      assignee,
      dueDate,
      tags,
      estimatedHours
    } = req.body;

    const task = new Task({
      title,
      description,
      priority: priority || 'medium',
      assignee: assignee || null,
      creator: req.user._id,
      dueDate: dueDate || null,
      tags: tags || [],
      estimatedHours: estimatedHours || null
    });

    await task.save();

    // Add activity log
    await task.addActivity('created', req.user._id, 'Task created');

    // Populate references for response
    await task.populate([
      { path: 'assignee', select: 'username email avatar' },
      { path: 'creator', select: 'username email avatar' }
    ]);

    // Create notification for assignee
    if (assignee && assignee !== req.user._id.toString()) {
      await createNotification({
        recipient: assignee,
        sender: req.user._id,
        type: 'task-assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to: ${title}`,
        relatedTask: task._id,
        actionUrl: `/tasks/${task._id}`,
        actionText: 'View Task'
      });
    }

    // Emit real-time update
    emitTaskUpdate('task-created', task);

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get a specific task
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'username email avatar')
      .populate('creator', 'username email avatar')
      .populate('feedback.user', 'username email avatar')
      .populate('activityLog.user', 'username email avatar')
      .populate('attachments.uploadedBy', 'username email avatar');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', auth, validateTask, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      title,
      description,
      status,
      priority,
      assignee,
      dueDate,
      tags,
      estimatedHours,
      actualHours
    } = req.body;

    // Track changes for activity log
    const changes = [];
    const oldStatus = task.status;
    const oldAssignee = task.assignee;

    if (title && title !== task.title) {
      task.title = title;
      changes.push('title updated');
    }
    if (description !== undefined && description !== task.description) {
      task.description = description;
      changes.push('description updated');
    }
    if (status && status !== task.status) {
      task.status = status;
      changes.push(`status changed from ${oldStatus} to ${status}`);
    }
    if (priority && priority !== task.priority) {
      task.priority = priority;
      changes.push('priority updated');
    }
    if (assignee !== undefined && assignee !== task.assignee?.toString()) {
      task.assignee = assignee;
      changes.push('assignee updated');
    }
    if (dueDate !== undefined && dueDate !== task.dueDate?.toISOString()) {
      task.dueDate = dueDate;
      changes.push('due date updated');
    }
    if (tags) {
      task.tags = tags;
      changes.push('tags updated');
    }
    if (estimatedHours !== undefined) {
      task.estimatedHours = estimatedHours;
      changes.push('estimated hours updated');
    }
    if (actualHours !== undefined) {
      task.actualHours = actualHours;
      changes.push('actual hours updated');
    }

    await task.save();

    // Add activity log
    if (changes.length > 0) {
      await task.addActivity('updated', req.user._id, changes.join(', '));
    }

    // Create notifications for status changes and reassignments
    if (status === 'done' && oldStatus !== 'done') {
      await createNotification({
        recipient: task.creator,
        sender: req.user._id,
        type: 'task-completed',
        title: 'Task Completed',
        message: `Task "${task.title}" has been completed`,
        relatedTask: task._id,
        actionUrl: `/tasks/${task._id}`,
        actionText: 'View Task'
      });
    }

    if (assignee && assignee !== oldAssignee?.toString() && assignee !== req.user._id.toString()) {
      await createNotification({
        recipient: assignee,
        sender: req.user._id,
        type: 'task-assigned',
        title: 'Task Assigned',
        message: `You have been assigned to: ${task.title}`,
        relatedTask: task._id,
        actionUrl: `/tasks/${task._id}`,
        actionText: 'View Task'
      });
    }

    // Populate references for response
    await task.populate([
      { path: 'assignee', select: 'username email avatar' },
      { path: 'creator', select: 'username email avatar' },
      { path: 'feedback.user', select: 'username email avatar' }
    ]);

    // Emit real-time update
    emitTaskUpdate('task-updated', task);

    res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only creator or admin can delete
    if (task.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Emit real-time update
    emitTaskUpdate('task-deleted', { id: req.params.id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tasks/:id/feedback
// @desc    Add feedback to a task
// @access  Private
router.post('/:id/feedback', auth, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Feedback content must be between 1 and 1000 characters'),
  body('type')
    .optional()
    .isIn(['comment', 'progress', 'blocker'])
    .withMessage('Type must be comment, progress, or blocker')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { content, type = 'comment' } = req.body;

    await task.addFeedback(req.user._id, content, type);
    await task.addActivity('commented', req.user._id, 'Added feedback');

    // Populate references
    await task.populate([
      { path: 'assignee', select: 'username email avatar' },
      { path: 'creator', select: 'username email avatar' },
      { path: 'feedback.user', select: 'username email avatar' }
    ]);

    // Create notification for task creator and assignee
    const notifyUsers = [task.creator];
    if (task.assignee && task.assignee.toString() !== req.user._id.toString()) {
      notifyUsers.push(task.assignee);
    }

    for (const userId of notifyUsers) {
      if (userId.toString() !== req.user._id.toString()) {
        await createNotification({
          recipient: userId,
          sender: req.user._id,
          type: 'feedback-received',
          title: 'New Feedback',
          message: `${req.user.username} added feedback to "${task.title}"`,
          relatedTask: task._id,
          actionUrl: `/tasks/${task._id}`,
          actionText: 'View Task'
        });
      }
    }

    // Emit real-time update
    emitTaskUpdate('task-updated', task);

    res.json({ task });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tasks/:id/attach-google-doc
// @desc    Attach Google Doc to task
// @access  Private
router.post('/:id/attach-google-doc', auth, [
  body('googleDocUrl')
    .isURL()
    .withMessage('Please provide a valid Google Doc URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { googleDocUrl } = req.body;

    // Extract document title from URL (basic implementation)
    const docTitle = googleDocUrl.split('/').pop() || 'Google Document';

    task.googleDocUrl = googleDocUrl;
    task.googleDocTitle = docTitle;

    await task.save();
    await task.addActivity('updated', req.user._id, 'Google Doc attached');

    // Populate references
    await task.populate([
      { path: 'assignee', select: 'username email avatar' },
      { path: 'creator', select: 'username email avatar' },
      { path: 'feedback.user', select: 'username email avatar' }
    ]);

    // Emit real-time update
    emitTaskUpdate('task-updated', task);

    res.json({ task });
  } catch (error) {
    console.error('Attach Google Doc error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;