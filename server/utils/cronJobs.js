const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { createWeeklyReportNotification, cleanupExpiredNotifications } = require('./notifications');
const { sendWeeklyReportNotification, sendMeetingReminder } = require('./socketHandlers');

// Generate weekly report PDF
const generateWeeklyReport = async () => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get completed tasks from the last week
    const completedTasks = await Task.find({
      status: 'done',
      completedAt: { $gte: weekAgo }
    }).populate('assignee', 'username').populate('creator', 'username');

    // Get all feedback from the last week
    const tasksWithFeedback = await Task.find({
      'feedback.createdAt': { $gte: weekAgo }
    }).populate('feedback.user', 'username');

    // Get all users for the report
    const users = await User.find({}, 'username email');

    // Create PDF document
    const doc = new PDFDocument();
    const filename = `weekly-report-${now.toISOString().split('T')[0]}.pdf`;
    const filepath = path.join(__dirname, '../uploads/reports', filename);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(filepath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Add header
    doc.fontSize(24)
       .text('SynergySphere Weekly Report', { align: 'center' })
       .moveDown();
    
    doc.fontSize(12)
       .text(`Generated on: ${now.toLocaleDateString()}`, { align: 'center' })
       .moveDown(2);

    // Summary section
    doc.fontSize(18)
       .text('Weekly Summary')
       .moveDown();
    
    doc.fontSize(12)
       .text(`Total tasks completed: ${completedTasks.length}`)
       .text(`Total feedback items: ${tasksWithFeedback.reduce((sum, task) => sum + task.feedback.length, 0)}`)
       .text(`Active team members: ${users.length}`)
       .moveDown(2);

    // Completed tasks by user
    doc.fontSize(16)
       .text('Tasks Completed by User')
       .moveDown();

    const tasksByUser = {};
    completedTasks.forEach(task => {
      const username = task.assignee?.username || task.creator?.username || 'Unassigned';
      tasksByUser[username] = (tasksByUser[username] || 0) + 1;
    });

    Object.entries(tasksByUser).forEach(([username, count]) => {
      doc.fontSize(12)
         .text(`${username}: ${count} tasks`)
         .moveDown(0.5);
    });

    doc.moveDown(2);

    // Recent feedback highlights
    doc.fontSize(16)
       .text('Recent Feedback Highlights')
       .moveDown();

    const recentFeedback = [];
    tasksWithFeedback.forEach(task => {
      task.feedback.forEach(feedback => {
        if (feedback.createdAt >= weekAgo) {
          recentFeedback.push({
            task: task.title,
            user: feedback.user.username,
            content: feedback.content,
            date: feedback.createdAt
          });
        }
      });
    });

    // Sort by date and take top 10
    recentFeedback.sort((a, b) => b.date - a.date).slice(0, 10).forEach(feedback => {
      doc.fontSize(10)
         .text(`${feedback.task} - ${feedback.user}`, { bold: true })
         .fontSize(9)
         .text(feedback.content)
         .text(feedback.date.toLocaleDateString(), { italic: true })
         .moveDown();
    });

    // Performance metrics
    doc.addPage();
    doc.fontSize(16)
       .text('Performance Metrics')
       .moveDown();

    // Calculate average completion time
    const completionTimes = completedTasks
      .filter(task => task.createdAt && task.completedAt)
      .map(task => task.completedAt - task.createdAt);

    const avgCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;

    doc.fontSize(12)
       .text(`Average task completion time: ${Math.round(avgCompletionTime / (1000 * 60 * 60 * 24))} days`)
       .moveDown();

    // Priority distribution
    const priorityStats = completedTasks.reduce((stats, task) => {
      stats[task.priority] = (stats[task.priority] || 0) + 1;
      return stats;
    }, {});

    doc.text('Tasks by Priority:')
       .moveDown(0.5);
    
    Object.entries(priorityStats).forEach(([priority, count]) => {
      doc.text(`${priority}: ${count} tasks`);
    });

    doc.moveDown(2);

    // Recommendations section
    doc.fontSize(16)
       .text('Recommendations for Next Week')
       .moveDown();

    const recommendations = [
      'Continue the momentum on high-priority tasks',
      'Schedule team retrospectives to discuss process improvements',
      'Review and update task estimates based on actual completion times',
      'Ensure all team members have balanced workloads'
    ];

    recommendations.forEach((rec, index) => {
      doc.fontSize(12)
         .text(`${index + 1}. ${rec}`)
         .moveDown(0.5);
    });

    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({ filepath, filename });
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    throw error;
  }
};

// Send weekly report to all users
const sendWeeklyReportToUsers = async () => {
  try {
    const { filepath, filename } = await generateWeeklyReport();
    const users = await User.find({}, '_id');
    
    // Send notification to all users
    for (const user of users) {
      await createWeeklyReportNotification(
        user._id,
        `/api/reports/download/${filename}`,
        { reportDate: new Date().toISOString() }
      );
    }

    // Send real-time notification
    sendWeeklyReportNotification(`/api/reports/download/${filename}`);
    
    console.log(`Weekly report generated and sent to ${users.length} users`);
  } catch (error) {
    console.error('Error sending weekly report:', error);
  }
};

// Send meeting reminders
const sendMeetingReminders = async () => {
  try {
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    // Find meetings starting in the next 15-30 minutes
    const upcomingMeetings = await Meeting.find({
      startTime: { $gte: in15Minutes, $lte: in30Minutes },
      status: 'scheduled'
    }).populate('attendees.user', 'username email');

    for (const meeting of upcomingMeetings) {
      // Send real-time reminders
      sendMeetingReminder(meeting, meeting.attendees);
      
      console.log(`Sent reminder for meeting: ${meeting.title}`);
    }
  } catch (error) {
    console.error('Error sending meeting reminders:', error);
  }
};

// Clean up expired notifications
const cleanupNotifications = async () => {
  try {
    const deletedCount = await cleanupExpiredNotifications();
    console.log(`Cleaned up ${deletedCount} expired notifications`);
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
};

// Check for overdue tasks and send reminders
const checkOverdueTasks = async () => {
  try {
    const now = new Date();
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    }).populate('assignee', 'username email').populate('creator', 'username email');

    for (const task of overdueTasks) {
      // Send notification to assignee
      if (task.assignee) {
        await createTaskNotification(
          'task-updated',
          task,
          task.assignee._id,
          null,
          { reason: 'overdue' }
        );
      }

      // Send notification to creator if different from assignee
      if (task.creator && task.assignee && task.creator._id.toString() !== task.assignee._id.toString()) {
        await createTaskNotification(
          'task-updated',
          task,
          task.creator._id,
          null,
          { reason: 'overdue' }
        );
      }
    }

    console.log(`Checked ${overdueTasks.length} overdue tasks`);
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
};

// Setup all cron jobs
const setupCronJobs = () => {
  console.log('Setting up cron jobs...');

  // Weekly report generation - Every Friday at 5:00 PM
  cron.schedule('0 17 * * 5', sendWeeklyReportToUsers, {
    timezone: 'UTC'
  });

  // Meeting reminders - Every 5 minutes
  cron.schedule('*/5 * * * *', sendMeetingReminders, {
    timezone: 'UTC'
  });

  // Cleanup expired notifications - Daily at 2:00 AM
  cron.schedule('0 2 * * *', cleanupNotifications, {
    timezone: 'UTC'
  });

  // Check overdue tasks - Every hour
  cron.schedule('0 * * * *', checkOverdueTasks, {
    timezone: 'UTC'
  });

  console.log('Cron jobs setup complete');
};

module.exports = {
  setupCronJobs,
  generateWeeklyReport,
  sendWeeklyReportToUsers,
  sendMeetingReminders,
  cleanupNotifications,
  checkOverdueTasks
};