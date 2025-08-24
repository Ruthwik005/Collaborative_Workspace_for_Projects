import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { getUserNotificationPreferences, markNotificationAsRead } from '../utils/notifications.js'
import { generateWeeklyTimesheet } from '../utils/timesheetGenerator.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get all notifications for the user
router.get('/', async (req, res) => {
  try {
    // For now, return mock notifications since we don't have a Notification model yet
    const mockNotifications = [
      {
        id: '1',
        type: 'task',
        title: 'New Task Assigned',
        message: 'You have been assigned a new task: "Implement user authentication"',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/dashboard'
      },
      {
        id: '2',
        type: 'meeting',
        title: 'Meeting Scheduled',
        message: 'Team standup meeting scheduled for tomorrow at 9 AM',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        link: '/meetings'
      },
      {
        id: '3',
        type: 'feedback',
        title: 'New Feedback',
        message: 'John Doe left feedback on task "Update documentation"',
        read: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        link: '/dashboard'
      }
    ]
    
    res.json(mockNotifications)
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req
    
    // In a real implementation, you would update the notification in the database
    // For now, just return success
    console.log(`Marking notification ${id} as read for user ${user._id}`)
    
    // Emit socket event to update UI
    const io = req.app.get('io')
    io.to(`user-${user._id}`).emit('notification-read', { notificationId: id })
    
    res.json({ success: true, message: 'Notification marked as read' })
  } catch (error) {
    console.error('Mark notification as read error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const { user } = req
    
    // In a real implementation, you would update all notifications for this user
    console.log(`Marking all notifications as read for user ${user._id}`)
    
    // Emit socket event to update UI
    const io = req.app.get('io')
    io.to(`user-${user._id}`).emit('all-notifications-read')
    
    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req
    
    // In a real implementation, you would delete the notification from the database
    console.log(`Deleting notification ${id} for user ${user._id}`)
    
    // Emit socket event to update UI
    const io = req.app.get('io')
    io.to(`user-${user._id}`).emit('notification-deleted', { notificationId: id })
    
    res.json({ success: true, message: 'Notification deleted' })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const { user } = req
    
    // Return default preferences
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReports: true,
      dailyReminders: true,
      meetingReminders: true,
      taskUpdates: true
    }
    
    res.json(preferences)
  } catch (error) {
    console.error('Get notification preferences error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const { user } = req
    const preferences = req.body
    
    // In a real implementation, you would save these preferences to the user's profile
    console.log(`Updating notification preferences for user ${user._id}:`, preferences)
    
    res.json({ success: true, message: 'Preferences updated' })
  } catch (error) {
    console.error('Update notification preferences error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Generate timesheet manually
router.post('/generate-timesheet', async (req, res) => {
  try {
    const { user } = req
    
    console.log(`Generating timesheet for user ${user._id}`)
    
    // Generate timesheet
    const timesheetData = await generateWeeklyTimesheet()
    
    if (timesheetData.success) {
      // Emit notification to user
      const io = req.app.get('io')
      io.to(`user-${user._id}`).emit('notification', {
        id: Date.now().toString(),
        type: 'reminder',
        title: 'Timesheet Generated',
        message: 'Your weekly timesheet has been generated successfully',
        read: false,
        createdAt: new Date().toISOString(),
        link: `/api/notifications/download-timesheet/${timesheetData.filename}`
      })
      
      res.json(timesheetData)
    } else {
      res.status(500).json({ message: 'Failed to generate timesheet' })
    }
  } catch (error) {
    console.error('Generate timesheet error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Download timesheet
router.get('/download-timesheet/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(__dirname, '../../uploads', filename)
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err)
        res.status(404).json({ message: 'File not found' })
      }
    })
  } catch (error) {
    console.error('Download timesheet error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const { user } = req
    
    // Return mock stats
    const stats = {
      total: 15,
      unread: 3,
      read: 12,
      byType: {
        task: 8,
        meeting: 3,
        feedback: 2,
        reminder: 2
      }
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Get notification stats error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
