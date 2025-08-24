import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import githubRoutes from './routes/github.js';
import meetingRoutes from './routes/meetings.js';
import { initCronJobs } from './services/cronJobs.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // adjust in production
  },
});

app.set('io', io); // make io available in routes via req.app.get('io')

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/meetings', meetingRoutes);

// Health Check
app.get('/', (_req, res) => res.send('SynergySphere API running'));

// Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo connection error', err));

// Start Cron Jobs
initCronJobs(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));