import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.login(credentials),
    onSuccess: (data) => {
      login(data.user, data.token)
      navigate('/dashboard')
    },
    onError: (error) => {
      setError(error.message || 'Login failed')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    loginMutation.mutate({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SynergySphere</h1>
          <p className="text-gray-600">Your collaborative workspace</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <span className="text-gray-600">Don't have an account? </span>
              <Link 
                to="/signup" 
                className="text-primary hover:text-primary/80 font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage