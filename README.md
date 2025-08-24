# SynergySphere - Collaborative Workspace Application

A fully functional, production-ready collaborative workspace web application built with React and Node.js.
SynergySphere serves as a central hub for task management, team communication, and project collaboration, featuring deep real-time integrations with GitHub and Google ecosystem tools.

## 🚀 Features

### ✅ Phase 1: Core MVP (Fully Implemented)
- **User Authentication & Onboarding**: Secure JWT-based authentication with signup/login
- **Real-Time Task Board**: Kanban-style board with drag & drop functionality and real-time updates via Socket.IO
- **Task Details & Feedback Collaboration**: Detailed task views with commenting system, activity feeds, and collaborative feedback
- **Calendar View**: Temporal view of all tasks based on their deadlines (React Big Calendar)
- **Meetings Page**: Centralized meeting management with simulated auto-scheduling

### ✅ Phase 2: External Tool Integrations (Fully Implemented)
- **GitHub Integration**: Two-way sync between GitHub issues and tasks with OAuth
  - Import GitHub issues as tasks
  - Real-time webhook synchronization
  - Repository management and statistics
  - Priority mapping from GitHub labels
- **Google Docs Integration**: Link Google Docs to tasks for collaborative documentation
  - Validate Google Docs URLs
  - Store document links in task metadata
  - Real-time updates when documents are linked
- **Google Calendar Integration**: True auto-scheduling with Google Calendar API
  - OAuth authentication
  - Availability checking for team members
  - Auto-schedule meetings with optimal time slots
  - Google Meet integration

### ✅ Phase 3: Enhancements & Automation (Fully Implemented)
- **Automated Weekly Timesheets**: PDF reports auto-generated with progress summaries
  - Cron job scheduling (every Friday at 5 PM)
  - Comprehensive task and time tracking
  - User breakdown and efficiency metrics
  - Downloadable PDF format
- **Unified Notification Center**: Real-time hub for app + integration activities
  - Real-time notifications via Socket.IO
  - Notification preferences management
  - Mark as read functionality
  - Integration-specific notification types
- **Enhanced Real-Time Features**: Typing indicators, project rooms, and enhanced collaboration
- **Daily Task Reminders**: Automated reminders for upcoming deadlines

## 🛠 Technology Stack

### Frontend
- React 18 with JavaScript
- Vite for builds
- Tailwind CSS
- Shadcn/UI component library (modern + accessible)
- Zustand for global state
- React Query (TanStack Query) for server state & caching
- Socket.IO Client for real-time updates
- Drag & Drop: @dnd-kit (React 19 compatible)
- React Big Calendar for deadlines
- React Hook Form + Zod for validation

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.IO for real-time events
- JWT + bcryptjs for authentication
- Multer for file handling
- Octokit for GitHub API
- Google APIs for Calendar & Docs
- PDFKit for reports
- node-cron for scheduled jobs
- Express Rate Limit + Helmet for security

## 📁 Project Structure
```
synergy-sphere/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # UI components (Shadcn/UI, Layout, TaskCard, TaskColumn, NotificationCenter)
│   │   ├── pages/           # LoginPage, SignupPage, Dashboard, CalendarPage, MeetingsPage, SettingsPage
│   │   ├── store/           # Zustand state (authStore, taskStore)
│   │   ├── services/        # API service layer
│   │   ├── lib/             # Utilities
│   │   └── hooks/           # Custom hooks (useSocket)
│   ├── public/
│   └── package.json
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── middleware/      # JWT auth, error handling
│   │   ├── models/          # User, Task, Meeting schemas
│   │   ├── routes/          # auth.js, tasks.js, meetings.js, github.js, google.js, notifications.js
│   │   ├── utils/           # timesheetGenerator.js, notifications.js
│   │   └── server.js
│   ├── uploads/             # File uploads and generated timesheets
│   └── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- GitHub OAuth App credentials
- Google OAuth 2.0 credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd synergy-sphere
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Setup Environment Variables**

   **Backend .env:**
   ```env
   PORT=5002
   MONGODB_URI=mongodb://localhost:27017/synergy-sphere
   JWT_SECRET=your-secret
   JWT_EXPIRES_IN=7d
   
   # GitHub OAuth
   GITHUB_CLIENT_ID=xxx
   GITHUB_CLIENT_SECRET=xxx
   GITHUB_WEBHOOK_SECRET=xxx
   
   # Google OAuth
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend .env:**
   ```env
   VITE_API_URL=http://localhost:5002/api
   VITE_BACKEND_URL=http://localhost:5002
   ```

4. **Run the app**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or run separately:
   # Terminal 1: npm run dev-backend
   # Terminal 2: npm run dev-frontend
   ```

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5002

## 🔄 Real-Time Features

- **Task Updates** → Live Kanban updates across clients
- **Feedback & Comments** → Real-time collaboration
- **Meetings** → Instant scheduling updates
- **GitHub Sync** → Live notifications on issue imports
- **Reports** → Weekly auto-generated PDFs with team summaries
- **Notifications** → Real-time notification center with badges

## 🎨 UI/UX Highlights

- Drag & Drop Kanban Board
- Priority Indicators & Due Date Warnings
- Real-Time Notifications & Badge Updates
- Integration Badges for GitHub/Google Docs
- Responsive & Accessible (WCAG-compliant via Shadcn/UI)
- Modern notification center with real-time updates

## 🔐 Security

- JWT Auth with secure token handling
- Bcrypt password hashing (12 salt rounds)
- Rate limiting + Helmet.js security headers
- Input validation and sanitization
- Secure environment variables
- CORS configuration

## 🚀 Deployment

- **Frontend** → Vercel (build: `npm run build`, output: `dist`)
- **Backend** → Railway/Render
- **Database** → MongoDB Atlas

## 🔧 Advanced Features

### GitHub Integration Setup
1. Create GitHub OAuth App
2. Set callback URL
3. Configure webhook for repository
4. Add credentials to `.env`

### Google Integration Setup
1. Create Google Cloud Console project
2. Enable Calendar and Docs APIs
3. Configure OAuth consent screen
4. Add credentials to `.env`

### Automated Timesheets
- Generated every Friday at 5 PM UTC
- Includes task completion data, time tracking, and feedback
- PDF format with user breakdowns
- Downloadable via notification center

## 🤝 Contributing

1. Fork repo
2. Create branch → `git checkout -b feature/amazing-feature`
3. Commit → `git commit -m "Add amazing feature"`
4. Push → `git push origin feature/amazing-feature`
5. Open PR

## 📝 License

MIT License - see LICENSE file.

## 🙏 Acknowledgments

- Shadcn/UI
- TailwindCSS
- Socket.IO
- React Query
- @dnd-kit

---

## ✨ SynergySphere — Where collaboration meets productivity! 🚀

**Status: All 3 Phases Complete & Production Ready!** 🎉

Your collaborative workspace application is now fully implemented with:
- ✅ Core task management and real-time collaboration
- ✅ GitHub and Google ecosystem integrations
- ✅ Automated reporting and notification systems
- ✅ Production-ready security and performance optimizations

Ready to launch and scale! 🚀