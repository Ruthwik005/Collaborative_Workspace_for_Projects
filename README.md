# SynergySphere - Collaborative Workspace Application

A fully functional, production-ready collaborative workspace web application that serves as a central hub for task management, team communication, and project collaboration, featuring deep, real-time integrations with GitHub and Google ecosystem tools.

## 🚀 Features

### Phase 1: Core MVP
- **User Authentication & Onboarding**: Secure JWT-based authentication with user registration and login
- **Real-Time Task Board**: Kanban-style board with drag-and-drop functionality and real-time updates via Socket.IO
- **Task Details & Feedback Collaboration**: Detailed task views with activity feeds and collaborative feedback
- **Calendar View**: Temporal view of all tasks based on their deadlines using react-big-calendar
- **Meetings Page**: Centralized meeting management with simulated auto-scheduling

### Phase 2: External Tool Integrations
- **GitHub Integration**: Two-way sync between GitHub issues and tasks with OAuth authentication
- **Google Docs Integration**: Seamless linking of Google Docs to tasks for collaborative documentation
- **Google Calendar Integration**: True auto-scheduling with Google Calendar API integration

### Phase 3: Enhancements & Automation
- **Automated Weekly Timesheets**: PDF reports generated automatically every Friday with comprehensive progress summaries
- **Unified Notification Center**: Single hub for all activity across the app and its integrations

## 🛠 Technology Stack

### Frontend
- **React 18** with JavaScript
- **Vite** for fast development and builds
- **Tailwind CSS** for utility-first styling
- **Shadcn/UI** component library for professional, accessible components
- **Zustand** for global state management
- **React Query (TanStack Query)** for server state management
- **Socket.IO Client** for real-time communication
- **React Beautiful DnD** for drag-and-drop functionality
- **React Big Calendar** for calendar views
- **React Hook Form** with Zod validation
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose for data modeling
- **Socket.IO** for real-time, bi-directional communication
- **JWT** for secure authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Octokit** for GitHub API interactions
- **Google APIs Node.js Client** for Google Calendar and Docs integration
- **PDFKit** for PDF report generation
- **Node-cron** for scheduled tasks
- **Express Rate Limit** and **Helmet** for security

## 📁 Project Structure

```
synergysphere/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   ├── lib/           # Utility functions
│   │   └── main.jsx       # Application entry point
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend Node.js application
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   ├── index.js           # Server entry point
│   └── package.json
├── package.json           # Root package.json (monorepo)
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- GitHub OAuth App credentials
- Google OAuth 2.0 credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd synergysphere
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Create `.env` file in the `server/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/synergysphere
   JWT_SECRET=your-super-secret-jwt-key
   
   # GitHub OAuth
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   WEBHOOK_SECRET=your-github-webhook-secret
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
   
   # File Upload
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=5242880
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend development server (port 5173).

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/feedback` - Add feedback to task

### Meetings
- `GET /api/meetings` - Get all meetings
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `POST /api/meetings/schedule-standup` - Schedule team standup

### GitHub Integration
- `GET /api/github/auth` - Initiate GitHub OAuth
- `GET /api/github/callback` - GitHub OAuth callback
- `GET /api/github/repos` - Get user repositories
- `POST /api/github/connect-repo` - Connect repository
- `POST /api/github/import-issues` - Import GitHub issues
- `POST /api/github/webhook` - GitHub webhook handler
- `GET /api/github/status` - Get integration status

### Google Integration
- `GET /api/google/auth` - Initiate Google OAuth
- `GET /api/google/callback` - Google OAuth callback
- `GET /api/google/calendar-events` - Get calendar events
- `POST /api/google/create-doc` - Create Google Doc
- `GET /api/google/docs` - Get user's Google Docs
- `GET /api/google/status` - Get integration status

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification
- `DELETE /api/notifications/clear-read` - Clear read notifications

### Reports
- `GET /api/reports` - Get all reports
- `POST /api/reports/generate` - Generate new report
- `GET /api/reports/:id/download` - Download report PDF
- `DELETE /api/reports/:id` - Delete report

## 🔄 Real-Time Features

The application uses Socket.IO for real-time communication:

- **Task Updates**: Real-time task status changes across all connected clients
- **Meeting Notifications**: Instant meeting reminders and updates
- **GitHub Sync**: Live notifications when GitHub issues are synced
- **Weekly Reports**: Real-time notifications when reports are generated
- **Typing Indicators**: Show when users are typing in collaborative areas

## 📊 Automated Features

### Weekly Reports
- Automatically generated every Friday at 5:00 PM
- Include completed tasks, team activity, and feedback summaries
- Generated as professional PDF documents
- Sent via real-time notifications to all users

### Meeting Reminders
- Automatic reminders sent 15 minutes before meetings
- Integration with Google Calendar for attendance tracking

### Task Monitoring
- Automatic detection of overdue tasks
- Real-time notifications for task status changes

## 🔐 Security Features

- JWT-based authentication with secure token storage
- Password hashing with bcryptjs
- Rate limiting on API endpoints
- Helmet.js for security headers
- Input validation with express-validator
- CORS configuration for cross-origin requests

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `client/dist`
4. Configure environment variables

### Backend (Railway/Render)
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables
5. Set up MongoDB Atlas connection

### Database (MongoDB Atlas)
1. Create a MongoDB Atlas cluster
2. Configure network access
3. Create database user
4. Get connection string and add to environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@synergysphere.com or create an issue in the GitHub repository.

---

**SynergySphere** - Where collaboration meets productivity! 🚀