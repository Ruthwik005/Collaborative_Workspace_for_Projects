import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    message: String,
    link: String,
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);