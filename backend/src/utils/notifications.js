import User from '../models/User.js'
import Task from '../models/Task.js'
import Meeting from '../models/Meeting.js'

// Phase 3: Notification service for automated notifications
export const sendNotification = async (type, data = {}) => {
  try {
    switch (type) {
      case 'weekly-timesheet':
        return await handleWeeklyTimesheetNotification(data)
      
      case 'daily-reminders':
        return await handleDailyReminders()
      
      case 'task-overdue':
        return await handleTaskOverdueNotification(data)
      
      case 'meeting-reminder':
        return await handleMeetingReminderNotification(data)
      
      case 'github-sync':
        return await handleGitHubSyncNotification(data)
      
      default:
        console.log(`Unknown notification type: ${type}`)
        return { success: false, message: 'Unknown notification type' }
    }
  } catch (error) {
    console.error(`Notification error for type ${type}:`, error)
    return { success: false, error: error.message }
  }
}

// Weekly timesheet notification
const handleWeeklyTimesheetNotification = async (timesheetData) => {
  try {
    // Get all active users
    const users = await User.find({ isActive: true })
    
    // In a real implementation, you would send emails here
    // For now, we'll just log the notification
    console.log(`Weekly timesheet notification sent to ${users.length} users`)
    console.log(`Download URL: ${timesheetData.downloadUrl}`)
    
    return {
      success: true,
      message: `Weekly timesheet notification sent to ${users.length} users`,
      recipients: users.length
    }
  } catch (error) {
    throw error
  }
}

// Daily task reminders
const handleDailyReminders = async () => {
  try {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Find tasks due tomorrow
    const upcomingTasks = await Task.find({
      dueDate: { $gte: today, $lte: tomorrow },
      status: { $ne: 'done' }
    }).populate('assignee', 'username email')
      .populate('creator', 'username email')
    
    // Group by user
    const userReminders = {}
    upcomingTasks.forEach(task => {
      const userId = task.assignee._id.toString()
      if (!userReminders[userId]) {
        userReminders[userId] = {
          user: task.assignee,
          tasks: []
        }
      }
      userReminders[userId].tasks.push(task)
    })
    
    // Send reminders to each user
    let reminderCount = 0
    for (const [userId, reminderData] of Object.entries(userReminders)) {
      if (reminderData.tasks.length > 0) {
        // In a real implementation, send email here
        console.log(`Daily reminder sent to ${reminderData.user.username}: ${reminderData.tasks.length} tasks due`)
        reminderCount++
      }
    }
    
    return {
      success: true,
      message: `Daily reminders sent to ${reminderCount} users`,
      remindersSent: reminderCount
    }
  } catch (error) {
    throw error
  }
}

// Task overdue notification
const handleTaskOverdueNotification = async (taskData) => {
  try {
    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $ne: 'done' }
    }).populate('assignee', 'username email')
      .populate('creator', 'username email')
    
    let notificationCount = 0
    for (const task of overdueTasks) {
      // In a real implementation, send email notification
      console.log(`Overdue task notification: "${task.title}" assigned to ${task.assignee.username}`)
      notificationCount++
    }
    
    return {
      success: true,
      message: `Overdue task notifications sent: ${notificationCount}`,
      notificationsSent: notificationCount
    }
  } catch (error) {
    throw error
  }
}

// Meeting reminder notification
const handleMeetingReminderNotification = async (meetingData) => {
  try {
    const now = new Date()
    const reminderTime = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
    
    const upcomingMeetings = await Meeting.find({
      startTime: { $gte: now, $lte: reminderTime },
      status: 'scheduled'
    }).populate('organizer', 'username email')
      .populate('attendees.user', 'username email')
    
    let reminderCount = 0
    for (const meeting of upcomingMeetings) {
      // Send reminder to organizer and attendees
      const allParticipants = [meeting.organizer, ...meeting.attendees.map(a => a.user)]
      
      for (const participant of allParticipants) {
        // In a real implementation, send email/notification here
        console.log(`Meeting reminder: "${meeting.title}" in 15 minutes for ${participant.username}`)
        reminderCount++
      }
    }
    
    return {
      success: true,
      message: `Meeting reminders sent: ${reminderCount}`,
      remindersSent: reminderCount
    }
  } catch (error) {
    throw error
  }
}

// GitHub sync notification
const handleGitHubSyncNotification = async (syncData) => {
  try {
    // Notify users about GitHub sync events
    if (syncData.type === 'issue-closed') {
      console.log(`GitHub sync notification: Issue #${syncData.issueNumber} closed, task marked as done`)
    } else if (syncData.type === 'issues-imported') {
      console.log(`GitHub sync notification: ${syncData.count} issues imported from repository`)
    }
    
    return {
      success: true,
      message: 'GitHub sync notification processed',
      syncType: syncData.type
    }
  } catch (error) {
    throw error
  }
}

// Get user's notification preferences
export const getUserNotificationPreferences = async (userId) => {
  try {
    const user = await User.findById(userId)
    return {
      emailNotifications: true, // Default to true
      pushNotifications: true,
      weeklyReports: true,
      dailyReminders: true,
      meetingReminders: true,
      taskUpdates: true
    }
  } catch (error) {
    console.error('Error getting user notification preferences:', error)
    return null
  }
}

// Mark notification as read
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    // In a real implementation, you would update a notifications collection
    // For now, we'll just return success
    return {
      success: true,
      message: 'Notification marked as read'
    }
  } catch (error) {
    throw error
  }
}
