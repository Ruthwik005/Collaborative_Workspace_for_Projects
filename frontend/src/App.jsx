import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuthStore } from './store/authStore'

// Components
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import MeetingsPage from './pages/MeetingsPage'
import SettingsPage from './pages/SettingsPage'
import Layout from './components/Layout'

// Socket connection
let socket = null

function App() {
  const { isLoggedIn, user } = useAuthStore()

  useEffect(() => {
    // Initialize socket connection when user is logged in
    if (isLoggedIn() && user) {
      socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000')
      
      socket.on('connect', () => {
        console.log('Connected to server')
        socket.emit('join-room', user.id)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from server')
      })

      // Store socket in window for global access
      window.socket = socket

      return () => {
        if (socket) {
          socket.disconnect()
          window.socket = null
        }
      }
    }
  }, [isLoggedIn(), user])

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={!isLoggedIn() ? <LoginPage /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/signup" 
            element={!isLoggedIn() ? <SignupPage /> : <Navigate to="/dashboard" />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={isLoggedIn() ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to={isLoggedIn() ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
