# SynergySphere Project Structure

This document provides a comprehensive overview of the consolidated project structure.

## 📁 Root Directory Structure

```
synergy-sphere/
├── 📄 README.md                    # Comprehensive project documentation
├── 📄 SETUP.md                     # Quick setup guide
├── 📄 LICENSE                      # MIT license
├── 📄 package.json                 # Root package management with scripts
├── 📄 .gitignore                   # Comprehensive gitignore for both frontend and backend
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📁 frontend/                    # React frontend application
└── 📁 backend/                     # Node.js backend application
```

## 🎨 Frontend Structure (`/frontend/`)

```
frontend/
├── 📄 package.json                 # Frontend dependencies and scripts
├── 📄 package-lock.json           # Dependency lock file
├── 📄 vite.config.js              # Vite configuration
├── 📄 tailwind.config.js          # Tailwind CSS configuration
├── 📄 postcss.config.js           # PostCSS configuration
├── 📄 eslint.config.js            # ESLint configuration
├── 📄 vercel.json                 # Vercel deployment configuration
├── 📄 .env                        # Environment variables (create from .env.example)
├── 📄 .env.example                # Environment variables template
├── 📄 index.html                  # Main HTML template
├── 📁 public/                     # Static assets
├── 📁 src/                        # Source code
│   ├── 📄 main.jsx                # Application entry point with React Query
│   ├── 📄 App.jsx                 # Main App component with routing
│   ├── 📄 index.css               # Global styles with Tailwind imports
│   ├── 📁 components/             # Reusable components
│   │   ├── 📄 Layout.jsx          # Main layout with navigation
│   │   ├── 📄 TaskCard.jsx        # Individual task cards with drag & drop
│   │   ├── 📄 TaskColumn.jsx      # Kanban board columns
│   │   ├── 📄 TaskDialog.jsx      # Task details modal
│   │   ├── 📄 NewTaskDialog.jsx   # New task creation modal
│   │   └── 📁 ui/                 # Shadcn/UI components
│   │       ├── 📄 button.jsx      # Button component
│   │       ├── 📄 card.jsx        # Card components
│   │       ├── 📄 dialog.jsx      # Dialog components
│   │       └── 📄 input.jsx       # Input component
│   ├── 📁 pages/                  # Page components
│   │   ├── 📄 LoginPage.jsx       # User login page
│   │   ├── 📄 SignupPage.jsx      # User registration page
│   │   ├── 📄 Dashboard.jsx       # Main task board dashboard
│   │   ├── 📄 CalendarPage.jsx    # Calendar view of tasks
│   │   ├── 📄 MeetingsPage.jsx    # Meetings management
│   │   └── 📄 SettingsPage.jsx    # Settings and integrations
│   ├── 📁 store/                  # Zustand state management
│   │   └── 📄 authStore.js        # Authentication state
│   ├── 📁 services/               # API services
│   │   └── 📄 api.js              # API service layer with fetch
│   ├── 📁 lib/                    # Utility functions
│   │   └── 📄 utils.js            # Helper functions
│   └── 📁 hooks/                  # Custom React hooks (empty, ready for use)
└── 📁 node_modules/               # Frontend dependencies (ignored by git)
```

## ⚙️ Backend Structure (`/backend/`)

```
backend/
├── 📄 package.json                # Backend dependencies and scripts
├── 📄 package-lock.json          # Dependency lock file
├── 📄 railway.toml               # Railway deployment configuration
├── 📄 .env                       # Environment variables (create from .env.example)
├── 📄 .env.example               # Environment variables template
├── 📁 uploads/                   # File upload directory
│   └── 📄 .gitkeep               # Ensures directory is tracked
├── 📁 src/                       # Source code
│   ├── 📄 server.js              # Main server file with Express and Socket.IO
│   ├── 📁 middleware/            # Express middleware
│   │   ├── 📄 auth.js            # JWT authentication middleware
│   │   └── 📄 errorHandler.js    # Global error handling
│   ├── 📁 models/                # Mongoose database models
│   │   ├── 📄 User.js            # User model with integrations
│   │   ├── 📄 Task.js            # Task model with feedback system
│   │   └── 📄 Meeting.js         # Meeting model with attendees
│   ├── 📁 routes/                # API route handlers
│   │   ├── 📄 auth.js            # Authentication routes (signup/login)
│   │   ├── 📄 tasks.js           # Task CRUD operations with Socket.IO
│   │   ├── 📄 meetings.js        # Meeting management
│   │   ├── 📄 github.js          # GitHub integration (Phase 2)
│   │   └── 📄 google.js          # Google services integration (Phase 2)
│   ├── 📁 controllers/           # Route controllers (empty, ready for use)
│   ├── 📁 services/              # Business logic services (empty, ready for use)
│   └── 📁 utils/                 # Utility functions (empty, ready for use)
└── 📁 node_modules/              # Backend dependencies (ignored by git)
```

## 🚀 Key Features by Directory

### Frontend Features
- **Authentication**: JWT-based login/signup with Zustand state management
- **Real-time Task Board**: Drag & drop Kanban board with @dnd-kit
- **UI Components**: Shadcn/UI component library with Tailwind CSS
- **State Management**: Zustand for global state, React Query for server state
- **Real-time Updates**: Socket.IO client integration
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Backend Features
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time Communication**: Socket.IO server for live updates
- **Database**: MongoDB with Mongoose ODM
- **API Routes**: RESTful API with Express.js
- **Security**: Helmet, CORS, rate limiting middleware
- **Integrations**: GitHub and Google APIs ready for Phase 2
- **File Handling**: Multer for file uploads

## 🔧 Configuration Files

### Root Level
- `package.json`: Root package management with concurrency scripts
- `.gitignore`: Comprehensive ignore rules for both frontend and backend
- `LICENSE`: MIT license for open source distribution

### Frontend Config
- `vite.config.js`: Vite bundler configuration
- `tailwind.config.js`: Tailwind CSS with Shadcn/UI theme
- `postcss.config.js`: PostCSS for Tailwind processing
- `vercel.json`: Vercel deployment configuration

### Backend Config
- `railway.toml`: Railway deployment configuration
- `.env.example`: Environment variables template

## 📦 Dependencies Overview

### Frontend Dependencies
- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **@dnd-kit**: Modern drag and drop for React
- **@tanstack/react-query**: Server state management
- **zustand**: Lightweight state management
- **socket.io-client**: Real-time communication
- **react-router-dom**: Client-side routing
- **lucide-react**: Beautiful icons

### Backend Dependencies
- **express**: Web framework for Node.js
- **mongoose**: MongoDB object modeling
- **socket.io**: Real-time bidirectional communication
- **jsonwebtoken**: JWT implementation
- **bcryptjs**: Password hashing
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **multer**: File upload handling
- **octokit**: GitHub API client
- **googleapis**: Google APIs client
- **pdfkit**: PDF generation
- **node-cron**: Cron job scheduling

## 🌟 Phase Implementation Status

### ✅ Phase 1: Core MVP (Fully Implemented)
- User authentication and onboarding
- Real-time task board with drag & drop
- Task details and feedback system
- Calendar view structure
- Meetings page with simulated scheduling

### ✅ Phase 2: External Integrations (Backend Ready)
- GitHub integration with two-way sync
- Google Docs integration for task linking
- Google Calendar integration with auto-scheduling

### ✅ Phase 3: Automation & Enhancement (Backend Ready)
- Automated weekly timesheet generation
- Unified notification center with real-time updates
- Cron job scheduling system

## 🚦 Getting Started

1. **Clone and Setup**:
   ```bash
   git clone <your-repo>
   cd synergy-sphere
   npm install
   npm run install-all
   ```

2. **Environment Configuration**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit backend/.env with your MongoDB URI and JWT secret
   ```

3. **Start Development**:
   ```bash
   npm run dev
   ```

4. **Access Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔄 Git Workflow

The project is structured as a single repository with:
- Main branch containing all features from Phase 1, 2, and 3
- Clean separation between frontend and backend
- Comprehensive .gitignore for both environments
- Ready for deployment to Vercel (frontend) and Railway (backend)

This structure provides a solid foundation for a production-ready collaborative workspace application with room for future enhancements and scaling.