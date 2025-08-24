import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from './ui/button'
import NotificationCenter from './NotificationCenter'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  User
} from 'lucide-react'

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

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
              {/* Notification Center */}
              <NotificationCenter />
              
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