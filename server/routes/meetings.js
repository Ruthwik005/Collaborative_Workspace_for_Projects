import express from 'express';
import Meeting from '../models/Meeting.js';
import { authMiddleware } from '../utils/authMiddleware.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// list meetings
router.get('/', authMiddleware, async (_req, res) => {
  const meetings = await Meeting.find().populate('attendees', 'username email');
  res.json(meetings);
});

// create meeting (simulated)
router.post('/', authMiddleware, async (req, res) => {
  const users = req.body.attendees; // array of userIds
  const meeting = await Meeting.create({ ...req.body, attendees: users });
  await Notification.create({ message: `New meeting scheduled: ${meeting.title}`, link: '' });
  res.status(201).json(meeting);
});

export default router;