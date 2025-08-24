SynergySphere - Collaborative Workspace Application

A fully functional, production-ready collaborative workspace web application built with React and Node.js.
SynergySphere serves as a central hub for task management, team communication, and project collaboration, featuring deep real-time integrations with GitHub and Google ecosystem tools.

🚀 Features
Phase 1: Core MVP (✅ Implemented)

User Authentication & Onboarding: Secure JWT-based authentication with signup/login

Real-Time Task Board: Kanban-style board with drag & drop functionality and real-time updates via Socket.IO

Task Details & Feedback Collaboration: Detailed task views with commenting system, activity feeds, and collaborative feedback

Calendar View: Temporal view of all tasks based on their deadlines (React Big Calendar)

Meetings Page: Centralized meeting management with simulated auto-scheduling

Phase 2: External Tool Integrations (🔄 Ready for Configuration)

GitHub Integration: Two-way sync between GitHub issues and tasks with OAuth

Google Docs Integration: Link Docs to tasks for collaborative documentation

Google Calendar Integration: True auto-scheduling with Google Calendar API

Phase 3: Enhancements & Automation (🔄 Backend Ready)

Automated Weekly Timesheets: PDF reports auto-generated with progress summaries

Unified Notification Center: Real-time hub for app + integration activities

🛠 Technology Stack
Frontend

React 18 with JavaScript

Vite for builds

Tailwind CSS

Shadcn/UI component library (modern + accessible)

Zustand for global state

React Query (TanStack Query) for server state & caching

Socket.IO Client for real-time updates

Drag & Drop: React Beautiful DnD / dnd-kit (React 19 compatible)

React Big Calendar for deadlines

React Hook Form + Zod for validation

React Hot Toast for notifications

Backend

Node.js + Express.js

MongoDB + Mongoose

Socket.IO for real-time events

JWT + bcryptjs for authentication

Multer for file handling

Octokit for GitHub API

Google APIs for Calendar & Docs

PDFKit for reports

node-cron for scheduled jobs

Express Rate Limit + Helmet for security

📁 Project Structure
synergy-sphere/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # UI components (Shadcn/UI, Layout, TaskCard, TaskColumn)
│   │   ├── pages/           # LoginPage, SignupPage, Dashboard, CalendarPage, MeetingsPage, SettingsPage
│   │   ├── store/           # Zustand state (authStore, taskStore)
│   │   ├── services/        # API service layer
│   │   ├── lib/             # Utilities
│   │   └── hooks/           # Custom hooks
│   ├── public/
│   └── package.json
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # JWT auth, error handling
│   │   ├── models/         # User, Task, Meeting schemas
│   │   ├── routes/         # auth.js, tasks.js, meetings.js, github.js, google.js
│   │   ├── services/       # Core backend services
│   │   ├── utils/          # Helpers
│   │   └── server.js
│   ├── uploads/            # File uploads
│   └── package.json
└── README.md

🚦 Getting Started
Prerequisites

Node.js 18+

MongoDB (local or Atlas)

GitHub OAuth App credentials

Google OAuth 2.0 credentials
Installation

Clone the repository

git clone <repository-url>
cd synergy-sphere


Install dependencies

cd backend && npm install
cd ../frontend && npm install --legacy-peer-deps


Setup Environment Variables

Backend .env:

PORT=5000
MONGODB_URI=mongodb://localhost:27017/synergy-sphere
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

FRONTEND_URL=http://localhost:3000


Frontend .env:

VITE_API_URL=http://localhost:5000/api


Run the app

# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev


Frontend → http://localhost:3000

Backend API → http://localhost:5000

🔄 Real-Time Features

Task Updates → Live Kanban updates across clients

Feedback & Comments → Real-time collaboration

Meetings → Instant scheduling updates

GitHub Sync → Live notifications on issue imports

Reports → Weekly auto-generated PDFs with team summaries

🎨 UI/UX Highlights

Drag & Drop Kanban Board

Priority Indicators & Due Date Warnings

Real-Time Notifications & Badge Updates

Integration Badges for GitHub/Google Docs

Responsive & Accessible (WCAG-compliant via Shadcn/UI)

🔐 Security

JWT Auth

Bcrypt password hashing

Rate limiting + Helmet.js

Input validation with express-validator

Secure environment variables

🚀 Deployment

Frontend → Vercel (build: npm run build, output: dist)

Backend → Railway/Render

Database → MongoDB Atlas

🤝 Contributing

Fork repo

Create branch → git checkout -b feature/amazing-feature

Commit → git commit -m "Add amazing feature"

Push → git push origin feature/amazing-feature

Open PR

📝 License

MIT License - see LICENSE file.

🙏 Acknowledgments

Shadcn/UI

TailwindCSS

Socket.IO

React Query

dnd-kit

✨ SynergySphere — Where collaboration meets productivity! 🚀