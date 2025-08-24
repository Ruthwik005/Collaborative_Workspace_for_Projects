const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
    
    // Bind all methods to ensure 'this' context is preserved
    this.request = this.request.bind(this)
    this.login = this.login.bind(this)
    this.signup = this.signup.bind(this)
    this.getTasks = this.getTasks.bind(this)
    this.createTask = this.createTask.bind(this)
    this.updateTask = this.updateTask.bind(this)
    this.deleteTask = this.deleteTask.bind(this)
    this.addTaskFeedback = this.addTaskFeedback.bind(this)
    this.getMeetings = this.getMeetings.bind(this)
    this.createMeeting = this.createMeeting.bind(this)
    this.connectGitHub = this.connectGitHub.bind(this)
    this.importGitHubIssues = this.importGitHubIssues.bind(this)
    this.setGitHubRepo = this.setGitHubRepo.bind(this)
    this.getGitHubStatus = this.getGitHubStatus.bind(this)
    this.disconnectGitHub = this.disconnectGitHub.bind(this)
    this.connectGoogle = this.connectGoogle.bind(this)
    this.scheduleGoogleMeeting = this.scheduleGoogleMeeting.bind(this)
    this.getGoogleStatus = this.getGoogleStatus.bind(this)
    this.disconnectGoogle = this.disconnectGoogle.bind(this)
    this.getNotifications = this.getNotifications.bind(this)
    this.markNotificationAsRead = this.markNotificationAsRead.bind(this)
    this.markAllNotificationsAsRead = this.markAllNotificationsAsRead.bind(this)
    this.getNotificationPreferences = this.getNotificationPreferences.bind(this)
    this.updateNotificationPreferences = this.updateNotificationPreferences.bind(this)
    this.generateTimesheet = this.generateTimesheet.bind(this)
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

  // Convenience methods for different HTTP verbs
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: data })
  }

  async put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: data })
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
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

  async setGitHubRepo(repoUrl) {
    return this.request('/github/set-repo', {
      method: 'POST',
      body: { repoUrl },
    })
  }

  async getGitHubStatus() {
    return this.request('/github/status')
  }

  async disconnectGitHub() {
    return this.request('/github/disconnect', {
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

  async getGoogleStatus() {
    return this.request('/google/status')
  }

  async disconnectGoogle() {
    return this.request('/google/disconnect', {
      method: 'POST',
    })
  }

  // Notification methods
  async getNotifications() {
    return this.request('/notifications')
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    })
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    })
  }

  async getNotificationPreferences() {
    return this.request('/notifications/preferences')
  }

  async updateNotificationPreferences(preferences) {
    return this.request('/notifications/preferences', {
      method: 'PUT',
      body: preferences,
    })
  }

  async generateTimesheet() {
    return this.request('/notifications/generate-timesheet', {
      method: 'POST',
    })
  }

  // Progress Update Methods
  async addProgressUpdate(taskId, data) {
    const formData = new FormData()
    formData.append('content', data.content)
    formData.append('type', data.type || 'text')
    
    if (data.checklist) {
      formData.append('checklist', JSON.stringify(data.checklist))
    }
    
    if (data.file) {
      formData.append('file', data.file)
    }
    
    if (data.voiceUrl) {
      formData.append('voiceUrl', data.voiceUrl)
      formData.append('voiceDuration', data.voiceDuration)
    }

    return this.request(`/tasks/${taskId}/progress`, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    })
  }

  async updateChecklistItem(taskId, updateId, itemIndex, completed) {
    return this.request(`/tasks/${taskId}/progress/${updateId}/checklist/${itemIndex}`, {
      method: 'PUT',
      body: { completed }
    })
  }

  async deleteProgressUpdate(taskId, updateId) {
    return this.request(`/tasks/${taskId}/progress/${updateId}`, {
      method: 'DELETE'
    })
  }

  async getTaskProgress(taskId) {
    return this.request(`/tasks/${taskId}/progress`, { method: 'GET' })
  }
}

export const apiService = new ApiService()
export const api = apiService
export default apiService