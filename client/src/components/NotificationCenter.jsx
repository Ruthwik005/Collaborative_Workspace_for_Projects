import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Check, Trash2, Bell, Settings } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { cn } from '../lib/utils'
import useNotificationStore from '../stores/notificationStore'

const NotificationCenter = () => {
  const { isOpen, closeNotificationCenter, fetchNotifications, markAsRead, deleteNotification, clearReadNotifications } = useNotificationStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? { read: filter === 'read' ? 'true' : 'false' } : {}
      const response = await axios.get('/api/notifications', { params })
      return response.data
    },
    enabled: isOpen
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await axios.put(`/api/notifications/${notificationId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['notifications', 'unread-count'])
    }
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await axios.delete(`/api/notifications/${notificationId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      queryClient.invalidateQueries(['notifications', 'unread-count'])
    }
  })

  // Clear read notifications mutation
  const clearReadMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/api/notifications/clear-read')
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      toast.success('Read notifications cleared')
    }
  })

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId)
  }

  const handleDelete = (notificationId) => {
    deleteNotificationMutation.mutate(notificationId)
  }

  const handleClearRead = () => {
    clearReadMutation.mutate()
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task-assigned':
      case 'task-updated':
      case 'task-completed':
        return '📋'
      case 'meeting-invite':
      case 'meeting-reminder':
        return '📅'
      case 'github-issue-synced':
        return '🐙'
      case 'weekly-report-ready':
        return '📊'
      case 'feedback-received':
        return '💬'
      case 'system-alert':
        return '🔔'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'task-assigned':
      case 'task-updated':
      case 'task-completed':
        return 'bg-blue-100 text-blue-800'
      case 'meeting-invite':
      case 'meeting-reminder':
        return 'bg-purple-100 text-purple-800'
      case 'github-issue-synced':
        return 'bg-gray-100 text-gray-800'
      case 'weekly-report-ready':
        return 'bg-green-100 text-green-800'
      case 'feedback-received':
        return 'bg-yellow-100 text-yellow-800'
      case 'system-alert':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearRead}
              disabled={clearReadMutation.isPending}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={closeNotificationCenter}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-2 border-b bg-gray-50">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            Read
          </Button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="spinner"></div>
            </div>
          ) : notificationsData?.notifications?.length > 0 ? (
            <div className="divide-y">
              {notificationsData.notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    "p-4 hover:bg-gray-50 transition-colors",
                    !notification.read && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </h4>
                          <p className="text-gray-600 text-sm mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getNotificationColor(notification.type)}>
                              {notification.type.replace('-', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMarkAsRead(notification._id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(notification._id)}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {notification.actionText || 'View Details'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationCenter