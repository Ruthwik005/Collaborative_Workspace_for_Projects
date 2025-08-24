import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from './ui/button'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  Bell,
  LogOut,
  User
} from 'lucide-react'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    // Listen for socket notifications
    if (window.socket) {
      const handleNotification = (data) => {
        setNotifications(prev => [
          { id: Date.now(), ...data, timestamp: new Date() },
          ...prev.slice(0, 9) // Keep only 10 most recent
        ])
      }

      window.socket.on('task-updated', handleNotification)
      window.socket.on('meeting-scheduled', handleNotification)
      window.socket.on('meeting-updated', handleNotification)
      window.socket.on('tasks-imported', handleNotification)

      return () => {
        window.socket?.off('task-updated', handleNotification)
        window.socket?.off('meeting-scheduled', handleNotification)
        window.socket?.off('meeting-updated', handleNotification)
        window.socket?.off('tasks-imported', handleNotification)
      }
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
      current: location.pathname === '/calendar'
    },
    {
      name: 'Meetings',
      href: '/meetings',
      icon: Users,
      current: location.pathname === '/meetings'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">SynergySphere</h1>
              </div>
              
              {/* Navigation links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        item.current
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>
                
                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b">
                      Notifications
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No new notifications
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="px-4 py-3 text-sm border-b last:border-b-0 hover:bg-gray-50">
                            <p className="text-gray-900">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="w-8 h-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.username}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile navigation */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1 bg-white border-b">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                <div className="flex items-center">
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout