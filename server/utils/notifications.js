const Notification = require('../models/Notification');
const { sendUserNotification } = require('./socketHandlers');

// Create a new notification
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.createNotification(notificationData);
    
    // Send real-time notification via Socket.IO
    sendUserNotification(notification.recipient, {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
      priority: notification.priority,
      timestamp: notification.createdAt
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create task-related notifications
const createTaskNotification = async (type, task, recipient, sender = null, additionalData = {}) => {
  const notificationTemplates = {
    'task-assigned': {
      title: 'New Task Assigned',
      message: `You have been assigned to: ${task.title}`,
      priority: 'medium'
    },
    'task-updated': {
      title: 'Task Updated',
      message: `Task "${task.title}" has been updated`,
      priority: 'low'
    },
    'task-completed': {
      title: 'Task Completed',
      message: `Task "${task.title}" has been completed`,
      priority: 'medium'
    },
    'feedback-received': {
      title: 'New Feedback',
      message: `New feedback received on task "${task.title}"`,
      priority: 'medium'
    }
  };

  const template = notificationTemplates[type];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  return createNotification({
    recipient,
    sender,
    type,
    title: template.title,
    message: template.message,
    relatedTask: task._id,
    actionUrl: `/tasks/${task._id}`,
    actionText: 'View Task',
    priority: template.priority,
    metadata: additionalData
  });
};

// Create meeting-related notifications
const createMeetingNotification = async (type, meeting, recipient, sender = null, additionalData = {}) => {
  const notificationTemplates = {
    'meeting-invite': {
      title: 'Meeting Invitation',
      message: `You have been invited to: ${meeting.title}`,
      priority: 'high'
    },
    'meeting-reminder': {
      title: 'Meeting Reminder',
      message: `Meeting "${meeting.title}" starts in 15 minutes`,
      priority: 'high'
    },
    'meeting-cancelled': {
      title: 'Meeting Cancelled',
      message: `Meeting "${meeting.title}" has been cancelled`,
      priority: 'medium'
    }
  };

  const template = notificationTemplates[type];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  return createNotification({
    recipient,
    sender,
    type,
    title: template.title,
    message: template.message,
    relatedMeeting: meeting._id,
    actionUrl: `/meetings/${meeting._id}`,
    actionText: 'View Meeting',
    priority: template.priority,
    metadata: additionalData
  });
};

// Create GitHub-related notifications
const createGitHubNotification = async (action, data, recipient, additionalData = {}) => {
  const notificationTemplates = {
    'issue-imported': {
      title: 'GitHub Issue Imported',
      message: `Issue "${data.title}" has been imported from GitHub`,
      priority: 'medium'
    },
    'issue-synced': {
      title: 'GitHub Issue Synced',
      message: `Issue "${data.title}" has been synced with GitHub`,
      priority: 'low'
    },
    'issue-closed': {
      title: 'GitHub Issue Closed',
      message: `Issue "${data.title}" has been closed on GitHub`,
      priority: 'medium'
    }
  };

  const template = notificationTemplates[action];
  if (!template) {
    throw new Error(`Unknown GitHub action: ${action}`);
  }

  return createNotification({
    recipient,
    type: 'github-issue-synced',
    title: template.title,
    message: template.message,
    actionUrl: data.html_url,
    actionText: 'View on GitHub',
    priority: template.priority,
    metadata: { ...data, ...additionalData }
  });
};

// Create system notifications
const createSystemNotification = async (title, message, recipient, priority = 'low', additionalData = {}) => {
  return createNotification({
    recipient,
    type: 'system-alert',
    title,
    message,
    priority,
    metadata: additionalData
  });
};

// Create weekly report notification
const createWeeklyReportNotification = async (recipient, reportUrl, additionalData = {}) => {
  return createNotification({
    recipient,
    type: 'weekly-report-ready',
    title: 'Weekly Report Ready',
    message: 'Your weekly report is ready for download',
    actionUrl: reportUrl,
    actionText: 'Download Report',
    priority: 'medium',
    metadata: additionalData
  });
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.recipient.toString() !== userId.toString()) {
      throw new Error('Not authorized to mark this notification as read');
    }

    await notification.markAsRead();
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read for a user
const markAllNotificationsAsRead = async (userId) => {
  try {
    await Notification.markAllAsRead(userId);
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Get unread notification count for a user
const getUnreadNotificationCount = async (userId) => {
  try {
    return await Notification.getUnreadCount(userId);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
};

// Delete expired notifications
const cleanupExpiredNotifications = async () => {
  try {
    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    throw error;
  }
};

// Send bulk notifications to multiple users
const sendBulkNotifications = async (notificationData, userIds) => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const notification = await createNotification({
        ...notificationData,
        recipient: userId
      });
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw error;
  }
};

// Create notification for task movement
const createTaskMovementNotification = async (task, fromStatus, toStatus, movedBy, additionalData = {}) => {
  const message = `${movedBy.username} moved "${task.title}" from ${fromStatus} to ${toStatus}`;
  
  // Notify task creator and assignee
  const recipients = [task.creator];
  if (task.assignee && task.assignee.toString() !== movedBy._id.toString()) {
    recipients.push(task.assignee);
  }

  const notifications = [];
  for (const recipient of recipients) {
    if (recipient.toString() !== movedBy._id.toString()) {
      const notification = await createNotification({
        recipient,
        sender: movedBy._id,
        type: 'task-updated',
        title: 'Task Moved',
        message,
        relatedTask: task._id,
        actionUrl: `/tasks/${task._id}`,
        actionText: 'View Task',
        priority: 'low',
        metadata: { fromStatus, toStatus, ...additionalData }
      });
      notifications.push(notification);
    }
  }

  return notifications;
};

module.exports = {
  createNotification,
  createTaskNotification,
  createMeetingNotification,
  createGitHubNotification,
  createSystemNotification,
  createWeeklyReportNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  cleanupExpiredNotifications,
  sendBulkNotifications,
  createTaskMovementNotification
};