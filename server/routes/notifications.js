import express from 'express';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../utils/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, async (_req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 });
  res.json(notifications);
});

export default router;