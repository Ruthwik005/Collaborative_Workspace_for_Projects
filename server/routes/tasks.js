import express from 'express';
import Task from '../models/Task.js';
import { authMiddleware } from '../utils/authMiddleware.js';

const router = express.Router();

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find().populate('assignee', 'username email avatarUrl');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    const io = req.app.get('io');
    io.emit('task-updated', { type: 'create', task });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const io = req.app.get('io');
    io.emit('task-updated', { type: 'update', task });
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add feedback
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.feedback.push({ user: req.userId, comment: req.body.comment });
    await task.save();
    const io = req.app.get('io');
    io.emit('task-updated', { type: 'feedback', taskId: task._id });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;