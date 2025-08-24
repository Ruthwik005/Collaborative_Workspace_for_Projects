import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Trash2, Download, Github, Calendar, FileText, MessageSquare, AlertTriangle, Clock, Users } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [bellRing, setBellRing] = useState(false)
  const { user } = useAuthStore()
  const { socket, isConnected } = useSocket()

  // Notification type configurations
  const notificationTypes = {
    task: {
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    meeting: {
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    feedback: {
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    github: {
      icon: Github,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    reminder: {
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    alert: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  }

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/notifications')
      
      // Ensure response is an array
      const notifications = Array.isArray(response) ? response : []
      setNotifications(notifications)
      setUnreadCount(notifications.filter(n => !n.read).length)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Fallback to mock data for development
      const mockNotifications = [
        {
          id: '1',
          type: 'task',
          title: 'New Task Assigned',
          message: 'You have been assigned a new task: "Implement user authentication"',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/dashboard'
        },
        {
          id: '2',
          type: 'meeting',
          title: 'Meeting Scheduled',
          message: 'Team standup meeting scheduled for tomorrow at 9 AM',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          link: '/meetings'
        },
        {
          id: '3',
          type: 'feedback',
          title: 'New Feedback',
          message: 'John Doe left feedback on task "Update documentation"',
          read: true,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          link: '/dashboard'
        }
      ]
      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.read).length)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Fallback to local update - just update UI
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      // Fallback to local update - just update UI
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.read ? Math.max(0, prev - 1) : prev
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
      // Fallback to local update - just remove from UI
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.read ? Math.max(0, prev - 1) : prev
      })
    }
  }

  // Handle notification action (navigate to link)
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (notification.link) {
      window.location.href = notification.link
    }
    
    setIsOpen(false)
  }

  // Show toast notification
  const showToast = (notification) => {
    const IconComponent = notificationTypes[notification.type]?.icon || FileText
    
    // Trigger bell ring animation
    setBellRing(true)
    setTimeout(() => setBellRing(false), 500)
    
    toast(
      <div className="flex items-start gap-3">
        <IconComponent className={`w-5 h-5 mt-0.5 ${notificationTypes[notification.type]?.color}`} />
        <div>
          <div className="font-medium text-gray-900">{notification.title}</div>
          <div className="text-sm text-gray-600">{notification.message}</div>
        </div>
      </div>,
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        className: `${notificationTypes[notification.type]?.bgColor} border ${notificationTypes[notification.type]?.borderColor}`,
      }
    )
  }

  // Test notification function (for development)
  const testNotification = () => {
    const testNotification = {
      id: Date.now().toString(),
      type: 'task',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working!',
      read: false,
      createdAt: new Date().toISOString(),
      link: '/dashboard'
    }
    
    setNotifications(prev => [testNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    showToast(testNotification)
  }

  // Socket.IO event handlers
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for new notifications
      const handleNewNotification = (notification) => {
        console.log('New notification received:', notification)
        
        // Add to notifications list
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // Show toast notification
        showToast(notification)
      }

      // Listen for task updates
      const handleTaskUpdate = (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'task',
          title: 'Task Updated',
          message: data.message || 'A task has been updated',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/dashboard'
        }
        handleNewNotification(notification)
      }

      // Listen for meeting events
      const handleMeetingEvent = (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'meeting',
          title: 'Meeting Event',
          message: data.message || 'A meeting event occurred',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/meetings'
        }
        handleNewNotification(notification)
      }

      // Listen for feedback events
      const handleFeedbackEvent = (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'feedback',
          title: 'New Feedback',
          message: data.message || 'New feedback has been added',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/dashboard'
        }
        handleNewNotification(notification)
      }

      // Listen for GitHub events
      const handleGitHubEvent = (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'github',
          title: 'GitHub Update',
          message: data.message || 'GitHub repository has been updated',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/settings'
        }
        handleNewNotification(notification)
      }

      // Listen for reminder events
      const handleReminderEvent = (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'reminder',
          title: 'Reminder',
          message: data.message || 'You have a reminder',
          read: false,
          createdAt: new Date().toISOString(),
          link: data.link || '/dashboard'
        }
        handleNewNotification(notification)
      }

      // Listen for alert events
      const handleAlertEvent = (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'alert',
          title: 'Alert',
          message: data.message || 'Important alert',
          read: false,
          createdAt: new Date().toISOString(),
          link: data.link || '/dashboard'
        }
        handleNewNotification(notification)
      }

      // Attach event listeners
      socket.on('notification', handleNewNotification)
      socket.on('task-updated', handleTaskUpdate)
      socket.on('meeting-scheduled', handleMeetingEvent)
      socket.on('feedback-added', handleFeedbackEvent)
      socket.on('github-updated', handleGitHubEvent)
      socket.on('reminder', handleReminderEvent)
      socket.on('alert', handleAlertEvent)

      // Cleanup
      return () => {
        socket.off('notification', handleNewNotification)
        socket.off('task-updated', handleTaskUpdate)
        socket.off('meeting-scheduled', handleMeetingEvent)
        socket.off('feedback-added', handleFeedbackEvent)
        socket.off('github-updated', handleGitHubEvent)
        socket.off('reminder', handleReminderEvent)
        socket.off('alert', handleAlertEvent)
      }
    }
  }, [socket, isConnected])

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <div className="relative">
        {/* Notification Bell */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors ${bellRing ? 'bell-ring' : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                {/* Test button for development */}
                <button
                  onClick={testNotification}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border"
                  title="Test notification"
                >
                  Test
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const IconComponent = notificationTypes[notification.type]?.icon || FileText
                    const typeConfig = notificationTypes[notification.type] || notificationTypes.task
                    
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <IconComponent className={`w-5 h-5 mt-0.5 ${typeConfig.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </>
  )
}

export default NotificationCenter
