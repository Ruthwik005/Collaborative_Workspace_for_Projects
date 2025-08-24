import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/CalendarPage'
import MeetingsPage from './pages/MeetingsPage'
import SettingsPage from './pages/SettingsPage'
import { useAuthStore } from './store/authStore'
import './App.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuthStore()
  
  console.log('ProtectedRoute - isLoggedIn:', isLoggedIn)
  
  if (!isLoggedIn) {
    console.log('User not logged in, redirecting to login')
    return <Navigate to="/login" replace />
  }
  
  console.log('User is logged in, rendering protected content')
  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Protected routes with Layout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ToastContainer position="top-right" />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
