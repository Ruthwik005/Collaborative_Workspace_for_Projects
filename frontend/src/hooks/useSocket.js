import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

export const useSocket = () => {
  const { user, token } = useAuthStore()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002', {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      
      // Join user's personal room
      newSocket.emit('join-room', user._id)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setIsConnected(false)
      
      // Handle reconnection for unexpected disconnections
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            newSocket.connect()
          }, 1000 * Math.pow(2, reconnectAttemptsRef.current)) // Exponential backoff
        }
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      
      // Handle authentication errors
      if (error.message === 'Authentication error') {
        console.log('Authentication failed, clearing token')
        // You might want to redirect to login here
      }
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      
      // Rejoin user's room after reconnection
      if (user?._id) {
        newSocket.emit('join-room', user._id)
      }
    })

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber)
      reconnectAttemptsRef.current = attemptNumber
    })

    newSocket.on('reconnect_failed', () => {
      console.log('Socket reconnection failed after', maxReconnectAttempts, 'attempts')
      setIsConnected(false)
    })

    setSocket(newSocket)

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      newSocket.disconnect()
    }
  }, [user, token])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  // Utility functions
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit event:', event)
    }
  }

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback)
    }
  }

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback)
    }
  }

  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('join-project', roomId)
    }
  }

  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leave-project', roomId)
    }
  }

  return {
    socket,
    isConnected,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom
  }
}
