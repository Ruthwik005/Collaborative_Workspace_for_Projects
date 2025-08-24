import mongoose from 'mongoose'

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

const progressUpdateSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['text', 'checklist', 'file', 'voice'], 
    default: 'text' 
  },
  content: { type: String, required: true },
  checklist: [checklistItemSchema],
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  voiceUrl: { type: String },
  voiceDuration: { type: Number }, // in seconds
  createdAt: { type: Date, default: Date.now }
})

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
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
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date, required: true },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  progressUpdates: [progressUpdateSchema],
  feedback: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  githubIssueId: String,
  googleDocUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Update the updatedAt field before saving
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Task', taskSchema)