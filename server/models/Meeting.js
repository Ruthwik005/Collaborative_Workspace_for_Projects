const mongoose = require('mongoose');

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
  responseTime: {
    type: Date,
    default: null
  },
  joinedAt: {
    type: Date,
    default: null
  },
  leftAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

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
  // Google Calendar integration
  googleCalendarEventId: {
    type: String,
    default: null
  },
  googleMeetLink: {
    type: String,
    default: null
  },
  // Meeting metadata
  type: {
    type: String,
    enum: ['standup', 'planning', 'review', 'retrospective', 'general'],
    default: 'general'
  },
  location: {
    type: String,
    default: null
  },
  // Meeting notes and outcomes
  agenda: [{
    item: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // in minutes
      default: null
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  notes: {
    type: String,
    default: null
  },
  actionItems: [{
    description: {
      type: String,
      required: true
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dueDate: {
      type: Date,
      default: null
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  // Meeting status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  // Recurring meeting settings
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: null
    },
    interval: {
      type: Number,
      default: 1
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  // Reminders
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'push', 'calendar'],
      required: true
    },
    minutesBefore: {
      type: Number,
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
meetingSchema.index({ startTime: 1, organizer: 1 });
meetingSchema.index({ 'attendees.user': 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ googleCalendarEventId: 1 });

// Virtual for checking if meeting is currently happening
meetingSchema.virtual('isHappening').get(function() {
  const now = new Date();
  return this.startTime <= now && this.endTime >= now && this.status === 'scheduled';
});

// Virtual for checking if meeting is upcoming (within next 24 hours)
meetingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return this.startTime > now && this.startTime <= tomorrow && this.status === 'scheduled';
});

// Method to add attendee
meetingSchema.methods.addAttendee = function(userId) {
  const existingAttendee = this.attendees.find(a => a.user.toString() === userId.toString());
  if (!existingAttendee) {
    this.attendees.push({ user: userId });
  }
  return this.save();
};

// Method to update attendee status
meetingSchema.methods.updateAttendeeStatus = function(userId, status) {
  const attendee = this.attendees.find(a => a.user.toString() === userId.toString());
  if (attendee) {
    attendee.status = status;
    attendee.responseTime = new Date();
  }
  return this.save();
};

// Method to mark attendance
meetingSchema.methods.markAttendance = function(userId, joined = true) {
  const attendee = this.attendees.find(a => a.user.toString() === userId.toString());
  if (attendee) {
    if (joined) {
      attendee.joinedAt = new Date();
      attendee.status = 'attended';
    } else {
      attendee.leftAt = new Date();
    }
  }
  return this.save();
};

// Pre-save middleware to validate times
meetingSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

module.exports = mongoose.model('Meeting', meetingSchema);