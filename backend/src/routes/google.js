import express from 'express'
import { google } from 'googleapis'
import User from '../models/User.js'
import Meeting from '../models/Meeting.js'

const router = express.Router()

// Connect Google account
router.post('/connect', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' })
    }

    // For Phase 2: Exchange code for access token
    // This is a placeholder implementation
    const mockAccessToken = 'google_access_token_placeholder'
    const mockRefreshToken = 'google_refresh_token_placeholder'
    
    // Update user with Google info
    const user = await User.findById(req.user._id)
    user.googleAccessToken = mockAccessToken
    user.googleRefreshToken = mockRefreshToken
    user.googleId = 'google_user_id_placeholder'
    await user.save()

    res.json({ 
      message: 'Google account connected successfully',
      connected: true 
    })
  } catch (error) {
    console.error('Google connect error:', error)
    res.status(500).json({ message: 'Failed to connect Google account' })
  }
})

// Schedule meeting with Google Calendar integration
router.post('/schedule-meeting', async (req, res) => {
  try {
    const { title, description, startTime, endTime, type } = req.body

    // Validation
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        message: 'Title, start time, and end time are required'
      })
    }

    const user = await User.findById(req.user._id)
    
    if (!user.googleAccessToken) {
      return res.status(400).json({ 
        message: 'Google account not connected' 
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    // For Phase 2: Find available time slots for all team members
    // This is a simplified auto-scheduling simulation
    const allUsers = await User.find({ isActive: true }).select('_id email')
    
    // Simulate finding next available slot (Phase 2 will use actual Google Calendar API)
    const nextAvailableSlot = new Date()
    nextAvailableSlot.setDate(nextAvailableSlot.getDate() + 1) // Tomorrow
    nextAvailableSlot.setHours(10, 0, 0, 0) // 10 AM

    const meetingEndTime = new Date(nextAvailableSlot)
    meetingEndTime.setHours(11, 0, 0, 0) // 1 hour duration

    // Create attendees list
    const attendees = allUsers.map(user => ({
      user: user._id,
      status: 'invited'
    }))

    // Create meeting in database
    const meeting = new Meeting({
      title,
      description,
      startTime: nextAvailableSlot,
      endTime: meetingEndTime,
      organizer: req.user._id,
      attendees,
      type: type || 'general',
      isAutoScheduled: true,
      googleMeetLink: 'https://meet.google.com/placeholder-link'
    })

    await meeting.save()
    await meeting.populate('organizer', 'username email avatar')
    await meeting.populate('attendees.user', 'username email avatar')

    // Emit real-time notification
    const io = req.app.get('io')
    io.emit('meeting-auto-scheduled', {
      meeting,
      message: `Meeting "${meeting.title}" auto-scheduled by ${req.user.username} for ${nextAvailableSlot.toLocaleString()}`
    })

    res.status(201).json({
      message: 'Meeting auto-scheduled successfully',
      meeting,
      scheduledTime: nextAvailableSlot
    })
  } catch (error) {
    console.error('Schedule Google meeting error:', error)
    res.status(500).json({ message: 'Failed to schedule meeting' })
  }
})

// Get Google Calendar events
router.get('/calendar-events', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user.googleAccessToken) {
      return res.status(400).json({ 
        message: 'Google account not connected' 
      })
    }

    // For Phase 2: Fetch actual calendar events
    // This is a placeholder implementation
    const mockEvents = [
      {
        id: 'event1',
        summary: 'Team Standup',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
        attendees: [{ email: user.email }]
      }
    ]

    res.json({ events: mockEvents })
  } catch (error) {
    console.error('Get calendar events error:', error)
    res.status(500).json({ message: 'Failed to fetch calendar events' })
  }
})

// Check availability for time slot
router.post('/check-availability', async (req, res) => {
  try {
    const { startTime, endTime, attendeeEmails } = req.body

    const user = await User.findById(req.user._id)
    
    if (!user.googleAccessToken) {
      return res.status(400).json({ 
        message: 'Google account not connected' 
      })
    }

    // For Phase 2: Check actual calendar availability
    // This is a placeholder that simulates availability checking
    const availability = attendeeEmails.map(email => ({
      email,
      available: Math.random() > 0.3 // 70% chance of being available
    }))

    const allAvailable = availability.every(person => person.available)

    res.json({
      available: allAvailable,
      attendeeAvailability: availability,
      suggestedTimes: allAvailable ? [] : [
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow same time
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Day after tomorrow
      ]
    })
  } catch (error) {
    console.error('Check availability error:', error)
    res.status(500).json({ message: 'Failed to check availability' })
  }
})

// Get Google connection status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    res.json({
      connected: !!user.googleAccessToken,
      googleId: user.googleId
    })
  } catch (error) {
    console.error('Google status error:', error)
    res.status(500).json({ message: 'Failed to get Google status' })
  }
})

// Disconnect Google account
router.post('/disconnect', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.googleAccessToken = null
    user.googleRefreshToken = null
    user.googleId = null
    await user.save()

    res.json({ message: 'Google account disconnected successfully' })
  } catch (error) {
    console.error('Google disconnect error:', error)
    res.status(500).json({ message: 'Failed to disconnect Google account' })
  }
})

export default router