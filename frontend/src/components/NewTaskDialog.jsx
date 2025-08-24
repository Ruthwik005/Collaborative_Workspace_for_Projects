import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Calendar, Clock, User, AlertTriangle, FileText, Save, X } from 'lucide-react'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { toast } from 'react-toastify'

const NewTaskDialog = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
    dueDate: '',
    status: 'todo'
  })
  
  const [errors, setErrors] = useState({})
  const queryClient = useQueryClient()
  const { isLoggedIn, user } = useAuthStore()

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Task created successfully!')
      handleClose()
    },
    onError: (error) => {
      console.error('Failed to create task:', error)
      if (error.message === 'Access token required') {
        toast.error('Please log in to create tasks')
        onClose()
      } else {
        setErrors({ submit: error.message || 'Failed to create task' })
        toast.error(error.message || 'Failed to create task')
      }
    }
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    
    if (!formData.assignee.trim()) {
      newErrors.assignee = 'Assignee is required'
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required'
    } else {
      const selectedDate = new Date(formData.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Check if user is logged in
    if (!isLoggedIn) {
      toast.error('Please log in to create tasks')
      onClose()
      return
    }
    
    if (!validateForm()) {
      return
    }
    
    // Format the task data
    const taskData = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      assignee: formData.assignee.trim(),
      dueDate: new Date(formData.dueDate).toISOString(),
      createdAt: new Date().toISOString()
    }
    
    createTaskMutation.mutate(taskData)
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      assignee: '',
      priority: 'medium',
      dueDate: '',
      status: 'todo'
    })
    setErrors({})
    onClose()
  }

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200'
  }

  const priorityIcons = {
    low: '🟢',
    medium: '🟡',
    high: '🔴'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create New Task
          </DialogTitle>
          <DialogDescription>
            {isLoggedIn ? (
              <span>Creating task as <strong>{user?.username}</strong></span>
            ) : (
              <span className="text-red-600">Please log in to create tasks</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Authentication Notice */}
          {!isLoggedIn && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Authentication Required</p>
                  <p>Please log in to create tasks. The form is disabled until you authenticate.</p>
                </div>
              </div>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter task title..."
              disabled={!isLoggedIn}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the task in detail..."
              rows={3}
              disabled={!isLoggedIn}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : ''
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignee *
            </label>
            <Input
              type="text"
              value={formData.assignee}
              onChange={(e) => handleInputChange('assignee', e.target.value)}
              placeholder="Enter assignee username or email..."
              disabled={!isLoggedIn}
              className={errors.assignee ? 'border-red-500' : ''}
            />
            {errors.assignee && (
              <p className="text-sm text-red-600 mt-1">{errors.assignee}</p>
            )}
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                disabled={!isLoggedIn}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                disabled={!isLoggedIn}
                className={errors.dueDate ? 'border-red-500' : ''}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600 mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Priority Preview */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Priority Level:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${priorityColors[formData.priority]}`}>
              {priorityIcons[formData.priority]} {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
            </span>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isLoggedIn || createTaskMutation.isPending}
              className="min-w-[100px]"
            >
              {!isLoggedIn ? (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Login Required
                </>
              ) : createTaskMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewTaskDialog