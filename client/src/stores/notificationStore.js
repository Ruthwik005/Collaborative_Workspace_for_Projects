import { create } from 'zustand'
import axios from 'axios'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,

  // Fetch notifications
  fetchNotifications: async (filters = {}) => {
    set({ isLoading: true })
    try {
      const params = new URLSearchParams(filters)
      const response = await axios.get(`/api/notifications?${params}`)
      set({ 
        notifications: response.data.notifications,
        isLoading: false 
      })
    } catch (error) {
      console.error('Error fetching notifications:', error)
      set({ isLoading: false })
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count')
      set({ unreadCount: response.data.count })
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`)
      
      // Update local state
      set(state => ({
        notifications: state.notifications.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await axios.put('/api/notifications/read-all')
      
      // Update local state
      set(state => ({
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true
        })),
        unreadCount: 0
      }))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`)
      
      // Update local state
      set(state => ({
        notifications: state.notifications.filter(
          notification => notification._id !== notificationId
        ),
        unreadCount: state.notifications.find(n => n._id === notificationId)?.read 
          ? state.unreadCount 
          : Math.max(0, state.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  },

  // Clear read notifications
  clearReadNotifications: async () => {
    try {
      await axios.delete('/api/notifications/clear-read')
      
      // Update local state
      set(state => ({
        notifications: state.notifications.filter(notification => !notification.read)
      }))
    } catch (error) {
      console.error('Error clearing read notifications:', error)
    }
  },

  // Add new notification (for real-time updates)
  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }))
  },

  // Update notification (for real-time updates)
  updateNotification: (notificationId, updates) => {
    set(state => ({
      notifications: state.notifications.map(notification =>
        notification._id === notificationId
          ? { ...notification, ...updates }
          : notification
      )
    }))
  },

  // Remove notification (for real-time updates)
  removeNotification: (notificationId) => {
    set(state => ({
      notifications: state.notifications.filter(
        notification => notification._id !== notificationId
      )
    }))
  },

  // Toggle notification center
  toggleNotificationCenter: () => {
    set(state => ({ isOpen: !state.isOpen }))
  },

  // Open notification center
  openNotificationCenter: () => {
    set({ isOpen: true })
  },

  // Close notification center
  closeNotificationCenter: () => {
    set({ isOpen: false })
  },

  // Get notification stats
  getNotificationStats: async () => {
    try {
      const response = await axios.get('/api/notifications/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching notification stats:', error)
      return null
    }
  },

  // Get notification types
  getNotificationTypes: async () => {
    try {
      const response = await axios.get('/api/notifications/types')
      return response.data.types
    } catch (error) {
      console.error('Error fetching notification types:', error)
      return []
    }
  }
}))

export default useNotificationStore