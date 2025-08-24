# Quick Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## One-Command Setup

1. **Install all dependencies**:
   ```bash
   npm install
   npm run install-all
   ```

2. **Environment Setup**:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend/.env.example` to `frontend/.env` (optional, has defaults)
   - Update MongoDB URI and JWT secret in `backend/.env`

3. **Start Development**:
   ```bash
   npm run dev
   ```
   This starts both backend (port 5002) and frontend (port 3000) concurrently.

## Individual Commands

### Backend Only
```bash
cd backend
npm install
npm run dev
```

### Frontend Only
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## Production Build
```bash
npm run build
npm start
```

## First Time Setup
1. Start the application
2. Go to http://localhost:3000
3. Click "Sign up" to create your first account
4. Start creating tasks and testing the real-time features!

## Project Structure
```
synergy-sphere/
├── frontend/          # React frontend
├── backend/           # Node.js backend
├── README.md          # Detailed documentation
├── SETUP.md           # This quick setup guide
└── package.json       # Root package management
```

For detailed documentation, see [README.md](./README.md).