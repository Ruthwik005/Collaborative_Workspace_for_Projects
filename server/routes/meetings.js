const express = require('express');
const { body, validationResult } = require('express-validator');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { createMeetingNotification } = require('../utils/notifications');
const { emitMeetingUpdate } = require('../utils/socketHandlers');
const { google } = require('googleapis');

const router = express.Router();

// Validation middleware
const validateMeeting = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid date'),
  body('type')
    .optional()
    .isIn(['standup', 'planning', 'review', 'retrospective', 'general'])
    .withMessage('Invalid meeting type')
];

// @route   GET /api/meetings
// @desc    Get all meetings with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    // Add user-specific filters
    filter.$or = [
      { organizer: req.user._id },
      { 'attendees.user': req.user._id }
    ];

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const meetings = await Meeting.find(filter)
      .populate('organizer', 'username email avatar')
      .populate('attendees.user', 'username email avatar')
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Meeting.countDocuments(filter);

    res.json({
      meetings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/meetings
// @desc    Create a new meeting
// @access  Private
router.post('/', auth, validateMeeting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      type,
      attendees,
      agenda,
      isRecurring,
      recurrence
    } = req.body;

    // Validate time range
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const meeting = new Meeting({
      title,
      description,
      startTime,
      endTime,
      type: type || 'general',
      organizer: req.user._id,
      agenda: agenda || [],
      isRecurring: isRecurring || false,
      recurrence: recurrence || null
    });

    // Add organizer as attendee
    meeting.attendees.push({ user: req.user._id, status: 'accepted' });

    // Add other attendees
    if (attendees && attendees.length > 0) {
      for (const attendeeId of attendees) {
        if (attendeeId !== req.user._id.toString()) {
          meeting.attendees.push({ user: attendeeId });
        }
      }
    }

    await meeting.save();

    // Populate references for response
    await meeting.populate([
      { path: 'organizer', select: 'username email avatar' },
      { path: 'attendees.user', select: 'username email avatar' }
    ]);

    // Create Google Calendar event if user has Google integration
    if (req.user.googleToken) {
      try {
        await createGoogleCalendarEvent(meeting, req.user);
      } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        // Don't fail the request, just log the error
      }
    }

    // Send notifications to attendees
    for (const attendee of meeting.attendees) {
      if (attendee.user.toString() !== req.user._id.toString()) {
        await createMeetingNotification(
          'meeting-invite',
          meeting,
          attendee.user,
          req.user._id
        );
      }
    }

    // Emit real-time update
    emitMeetingUpdate('meeting-created', meeting);

    res.status(201).json({ meeting });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/meetings/:id
// @desc    Get a specific meeting
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'username email avatar')
      .populate('attendees.user', 'username email avatar');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is authorized to view this meeting
    const isOrganizer = meeting.organizer._id.toString() === req.user._id.toString();
    const isAttendee = meeting.attendees.some(a => a.user._id.toString() === req.user._id.toString());
    
    if (!isOrganizer && !isAttendee) {
      return res.status(403).json({ error: 'Not authorized to view this meeting' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/meetings/:id
// @desc    Update a meeting
// @access  Private
router.put('/:id', auth, validateMeeting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only organizer can update meeting
    if (meeting.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the organizer can update this meeting' });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      type,
      attendees,
      agenda,
      notes,
      actionItems
    } = req.body;

    // Update fields
    if (title) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (startTime) meeting.startTime = startTime;
    if (endTime) meeting.endTime = endTime;
    if (type) meeting.type = type;
    if (agenda) meeting.agenda = agenda;
    if (notes !== undefined) meeting.notes = notes;
    if (actionItems) meeting.actionItems = actionItems;

    // Update attendees if provided
    if (attendees) {
      meeting.attendees = [{ user: req.user._id, status: 'accepted' }];
      for (const attendeeId of attendees) {
        if (attendeeId !== req.user._id.toString()) {
          meeting.attendees.push({ user: attendeeId });
        }
      }
    }

    await meeting.save();

    // Populate references for response
    await meeting.populate([
      { path: 'organizer', select: 'username email avatar' },
      { path: 'attendees.user', select: 'username email avatar' }
    ]);

    // Update Google Calendar event if exists
    if (meeting.googleCalendarEventId && req.user.googleToken) {
      try {
        await updateGoogleCalendarEvent(meeting, req.user);
      } catch (error) {
        console.error('Error updating Google Calendar event:', error);
      }
    }

    // Emit real-time update
    emitMeetingUpdate('meeting-updated', meeting);

    res.json({ meeting });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/meetings/:id
// @desc    Delete a meeting
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only organizer can delete meeting
    if (meeting.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the organizer can delete this meeting' });
    }

    // Delete from Google Calendar if exists
    if (meeting.googleCalendarEventId && req.user.googleToken) {
      try {
        await deleteGoogleCalendarEvent(meeting, req.user);
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
      }
    }

    await Meeting.findByIdAndDelete(req.params.id);

    // Emit real-time update
    emitMeetingUpdate('meeting-deleted', { id: req.params.id });

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/meetings/:id/respond
// @desc    Respond to meeting invitation
// @access  Private
router.post('/:id/respond', auth, [
  body('status')
    .isIn(['accepted', 'declined'])
    .withMessage('Status must be accepted or declined')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const { status } = req.body;

    // Find and update attendee status
    const attendee = meeting.attendees.find(a => a.user.toString() === req.user._id.toString());
    if (!attendee) {
      return res.status(404).json({ error: 'You are not an attendee of this meeting' });
    }

    attendee.status = status;
    attendee.responseTime = new Date();

    await meeting.save();

    // Populate references for response
    await meeting.populate([
      { path: 'organizer', select: 'username email avatar' },
      { path: 'attendees.user', select: 'username email avatar' }
    ]);

    // Emit real-time update
    emitMeetingUpdate('meeting-updated', meeting);

    res.json({ meeting });
  } catch (error) {
    console.error('Respond to meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/meetings/:id/join
// @desc    Mark attendance for meeting
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const attendee = meeting.attendees.find(a => a.user.toString() === req.user._id.toString());
    if (!attendee) {
      return res.status(404).json({ error: 'You are not an attendee of this meeting' });
    }

    await meeting.markAttendance(req.user._id, true);

    // Populate references for response
    await meeting.populate([
      { path: 'organizer', select: 'username email avatar' },
      { path: 'attendees.user', select: 'username email avatar' }
    ]);

    // Emit real-time update
    emitMeetingUpdate('meeting-updated', meeting);

    res.json({ meeting });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/meetings/schedule-standup
// @desc    Schedule team standup with Google Calendar integration
// @access  Private
router.post('/schedule-standup', auth, async (req, res) => {
  try {
    if (!req.user.googleToken) {
      return res.status(400).json({ error: 'Google Calendar integration required' });
    }

    const { date, time = '09:00', duration = 30 } = req.body;

    // Get all team members
    const teamMembers = await User.find({}, '_id username email');

    // Create meeting
    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const meeting = new Meeting({
      title: 'Daily Standup',
      description: 'Daily team standup meeting',
      startTime,
      endTime,
      type: 'standup',
      organizer: req.user._id,
      isRecurring: true,
      recurrence: {
        frequency: 'daily',
        interval: 1
      }
    });

    // Add all team members as attendees
    for (const member of teamMembers) {
      meeting.attendees.push({ user: member._id });
    }

    await meeting.save();

    // Create Google Calendar event
    try {
      await createGoogleCalendarEvent(meeting, req.user);
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
    }

    // Populate references for response
    await meeting.populate([
      { path: 'organizer', select: 'username email avatar' },
      { path: 'attendees.user', select: 'username email avatar' }
    ]);

    // Send notifications
    for (const attendee of meeting.attendees) {
      if (attendee.user.toString() !== req.user._id.toString()) {
        await createMeetingNotification(
          'meeting-invite',
          meeting,
          attendee.user,
          req.user._id
        );
      }
    }

    // Emit real-time update
    emitMeetingUpdate('meeting-created', meeting);

    res.status(201).json({ meeting });
  } catch (error) {
    console.error('Schedule standup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google Calendar integration functions
const createGoogleCalendarEvent = async (meeting, user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: user.googleToken,
    refresh_token: user.googleRefreshToken
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: meeting.title,
    description: meeting.description,
    start: {
      dateTime: meeting.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: meeting.endTime.toISOString(),
      timeZone: 'UTC',
    },
    attendees: meeting.attendees.map(attendee => ({
      email: attendee.user.email
    })),
    conferenceData: {
      createRequest: {
        requestId: `meet-${meeting._id}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
  });

  // Update meeting with Google Calendar event ID and Meet link
  meeting.googleCalendarEventId = response.data.id;
  meeting.googleMeetLink = response.data.hangoutLink;
  await meeting.save();

  return response.data;
};

const updateGoogleCalendarEvent = async (meeting, user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: user.googleToken,
    refresh_token: user.googleRefreshToken
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: meeting.title,
    description: meeting.description,
    start: {
      dateTime: meeting.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: meeting.endTime.toISOString(),
      timeZone: 'UTC',
    },
    attendees: meeting.attendees.map(attendee => ({
      email: attendee.user.email
    }))
  };

  await calendar.events.update({
    calendarId: 'primary',
    eventId: meeting.googleCalendarEventId,
    resource: event,
  });
};

const deleteGoogleCalendarEvent = async (meeting, user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: user.googleToken,
    refresh_token: user.googleRefreshToken
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: meeting.googleCalendarEventId,
  });
};

module.exports = router;