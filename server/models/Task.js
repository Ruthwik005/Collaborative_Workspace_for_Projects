const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['comment', 'progress', 'blocker'],
    default: 'comment'
  }
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  // GitHub integration
  githubIssueId: {
    type: Number,
    default: null
  },
  githubIssueNumber: {
    type: Number,
    default: null
  },
  githubRepository: {
    type: String,
    default: null
  },
  // Google Docs integration
  googleDocUrl: {
    type: String,
    default: null
  },
  googleDocTitle: {
    type: String,
    default: null
  },
  // Task metadata
  tags: [{
    type: String,
    trim: true
  }],
  estimatedHours: {
    type: Number,
    default: null
  },
  actualHours: {
    type: Number,
    default: null
  },
  // Activity tracking
  feedback: [feedbackSchema],
  activityLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'status-changed', 'assigned', 'commented'],
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    details: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // File attachments
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
taskSchema.index({ status: 1, assignee: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ githubIssueId: 1 });
taskSchema.index({ creator: 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.status !== 'done';
});

// Virtual for checking if task is due soon (within 24 hours)
taskSchema.virtual('isDueSoon').get(function() {
  if (!this.dueDate) return false;
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return this.dueDate <= tomorrow && this.dueDate > now && this.status !== 'done';
});

// Method to add activity log entry
taskSchema.methods.addActivity = function(action, userId, details = null) {
  this.activityLog.push({
    action,
    user: userId,
    details,
    timestamp: new Date()
  });
  return this.save();
};

// Method to add feedback
taskSchema.methods.addFeedback = function(userId, content, type = 'comment') {
  this.feedback.push({
    user: userId,
    content,
    type
  });
  return this.save();
};

// Pre-save middleware to update completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
  } else if (this.isModified('status') && this.status !== 'done') {
    this.completedAt = null;
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);