const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getUnreadNotificationCount 
} = require('../utils/notifications');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user's notifications with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      read,
      type,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = { recipient: req.user._id };
    
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    
    if (type) {
      filter.type = type;
    }

    // Add expiration filter
    filter.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(filter)
      .populate('sender', 'username email avatar')
      .populate('relatedTask', 'title')
      .populate('relatedMeeting', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user._id);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/notifications/:id
// @desc    Get a specific notification
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'username email avatar')
      .populate('relatedTask', 'title')
      .populate('relatedMeeting', 'title');

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this notification' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.id, req.user._id);
    res.json({ notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.message === 'Notification not found') {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (error.message === 'Not authorized to mark this notification as read') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/notifications/:id/unread
// @desc    Mark notification as unread
// @access  Private
router.put('/:id/unread', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to modify this notification' });
    }

    await notification.markAsUnread();
    res.json({ notification });
  } catch (error) {
    console.error('Mark notification as unread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    await markAllNotificationsAsRead(req.user._id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this notification' });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/notifications/clear-read
// @desc    Delete all read notifications
// @access  Private
router.delete('/clear-read', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      read: true
    });

    res.json({ 
      message: `${result.deletedCount} read notifications deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/notifications/types
// @desc    Get notification types for filtering
// @access  Private
router.get('/types', auth, async (req, res) => {
  try {
    const types = await Notification.distinct('type', { recipient: req.user._id });
    res.json({ types });
  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await Notification.countDocuments({ recipient: req.user._id });
    const unread = await getUnreadNotificationCount(req.user._id);
    const read = total - unread;

    // Get counts by type
    const typeStats = await Notification.aggregate([
      { $match: { recipient: req.user._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await Notification.countDocuments({
      recipient: req.user._id,
      createdAt: { $gte: weekAgo }
    });

    res.json({
      total,
      unread,
      read,
      recent,
      byType: typeStats
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;