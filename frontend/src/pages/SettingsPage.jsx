import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Bell, Github, Calendar, FileText, Settings, Download, Trash2, Link, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'

const SettingsPage = () => {
  const { user } = useAuthStore()
  const [githubStatus, setGithubStatus] = useState(null)
  const [googleStatus, setGoogleStatus] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [notificationPreferences, setNotificationPreferences] = useState({})
  const [loading, setLoading] = useState(false)
  const [timesheetData, setTimesheetData] = useState(null)

  useEffect(() => {
    fetchIntegrationStatus()
    fetchNotificationPreferences()
  }, [])

  const fetchIntegrationStatus = async () => {
    try {
      const [githubRes, googleRes] = await Promise.all([
        api.get('/github/status'),
        api.get('/google/status')
      ])
      setGithubStatus(githubRes.data)
      setGoogleStatus(googleRes.data)
    } catch (error) {
      console.error('Failed to fetch integration status:', error)
    }
  }

  const fetchNotificationPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences')
      setNotificationPreferences(response.data)
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
    }
  }

  const connectGitHub = async () => {
    setLoading(true)
    try {
      // In production, this would redirect to GitHub OAuth
      // For now, we'll simulate the connection
      const response = await api.post('/github/connect', { code: 'mock_auth_code' })
      if (response.data.connected) {
        await fetchIntegrationStatus()
      }
    } catch (error) {
      console.error('Failed to connect GitHub:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectGoogle = async () => {
    setLoading(true)
    try {
      // In production, this would redirect to Google OAuth
      // For now, we'll simulate the connection
      const response = await api.post('/google/connect', { code: 'mock_auth_code' })
      if (response.data.connected) {
        await fetchIntegrationStatus()
      }
    } catch (error) {
      console.error('Failed to connect Google:', error)
    } finally {
      setLoading(false)
    }
  }

  const setRepository = async () => {
    if (!repoUrl) return
    
    try {
      const response = await api.post('/github/set-repo', { repoUrl })
      if (response.data.repoUrl) {
        setRepoUrl('')
        await fetchIntegrationStatus()
      }
    } catch (error) {
      console.error('Failed to set repository:', error)
    }
  }

  const importGitHubIssues = async () => {
    try {
      const response = await api.post('/github/import')
      console.log('Imported issues:', response.data)
    } catch (error) {
      console.error('Failed to import issues:', error)
    }
  }

  const disconnectGitHub = async () => {
    try {
      await api.post('/github/disconnect')
      await fetchIntegrationStatus()
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error)
    }
  }

  const disconnectGoogle = async () => {
    try {
      await api.post('/google/disconnect')
      await fetchIntegrationStatus()
    } catch (error) {
      console.error('Failed to disconnect Google:', error)
    }
  }

  const updateNotificationPreference = async (key, value) => {
    try {
      const updatedPrefs = { ...notificationPreferences, [key]: value }
      await api.put('/notifications/preferences', updatedPrefs)
      setNotificationPreferences(updatedPrefs)
    } catch (error) {
      console.error('Failed to update notification preference:', error)
    }
  }

  const generateTimesheet = async () => {
    try {
      const response = await api.post('/notifications/generate-timesheet')
      setTimesheetData(response.data)
    } catch (error) {
      console.error('Failed to generate timesheet:', error)
    }
  }

  const downloadTimesheet = (filename) => {
    window.open(`/api/notifications/download-timesheet/${filename}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage integrations and preferences</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              GitHub Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {githubStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status: Connected</span>
                  <Button variant="outline" size="sm" onClick={disconnectGitHub}>
                    Disconnect
                  </Button>
                </div>
                
                {githubStatus.repoUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Repository:</span>
                      <a 
                        href={githubStatus.repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {githubStatus.repoName}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Button onClick={importGitHubIssues} size="sm">
                      Import Issues
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                    <Button onClick={setRepository} size="sm">
                      Set Repository
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">Connect your GitHub account to sync issues</p>
                <Button onClick={connectGitHub} disabled={loading}>
                  {loading ? 'Connecting...' : 'Connect GitHub'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Google Calendar & Docs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status: Connected</span>
                  <Button variant="outline" size="sm" onClick={disconnectGoogle}>
                    Disconnect
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Email: {googleStatus.googleEmail}</p>
                  <p>Name: {googleStatus.googleName}</p>
                </div>
                
                <div className="text-xs text-gray-500">
                  <p>✓ Auto-schedule meetings</p>
                  <p>✓ Check availability</p>
                  <p>✓ Link Google Docs to tasks</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">Connect Google account for calendar integration</p>
                <Button onClick={connectGoogle} disabled={loading}>
                  {loading ? 'Connecting...' : 'Connect Google'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(notificationPreferences).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateNotificationPreference(key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Timesheet */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Weekly Timesheet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={generateTimesheet} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Weekly Timesheet'}
              </Button>
              
              {timesheetData && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Period: {timesheetData.period}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadTimesheet(timesheetData.filename)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              <p>• Automatically generated every Friday at 5 PM</p>
              <p>• Includes completed tasks, time tracking, and feedback</p>
              <p>• PDF format with detailed breakdown by user</p>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">User ID:</span>
                <p className="text-gray-600">{user?._id}</p>
              </div>
              <div>
                <span className="font-medium">Username:</span>
                <p className="text-gray-600">{user?.username}</p>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage