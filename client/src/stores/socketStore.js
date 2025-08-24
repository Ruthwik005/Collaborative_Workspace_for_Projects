import { create } from 'zustand'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,

  // Connect to Socket.IO
  connectSocket: (token, userId) => {
    const { socket } = get()
    
    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect()
    }

    // Create new socket connection
    const newSocket = io('http://localhost:5000', {
      auth: {
        token
      }
    })

    newSocket.on('connect', () => {
      set({ socket: newSocket, isConnected: true })
      console.log('Connected to Socket.IO')
      
      // Join user room
      newSocket.emit('join-user', userId)
    })

    newSocket.on('disconnect', () => {
      set({ isConnected: false })
      console.log('Disconnected from Socket.IO')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      set({ isConnected: false })
    })

    // Listen for task updates
    newSocket.on('task-created', (task) => {
      toast.success(`New task created: ${task.title}`)
    })

    newSocket.on('task-updated', (task) => {
      toast.success(`Task updated: ${task.title}`)
    })

    newSocket.on('task-deleted', (data) => {
      toast.success('Task deleted')
    })

    newSocket.on('task-moved', (data) => {
      toast.success(`${data.movedBy.username} moved "${data.taskTitle}" to ${data.toStatus}`)
    })

    // Listen for meeting updates
    newSocket.on('meeting-created', (meeting) => {
      toast.success(`New meeting scheduled: ${meeting.title}`)
    })

    newSocket.on('meeting-updated', (meeting) => {
      toast.success(`Meeting updated: ${meeting.title}`)
    })

    newSocket.on('meeting-deleted', (data) => {
      toast.success('Meeting deleted')
    })

    // Listen for GitHub sync notifications
    newSocket.on('github-sync', (data) => {
      toast.success(`GitHub sync: ${data.action}`)
    })

    // Listen for weekly report notifications
    newSocket.on('weekly-report-ready', (data) => {
      toast.success('Weekly report is ready for download!', {
        duration: 6000,
        action: {
          label: 'Download',
          onClick: () => {
            window.open(data.downloadUrl, '_blank')
          }
        }
      })
    })

    // Listen for meeting reminders
    newSocket.on('meeting-reminder', (data) => {
      toast.success(`Meeting reminder: ${data.title} starts in 15 minutes`, {
        duration: 10000
      })
    })

    // Listen for global notifications
    newSocket.on('global-notification', (notification) => {
      toast.success(notification.message)
    })

    // Listen for user status updates
    newSocket.on('user-status-updated', (data) => {
      console.log('User status updated:', data)
    })

    // Listen for typing indicators
    newSocket.on('user-typing', (data) => {
      console.log(`${data.username} is typing...`)
    })

    newSocket.on('user-stopped-typing', (data) => {
      console.log('User stopped typing')
    })
  },

  // Disconnect from Socket.IO
  disconnectSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  // Emit task update
  emitTaskUpdate: (data) => {
    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('task-update', data)
    }
  },

  // Emit meeting update
  emitMeetingUpdate: (data) => {
    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('meeting-update', data)
    }
  },

  // Emit notification update
  emitNotificationUpdate: (data) => {
    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('notification-update', data)
    }
  },

  // Join team room
  joinTeamRoom: (teamId) => {
    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('join-team', teamId)
    }
  },

  // Emit typing indicator
  emitTypingStart: (taskId, username) => {
    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('typing-start', { taskId, username })
    }
  },

  emitTypingStop: (taskId) => {
    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('typing-stop', { taskId })
    }
  }
}))

export default useSocketStore