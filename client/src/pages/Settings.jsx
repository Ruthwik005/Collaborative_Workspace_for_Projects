import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  User, 
  Github, 
  Calendar, 
  FileText, 
  Settings as SettingsIcon,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import useAuthStore from '../stores/authStore'

const profileSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address')
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

const Settings = () => {
  const { user, updateProfile, changePassword } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || ''
    }
  })

  // Password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  // Fetch GitHub integration status
  const { data: githubData, isLoading: githubLoading } = useQuery({
    queryKey: ['github-integration'],
    queryFn: async () => {
      const response = await axios.get('/api/github/status')
      return response.data
    },
    retry: false
  })

  // Fetch Google integration status
  const { data: googleData, isLoading: googleLoading } = useQuery({
    queryKey: ['google-integration'],
    queryFn: async () => {
      const response = await axios.get('/api/google/status')
      return response.data
    },
    retry: false
  })

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data) => {
      await updateProfile(data)
    },
    onSuccess: () => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries(['user'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    }
  })

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: async (data) => {
      await changePassword(data.currentPassword, data.newPassword)
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      passwordForm.reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password')
    }
  })

  // GitHub connect mutation
  const githubConnectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.get('/api/github/auth')
      window.location.href = response.data.authUrl
    },
    onError: (error) => {
      toast.error('Failed to connect GitHub')
    }
  })

  // Google connect mutation
  const googleConnectMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.get('/api/google/auth')
      window.location.href = response.data.authUrl
    },
    onError: (error) => {
      toast.error('Failed to connect Google')
    }
  })

  // Disconnect mutations
  const disconnectGitHubMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/api/github/disconnect')
    },
    onSuccess: () => {
      toast.success('GitHub disconnected')
      queryClient.invalidateQueries(['github-integration'])
    },
    onError: (error) => {
      toast.error('Failed to disconnect GitHub')
    }
  })

  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/api/google/disconnect')
    },
    onSuccess: () => {
      toast.success('Google disconnected')
      queryClient.invalidateQueries(['google-integration'])
    },
    onError: (error) => {
      toast.error('Failed to disconnect Google')
    }
  })

  const handleProfileSubmit = (data) => {
    profileMutation.mutate(data)
  }

  const handlePasswordSubmit = (data) => {
    passwordMutation.mutate(data)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'integrations', label: 'Integrations', icon: SettingsIcon }
  ]

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and integrations</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account information and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <Input
                    {...profileForm.register('username')}
                    placeholder="Enter your username"
                  />
                  {profileForm.formState.errors.username && (
                    <p className="text-red-500 text-sm mt-1">
                      {profileForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    {...profileForm.register('email')}
                    type="email"
                    placeholder="Enter your email"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={profileMutation.isPending}
                  className="w-full"
                >
                  {profileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <Input
                    {...passwordForm.register('currentPassword')}
                    type="password"
                    placeholder="Enter current password"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    {...passwordForm.register('newPassword')}
                    type="password"
                    placeholder="Enter new password"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    placeholder="Confirm new password"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="w-full"
                >
                  {passwordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* GitHub Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="h-6 w-6" />
                  <div>
                    <CardTitle>GitHub Integration</CardTitle>
                    <CardDescription>
                      Connect your GitHub account to sync issues and pull requests
                    </CardDescription>
                  </div>
                </div>
                {githubLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : githubData?.connected ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {githubData?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Connected Repository</p>
                      <p className="text-sm text-gray-600">
                        {githubData.repository || 'No repository selected'}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => githubConnectMutation.mutate()}
                      disabled={githubConnectMutation.isPending}
                      variant="outline"
                    >
                      {githubConnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Change Repository
                    </Button>
                    <Button
                      onClick={() => disconnectGitHubMutation.mutate()}
                      disabled={disconnectGitHubMutation.isPending}
                      variant="destructive"
                    >
                      {disconnectGitHubMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your GitHub account to automatically sync issues and pull requests with your tasks.
                  </p>
                  <Button
                    onClick={() => githubConnectMutation.mutate()}
                    disabled={githubConnectMutation.isPending}
                    className="w-full"
                  >
                    {githubConnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Github className="h-4 w-4 mr-2" />
                    Connect GitHub
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Google Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6" />
                  <div>
                    <CardTitle>Google Integration</CardTitle>
                    <CardDescription>
                      Connect your Google account for Calendar and Docs integration
                    </CardDescription>
                  </div>
                </div>
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : googleData?.connected ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {googleData?.connected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">Google Calendar</p>
                        <p className="text-xs text-gray-600">Auto-scheduling enabled</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <FileText className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">Google Docs</p>
                        <p className="text-xs text-gray-600">Document linking enabled</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => googleConnectMutation.mutate()}
                      disabled={googleConnectMutation.isPending}
                      variant="outline"
                    >
                      {googleConnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Reconnect
                    </Button>
                    <Button
                      onClick={() => disconnectGoogleMutation.mutate()}
                      disabled={disconnectGoogleMutation.isPending}
                      variant="destructive"
                    >
                      {disconnectGoogleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your Google account to enable automatic meeting scheduling and document linking.
                  </p>
                  <Button
                    onClick={() => googleConnectMutation.mutate()}
                    disabled={googleConnectMutation.isPending}
                    className="w-full"
                  >
                    {googleConnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Calendar className="h-4 w-4 mr-2" />
                    Connect Google
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Settings