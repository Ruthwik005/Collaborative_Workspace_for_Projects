import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import toast from 'react-hot-toast'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      // Login user
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await axios.post('/api/auth/login', {
            email,
            password
          })

          const { token, user } = response.data

          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({ user, token, isLoading: false })
          toast.success('Login successful!')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.error || 'Login failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Signup user
      signup: async (username, email, password) => {
        set({ isLoading: true })
        try {
          const response = await axios.post('/api/auth/signup', {
            username,
            email,
            password
          })

          const { token, user } = response.data

          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({ user, token, isLoading: false })
          toast.success('Account created successfully!')
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.error || 'Signup failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Logout user
      logout: () => {
        // Remove auth header
        delete axios.defaults.headers.common['Authorization']
        
        set({ user: null, token: null })
        toast.success('Logged out successfully')
      },

      // Check authentication status
      checkAuth: async () => {
        const { token } = get()
        if (!token) return

        try {
          // Set auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          const response = await axios.get('/api/auth/me')
          set({ user: response.data.user })
        } catch (error) {
          // Token is invalid, clear auth state
          delete axios.defaults.headers.common['Authorization']
          set({ user: null, token: null })
        }
      },

      // Update user profile
      updateProfile: async (updates) => {
        try {
          const response = await axios.put('/api/auth/profile', updates)
          set({ user: response.data.user })
          toast.success('Profile updated successfully!')
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.error || 'Profile update failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        try {
          await axios.post('/api/auth/change-password', {
            currentPassword,
            newPassword
          })
          toast.success('Password changed successfully!')
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.error || 'Password change failed'
          toast.error(message)
          return { success: false, error: message }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
)

export default useAuthStore