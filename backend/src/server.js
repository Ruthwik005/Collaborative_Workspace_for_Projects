import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { generateWeeklyTimesheet } from './utils/timesheetGenerator.js'
import { sendNotification } from './utils/notifications.js'

// Import routes
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import meetingRoutes from './routes/meetings.js'
import githubRoutes from './routes/github.js'
import googleRoutes from './routes/google.js'
import notificationRoutes from './routes/notifications.js'

// Import middleware
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const server = createServer(app)

// CORS configuration - allow multiple frontend URLs for development
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001", 
  "http://localhost:3002",
  "http://localhost:5173",
  "http://localhost:5174"
]

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
})

// Security middleware
app.use(helmet())
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Make io accessible to routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tasks', authenticateToken, taskRoutes)
app.use('/api/meetings', authenticateToken, meetingRoutes)
app.use('/api/github', authenticateToken, githubRoutes)
app.use('/api/google', authenticateToken, googleRoutes)
app.use('/api/notifications', authenticateToken, notificationRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use(errorHandler)

// Socket.IO connection handling with enhanced Phase 3 features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`)
    console.log(`User ${userId} joined their room`)
  })

  // Phase 3: Enhanced real-time features
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`)
    console.log(`User joined project room: ${projectId}`)
  })

  socket.on('start-typing', (data) => {
    socket.to(`task-${data.taskId}`).emit('user-typing', {
      userId: data.userId,
      username: data.username
    })
  })

  socket.on('stop-typing', (data) => {
    socket.to(`task-${data.taskId}`).emit('user-stopped-typing', {
      userId: data.userId
    })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Phase 3: Automated weekly timesheet generation (every Friday at 5 PM)
cron.schedule('0 17 * * 5', async () => {
  try {
    console.log('Generating weekly timesheet...')
    const timesheetData = await generateWeeklyTimesheet()
    
    if (timesheetData.success) {
      // Emit notification to all connected clients
      io.emit('weekly-timesheet-ready', {
        message: 'Weekly timesheet is ready for download',
        downloadUrl: timesheetData.downloadUrl,
        period: timesheetData.period
      })
      
      // Send email notifications (if configured)
      await sendNotification('weekly-timesheet', timesheetData)
      
      console.log('Weekly timesheet generated successfully')
    }
  } catch (error) {
    console.error('Weekly timesheet generation failed:', error)
  }
}, {
  timezone: 'UTC'
})

// Phase 3: Daily task reminders (every day at 9 AM)
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Sending daily task reminders...')
    // This will be implemented in the notification service
    await sendNotification('daily-reminders')
    console.log('Daily reminders sent successfully')
  } catch (error) {
    console.error('Daily reminders failed:', error)
  }
}, {
  timezone: 'UTC'
})

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synergy-sphere')
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  })

const PORT = process.env.PORT || 5002

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
  console.log('Phase 3 features: Weekly timesheets and daily reminders scheduled')
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`)
})

export { io }