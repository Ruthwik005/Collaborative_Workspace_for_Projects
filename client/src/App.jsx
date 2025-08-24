import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSocketStore } from './stores/socketStore'
import { useNotificationStore } from './stores/notificationStore'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Meetings from './pages/Meetings'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import NotificationCenter from './components/NotificationCenter'

function App() {
  const { user, token, checkAuth } = useAuthStore()
  const { connectSocket, disconnectSocket } = useSocketStore()
  const { fetchUnreadCount } = useNotificationStore()

  useEffect(() => {
    // Check authentication status on app load
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (token && user) {
      // Connect to Socket.IO
      connectSocket(token, user._id)
      
      // Fetch initial notification count
      fetchUnreadCount()
    } else {
      // Disconnect Socket.IO if not authenticated
      disconnectSocket()
    }
  }, [token, user, connectSocket, disconnectSocket, fetchUnreadCount])

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!token ? <Signup /> : <Navigate to="/dashboard" />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
      
      {/* Global notification center */}
      {token && <NotificationCenter />}
    </div>
  )
}

export default App