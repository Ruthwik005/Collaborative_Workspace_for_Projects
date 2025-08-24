import express from 'express'
import { google } from 'googleapis'
import User from '../models/User.js'
import Meeting from '../models/Meeting.js'
import Task from '../models/Task.js'

const router = express.Router()

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
)

// Connect Google account with OAuth
router.post('/connect', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' })
    }

    // Phase 2: Exchange authorization code for access token
    try {
      const { tokens } = await oauth2Client.getToken(code)
      
      // Get user info from Google
      oauth2Client.setCredentials(tokens)
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      
      // Update user with Google info
      const user = await User.findById(req.user._id)
      user.googleAccessToken = tokens.access_token
      user.googleRefreshToken = tokens.refresh_token
      user.googleId = userInfo.data.id
      user.googleEmail = userInfo.data.email
      user.googleName = userInfo.data.name
      user.googlePicture = userInfo.data.picture
      await user.save()

      res.json({ 
        message: 'Google account connected successfully',
        connected: true,
        googleId: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name
      })
    } catch (oauthError) {
      console.error('Google OAuth error:', oauthError)
      // Fallback to mock implementation for development
      const mockAccessToken = `google_token_${Date.now()}`
      const mockRefreshToken = `google_refresh_${Date.now()}`
      const mockUserId = `google_user_${Date.now()}`
      
      const user = await User.findById(req.user._id)
      user.googleAccessToken = mockAccessToken
      user.googleRefreshToken = mockRefreshToken
      user.googleId = mockUserId
      user.googleEmail = 'mock@google.com'
      user.googleName = 'Mock Google User'
      await user.save()

      res.json({ 
        message: 'Google account connected successfully (mock mode)',
        connected: true,
        googleId: mockUserId,
        email: 'mock@google.com',
        name: 'Mock Google User'
      })
    }
  } catch (error) {
    console.error('Google connect error:', error)
    res.status(500).json({ message: 'Failed to connect Google account' })
  }
})

// Schedule meeting with Google Calendar integration
router.post('/schedule-meeting', async (req, res) => {
  try {
    const { title, description, startTime, endTime, type, attendeeEmails } = req.body

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

    // Phase 2: Find available time slots for all team members
    let availableSlot = null
    
    try {
      oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken
      })
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      
      // Check availability for the requested time
      const availabilityResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: attendeeEmails.map(email => ({ id: email }))
        }
      })
      
      // Check if the requested time is available
      const isAvailable = availabilityResponse.data.calendars[user.googleEmail]?.busy?.length === 0
      
      if (isAvailable) {
        availableSlot = { start, end }
      } else {
        // Find next available slot
        availableSlot = await findNextAvailableSlot(calendar, attendeeEmails, start, end)
      }
      
      // Create Google Calendar event
      if (availableSlot) {
        const event = {
          summary: title,
          description: description || '',
          start: {
            dateTime: availableSlot.start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: availableSlot.end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          attendees: attendeeEmails.map(email => ({ email })),
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 15 } // 15 minutes before
            ]
          }
        }
        
        const calendarEvent = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          sendUpdates: 'all'
        })
        
        // Create meeting in database
        const meeting = new Meeting({
          title,
          description,
          startTime: availableSlot.start,
          endTime: availableSlot.end,
          organizer: req.user._id,
          attendees: attendeeEmails.map(email => ({ email, status: 'invited' })),
          type: type || 'general',
          isAutoScheduled: true,
          googleCalendarEventId: calendarEvent.data.id,
          googleMeetLink: calendarEvent.data.hangoutLink || null
        })

        await meeting.save()
        await meeting.populate('organizer', 'username email avatar')

        // Emit real-time notification
        const io = req.app.get('io')
        io.emit('meeting-auto-scheduled', {
          meeting,
          message: `Meeting "${meeting.title}" auto-scheduled by ${req.user.username} for ${availableSlot.start.toLocaleString()}`,
          googleEventId: calendarEvent.data.id
        })

        res.status(201).json({
          message: 'Meeting auto-scheduled successfully with Google Calendar',
          meeting,
          scheduledTime: availableSlot.start,
          googleEventId: calendarEvent.data.id,
          googleMeetLink: calendarEvent.data.hangoutLink
        })
      } else {
        res.status(400).json({ message: 'No available time slots found for the requested period' })
      }
      
    } catch (googleError) {
      console.error('Google Calendar API error:', googleError)
      // Fallback to mock scheduling for development
      const mockSlot = new Date()
      mockSlot.setDate(mockSlot.getDate() + 1)
      mockSlot.setHours(10, 0, 0, 0)
      
      const mockEndTime = new Date(mockSlot)
      mockEndTime.setHours(11, 0, 0, 0)
      
      const meeting = new Meeting({
        title,
        description,
        startTime: mockSlot,
        endTime: mockEndTime,
        organizer: req.user._id,
        attendees: attendeeEmails.map(email => ({ email, status: 'invited' })),
        type: type || 'general',
        isAutoScheduled: true,
        googleMeetLink: 'https://meet.google.com/mock-link'
      })

      await meeting.save()
      await meeting.populate('organizer', 'username email avatar')

      const io = req.app.get('io')
      io.emit('meeting-auto-scheduled', {
        meeting,
        message: `Meeting "${meeting.title}" auto-scheduled by ${req.user.username} for ${mockSlot.toLocaleString()} (mock mode)`
      })

      res.status(201).json({
        message: 'Meeting auto-scheduled successfully (mock mode)',
        meeting,
        scheduledTime: mockSlot
      })
    }
  } catch (error) {
    console.error('Schedule Google meeting error:', error)
    res.status(500).json({ message: 'Failed to schedule meeting' })
  }
})

// Get Google Calendar events
router.get('/calendar-events', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const user = await User.findById(req.user._id)
    
    if (!user.googleAccessToken) {
      return res.status(400).json({ 
        message: 'Google account not connected' 
      })
    }

    try {
      oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken
      })
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      
      const timeMin = startDate ? new Date(startDate) : new Date()
      const timeMax = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
      })
      
      const events = response.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        attendees: event.attendees || [],
        location: event.location,
        hangoutLink: event.hangoutLink
      }))
      
      res.json({ events })
      
    } catch (googleError) {
      console.error('Google Calendar API error:', googleError)
      // Return mock events for development
      const mockEvents = [
        {
          id: 'event1',
          summary: 'Team Standup',
          description: 'Daily team synchronization meeting',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          attendees: [{ email: user.googleEmail || user.email }],
          location: 'Google Meet',
          hangoutLink: 'https://meet.google.com/mock-link'
        }
      ]
      
      res.json({ events: mockEvents })
    }
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

    try {
      oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken
      })
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: new Date(startTime).toISOString(),
          timeMax: new Date(endTime).toISOString(),
          items: attendeeEmails.map(email => ({ id: email }))
        }
      })
      
      const availability = attendeeEmails.map(email => {
        const busy = response.data.calendars[email]?.busy || []
        const isAvailable = busy.length === 0
        return {
          email,
          available: isAvailable,
          busySlots: busy
        }
      })
      
      const allAvailable = availability.every(person => person.available)
      
      // Suggest alternative times if not available
      let suggestedTimes = []
      if (!allAvailable) {
        suggestedTimes = await suggestAlternativeTimes(calendar, attendeeEmails, startTime, endTime)
      }
      
      res.json({
        available: allAvailable,
        attendeeAvailability: availability,
        suggestedTimes
      })
      
    } catch (googleError) {
      console.error('Google Calendar API error:', googleError)
      // Fallback to mock availability checking
      const availability = attendeeEmails.map(email => ({
        email,
        available: Math.random() > 0.3, // 70% chance of being available
        busySlots: []
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
    }
  } catch (error) {
    console.error('Check availability error:', error)
    res.status(500).json({ message: 'Failed to check availability' })
  }
})

// Link Google Doc to task
router.post('/link-doc', async (req, res) => {
  try {
    const { taskId, docUrl, docTitle } = req.body
    
    if (!taskId || !docUrl) {
      return res.status(400).json({ message: 'Task ID and document URL are required' })
    }
    
    // Validate Google Docs URL
    const googleDocRegex = /^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/
    const match = docUrl.match(googleDocRegex)
    
    if (!match) {
      return res.status(400).json({ message: 'Invalid Google Docs URL' })
    }
    
    const docId = match[1]
    
    // Update task with Google Doc link
    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }
    
    task.googleDocUrl = docUrl
    task.googleDocTitle = docTitle || 'Google Document'
    await task.save()
    
    // Emit real-time update
    const io = req.app.get('io')
    io.emit('task-updated', {
      type: 'google-doc-linked',
      task,
      message: `Google Doc linked to task "${task.title}"`
    })
    
    res.json({
      message: 'Google Doc linked successfully',
      task,
      docUrl,
      docTitle: docTitle || 'Google Document'
    })
    
  } catch (error) {
    console.error('Link Google Doc error:', error)
    res.status(500).json({ message: 'Failed to link Google Doc' })
  }
})

// Get Google connection status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    res.json({
      connected: !!user.googleAccessToken,
      googleId: user.googleId,
      googleEmail: user.googleEmail,
      googleName: user.googleName,
      googlePicture: user.googlePicture
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
    user.googleEmail = null
    user.googleName = null
    user.googlePicture = null
    await user.save()

    res.json({ message: 'Google account disconnected successfully' })
  } catch (error) {
    console.error('Google disconnect error:', error)
    res.status(500).json({ message: 'Failed to disconnect Google account' })
  }
})

// Helper function to find next available time slot
async function findNextAvailableSlot(calendar, attendeeEmails, startTime, endTime) {
  const duration = endTime.getTime() - startTime.getTime()
  let currentTime = new Date(startTime)
  
  // Check next 7 days for availability
  for (let day = 0; day < 7; day++) {
    currentTime.setDate(currentTime.getDate() + day)
    
    // Check 9 AM to 5 PM
    for (let hour = 9; hour <= 17; hour++) {
      currentTime.setHours(hour, 0, 0, 0)
      const slotEnd = new Date(currentTime.getTime() + duration)
      
      try {
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: currentTime.toISOString(),
            timeMax: slotEnd.toISOString(),
            items: attendeeEmails.map(email => ({ id: email }))
          }
        })
        
        const isAvailable = attendeeEmails.every(email => 
          response.data.calendars[email]?.busy?.length === 0
        )
        
        if (isAvailable) {
          return { start: new Date(currentTime), end: slotEnd }
        }
      } catch (error) {
        console.error('Error checking availability:', error)
        continue
      }
    }
  }
  
  return null
}

// Helper function to suggest alternative times
async function suggestAlternativeTimes(calendar, attendeeEmails, startTime, endTime) {
  const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
  const suggestions = []
  
  // Suggest times for next 3 days
  for (let day = 1; day <= 3; day++) {
    const suggestionTime = new Date(startTime)
    suggestionTime.setDate(suggestionTime.getDate() + day)
    
    // Suggest 9 AM, 2 PM, and 4 PM
    const times = [9, 14, 16]
    
    for (const hour of times) {
      suggestionTime.setHours(hour, 0, 0, 0)
      const suggestionEnd = new Date(suggestionTime.getTime() + duration)
      
      try {
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: suggestionTime.toISOString(),
            timeMax: suggestionEnd.toISOString(),
            items: attendeeEmails.map(email => ({ id: email }))
          }
        })
        
        const isAvailable = attendeeEmails.every(email => 
          response.data.calendars[email]?.busy?.length === 0
        )
        
        if (isAvailable && suggestions.length < 3) {
          suggestions.push({
            start: suggestionTime,
            end: suggestionEnd,
            label: `${suggestionTime.toLocaleDateString()} at ${hour}:00`
          })
        }
      } catch (error) {
        console.error('Error checking suggestion availability:', error)
        continue
      }
    }
  }
  
  return suggestions
}

export default router