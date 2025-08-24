const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = localStorage.getItem('auth-storage') 
      ? JSON.parse(localStorage.getItem('auth-storage')).state?.token 
      : null

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      
      return response
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Auth methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    })
  }

  async signup(userData) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: userData,
    })
  }

  // Task methods
  async getTasks() {
    return this.request('/tasks')
  }

  async createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: taskData,
    })
  }

  async updateTask(taskId, taskData) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: taskData,
    })
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  async addTaskFeedback(taskId, feedback) {
    return this.request(`/tasks/${taskId}/feedback`, {
      method: 'POST',
      body: { content: feedback },
    })
  }

  // Meeting methods
  async getMeetings() {
    return this.request('/meetings')
  }

  async createMeeting(meetingData) {
    return this.request('/meetings', {
      method: 'POST',
      body: meetingData,
    })
  }

  // GitHub integration
  async connectGitHub(code) {
    return this.request('/github/connect', {
      method: 'POST',
      body: { code },
    })
  }

  async importGitHubIssues() {
    return this.request('/github/import', {
      method: 'POST',
    })
  }

  // Google integration
  async connectGoogle(code) {
    return this.request('/google/connect', {
      method: 'POST',
      body: { code },
    })
  }

  async scheduleGoogleMeeting(meetingData) {
    return this.request('/google/schedule-meeting', {
      method: 'POST',
      body: meetingData,
    })
  }
}

export const apiService = new ApiService()
export default apiService