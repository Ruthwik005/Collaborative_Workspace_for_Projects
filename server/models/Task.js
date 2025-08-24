import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: String,
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
    dueDate: Date,
    status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
    githubIssueId: Number,
    googleDocUrl: String,
    feedback: [feedbackSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);