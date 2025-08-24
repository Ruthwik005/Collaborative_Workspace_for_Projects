const User = require('../models/User');

let io;

const setupSocketHandlers = (socketIO) => {
  io = socketIO;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room
    socket.on('join-user', async (userId) => {
      try {
        const user = await User.findById(userId);
        if (user) {
          socket.join(`user-${userId}`);
          socket.userId = userId;
          console.log(`User ${user.username} joined their room`);
        }
      } catch (error) {
        console.error('Error joining user room:', error);
      }
    });

    // Join user to team room (for team-wide updates)
    socket.on('join-team', (teamId) => {
      socket.join(`team-${teamId}`);
      console.log(`User joined team room: ${teamId}`);
    });

    // Handle task updates
    socket.on('task-update', (data) => {
      // Broadcast to all connected clients
      io.emit('task-updated', data);
    });

    // Handle meeting updates
    socket.on('meeting-update', (data) => {
      io.emit('meeting-updated', data);
    });

    // Handle notification updates
    socket.on('notification-update', (data) => {
      io.emit('notification-updated', data);
    });

    // Handle user typing indicators
    socket.on('typing-start', (data) => {
      socket.broadcast.to(`task-${data.taskId}`).emit('user-typing', {
        userId: socket.userId,
        username: data.username
      });
    });

    socket.on('typing-stop', (data) => {
      socket.broadcast.to(`task-${data.taskId}`).emit('user-stopped-typing', {
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

// Utility functions to emit events
const emitTaskUpdate = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const emitMeetingUpdate = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const emitNotification = (userId, data) => {
  if (io) {
    io.to(`user-${userId}`).emit('new-notification', data);
  }
};

const emitTeamUpdate = (teamId, event, data) => {
  if (io) {
    io.to(`team-${teamId}`).emit(event, data);
  }
};

const emitGlobalUpdate = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Send notification to specific user
const sendUserNotification = (userId, notification) => {
  if (io) {
    io.to(`user-${userId}`).emit('notification', notification);
  }
};

// Send notification to all users
const sendGlobalNotification = (notification) => {
  if (io) {
    io.emit('global-notification', notification);
  }
};

// Update user's online status
const updateUserStatus = (userId, status) => {
  if (io) {
    io.emit('user-status-updated', { userId, status });
  }
};

// Send real-time task movement notification
const sendTaskMovementNotification = (task, fromStatus, toStatus, movedBy) => {
  if (io) {
    io.emit('task-moved', {
      taskId: task._id,
      taskTitle: task.title,
      fromStatus,
      toStatus,
      movedBy: {
        id: movedBy._id,
        username: movedBy.username
      },
      timestamp: new Date()
    });
  }
};

// Send meeting reminder
const sendMeetingReminder = (meeting, attendees) => {
  if (io) {
    attendees.forEach(attendee => {
      io.to(`user-${attendee.user}`).emit('meeting-reminder', {
        meetingId: meeting._id,
        title: meeting.title,
        startTime: meeting.startTime,
        message: `Meeting "${meeting.title}" starts in 15 minutes`
      });
    });
  }
};

// Send GitHub sync notification
const sendGitHubSyncNotification = (action, data) => {
  if (io) {
    io.emit('github-sync', {
      action,
      data,
      timestamp: new Date()
    });
  }
};

// Send weekly report notification
const sendWeeklyReportNotification = (reportUrl) => {
  if (io) {
    io.emit('weekly-report-ready', {
      message: 'Weekly report is ready for download',
      downloadUrl: reportUrl,
      timestamp: new Date()
    });
  }
};

module.exports = {
  setupSocketHandlers,
  emitTaskUpdate,
  emitMeetingUpdate,
  emitNotification,
  emitTeamUpdate,
  emitGlobalUpdate,
  sendUserNotification,
  sendGlobalNotification,
  updateUserStatus,
  sendTaskMovementNotification,
  sendMeetingReminder,
  sendGitHubSyncNotification,
  sendWeeklyReportNotification
};