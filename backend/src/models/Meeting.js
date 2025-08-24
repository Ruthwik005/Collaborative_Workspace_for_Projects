import mongoose from 'mongoose'

const attendeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['invited', 'accepted', 'declined', 'attended', 'no-show'],
    default: 'invited'
  },
  joinedAt: {
    type: Date,
    default: null
  },
  leftAt: {
    type: Date,
    default: null
  }
})

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [attendeeSchema],
  // Meeting type
  type: {
    type: String,
    enum: ['standup', 'planning', 'review', 'retrospective', 'general'],
    default: 'general'
  },
  // Integration fields
  googleCalendarEventId: {
    type: String,
    default: null
  },
  googleMeetLink: {
    type: String,
    default: null
  },
  // Meeting status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  // Recording and notes
  recordingUrl: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  // Automated scheduling
  isAutoScheduled: {
    type: Boolean,
    default: false
  },
  recurringRule: {
    type: String, // RRULE format for recurring meetings
    default: null
  }
}, {
  timestamps: true
})

// Index for efficient queries
meetingSchema.index({ startTime: 1 })
meetingSchema.index({ organizer: 1 })
meetingSchema.index({ 'attendees.user': 1 })
meetingSchema.index({ googleCalendarEventId: 1 })

// Virtual for meeting duration
meetingSchema.virtual('duration').get(function() {
  return this.endTime - this.startTime
})

// Virtual for attendance count
meetingSchema.virtual('attendanceCount').get(function() {
  return this.attendees.filter(attendee => 
    attendee.status === 'attended'
  ).length
})

const Meeting = mongoose.model('Meeting', meetingSchema)

export default Meeting