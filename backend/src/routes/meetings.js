import express from 'express'
import Meeting from '../models/Meeting.js'
import User from '../models/User.js'

const router = express.Router()

// Get all meetings
router.get('/', async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate('organizer', 'username email avatar')
      .populate('attendees.user', 'username email avatar')
      .sort({ startTime: 1 })

    res.json(meetings)
  } catch (error) {
    console.error('Get meetings error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get single meeting
router.get('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'username email avatar')
      .populate('attendees.user', 'username email avatar')

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' })
    }

    res.json(meeting)
  } catch (error) {
    console.error('Get meeting error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create new meeting (Phase 1 - Simulated scheduling)
router.post('/', async (req, res) => {
  try {
    const { title, description, startTime, endTime, type } = req.body

    // Validation
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        message: 'Title, start time, and end time are required'
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      return res.status(400).json({
        message: 'End time must be after start time'
      })
    }

    if (start < new Date()) {
      return res.status(400).json({
        message: 'Meeting cannot be scheduled in the past'
      })
    }

    // Get all active users to add as attendees (simulated auto-invite)
    const allUsers = await User.find({ isActive: true }).select('_id')
    const attendees = allUsers.map(user => ({
      user: user._id,
      status: 'invited'
    }))

    const meeting = new Meeting({
      title,
      description,
      startTime: start,
      endTime: end,
      organizer: req.user._id,
      attendees,
      type: type || 'general'
    })

    await meeting.save()
    await meeting.populate('organizer', 'username email avatar')
    await meeting.populate('attendees.user', 'username email avatar')

    // Emit real-time notification
    const io = req.app.get('io')
    io.emit('meeting-scheduled', {
      meeting,
      message: `New meeting "${meeting.title}" scheduled by ${req.user.username}`
    })

    res.status(201).json(meeting)
  } catch (error) {
    console.error('Create meeting error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update meeting
router.put('/:id', async (req, res) => {
  try {
    const { title, description, startTime, endTime, status, notes } = req.body

    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' })
    }

    // Check if user is organizer or attendee
    const isOrganizer = meeting.organizer.toString() === req.user._id.toString()
    const isAttendee = meeting.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    )

    if (!isOrganizer && !isAttendee) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Update fields (only organizer can update most fields)
    if (isOrganizer) {
      if (title !== undefined) meeting.title = title
      if (description !== undefined) meeting.description = description
      if (startTime !== undefined) meeting.startTime = new Date(startTime)
      if (endTime !== undefined) meeting.endTime = new Date(endTime)
      if (status !== undefined) meeting.status = status
      if (notes !== undefined) meeting.notes = notes
    }

    await meeting.save()
    await meeting.populate('organizer', 'username email avatar')
    await meeting.populate('attendees.user', 'username email avatar')

    res.json(meeting)
  } catch (error) {
    console.error('Update meeting error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update attendee status
router.put('/:id/attendance', async (req, res) => {
  try {
    const { status } = req.body

    if (!['accepted', 'declined', 'attended', 'no-show'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' })
    }

    // Find attendee
    const attendeeIndex = meeting.attendees.findIndex(
      attendee => attendee.user.toString() === req.user._id.toString()
    )

    if (attendeeIndex === -1) {
      return res.status(403).json({ message: 'Not an attendee of this meeting' })
    }

    // Update status
    meeting.attendees[attendeeIndex].status = status
    
    if (status === 'attended') {
      meeting.attendees[attendeeIndex].joinedAt = new Date()
    }

    await meeting.save()
    await meeting.populate('organizer', 'username email avatar')
    await meeting.populate('attendees.user', 'username email avatar')

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('meeting-updated', {
      meeting,
      message: `${req.user.username} ${status} the meeting "${meeting.title}"`
    })

    res.json(meeting)
  } catch (error) {
    console.error('Update attendance error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete meeting
router.delete('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' })
    }

    // Check if user is organizer
    if (meeting.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only organizer can delete meeting' })
    }

    await Meeting.findByIdAndDelete(req.params.id)

    // Emit real-time update
    const io = req.app.get('io')
    io.emit('meeting-deleted', {
      meetingId: req.params.id,
      message: `Meeting "${meeting.title}" cancelled by ${req.user.username}`
    })

    res.json({ message: 'Meeting deleted successfully' })
  } catch (error) {
    console.error('Delete meeting error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get user's meetings
router.get('/user/my', async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { organizer: req.user._id },
        { 'attendees.user': req.user._id }
      ]
    })
      .populate('organizer', 'username email avatar')
      .populate('attendees.user', 'username email avatar')
      .sort({ startTime: 1 })

    res.json(meetings)
  } catch (error) {
    console.error('Get user meetings error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router