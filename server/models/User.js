import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarUrl: String,
    github: {
      accessToken: String,
      repo: String, // e.g., owner/repo
    },
    google: {
      accessToken: String,
      refreshToken: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);