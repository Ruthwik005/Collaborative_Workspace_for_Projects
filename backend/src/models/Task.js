import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

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
    enum: ['todo', 'inprogress', 'done'],
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
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  // GitHub integration
  githubIssueId: {
    type: String,
    default: null
  },
  githubIssueNumber: {
    type: Number,
    default: null
  },
  githubUrl: {
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
  // Activity and feedback
  feedback: [feedbackSchema],
  // Tracking
  completedAt: {
    type: Date,
    default: null
  },
  estimatedHours: {
    type: Number,
    min: 0,
    default: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
})

// Index for efficient queries
taskSchema.index({ assignee: 1, status: 1 })
taskSchema.index({ dueDate: 1 })
taskSchema.index({ githubIssueId: 1 })

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status !== 'done'
})

// Update completedAt when status changes to done
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date()
    } else if (this.status !== 'done') {
      this.completedAt = null
    }
  }
  next()
})

const Task = mongoose.model('Task', taskSchema)

export default Task