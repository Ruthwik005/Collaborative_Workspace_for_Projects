import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    date: Date,
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    googleEventId: String,
    googleMeetUrl: String,
  },
  { timestamps: true }
);

export default mongoose.model('Meeting', meetingSchema);