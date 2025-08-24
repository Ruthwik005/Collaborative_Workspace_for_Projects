import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { 
  Calendar, 
  User, 
  AlertTriangle, 
  FileText, 
  Save, 
  X, 
  Plus,
  MessageSquare,
  Activity,
  Clock
} from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-toastify'
import ProgressUpdateDialog from './ProgressUpdateDialog'
import ProgressUpdateCard from './ProgressUpdateCard'
import { useAuthStore } from '../store/authStore'

const TaskDialog = ({ open, onClose, task }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // 'details' or 'progress'
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Fetch task progress updates
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['task-progress', task?._id],
    queryFn: () => api.getTaskProgress(task._id),
    enabled: !!task?._id && open
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => api.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Task updated successfully!')
      setIsEditing(false)
    },
    onError: (error) => {
      console.error('Update task error:', error)
      toast.error('Failed to update task')
    }
  })

  const addFeedbackMutation = useMutation({
    mutationFn: ({ taskId, content }) => api.addTaskFeedback(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Feedback added successfully!')
    },
    onError: (error) => {
      console.error('Add feedback error:', error)
      toast.error('Failed to add feedback')
    }
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEdit = () => {
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    updateTaskMutation.mutate({
      taskId: task._id,
      updates: formData
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleAddFeedback = (content) => {
    addFeedbackMutation.mutate({
      taskId: task._id,
      content
    })
  }

  const canEdit = user?._id === task?.assignee?._id || user?._id === task?.creator?._id
  const canAddProgress = user?._id === task?.assignee?._id || user?._id === task?.creator?._id

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }

  const priorityIcons = {
    low: '🟢',
    medium: '🟡',
    high: '🔴'
  }

  if (!task) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5" /> Task Details
            </DialogTitle>
            <DialogDescription>
              View and manage task information and progress
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'progress'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Progress Updates
                {progressData?.progressUpdates?.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    {progressData.progressUpdates.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Task Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <Input
                              value={formData.title || ''}
                              onChange={(e) => handleInputChange('title', e.target.value)}
                              placeholder="Task title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <Textarea
                              value={formData.description || ''}
                              onChange={(e) => handleInputChange('description', e.target.value)}
                              placeholder="Task description"
                              rows={4}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={formData.priority || 'medium'}
                              onChange={(e) => handleInputChange('priority', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Due Date
                            </label>
                            <Input
                              type="date"
                              value={formData.dueDate || ''}
                              onChange={(e) => handleInputChange('dueDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Hours
                            </label>
                            <Input
                              type="number"
                              value={formData.estimatedHours || 0}
                              onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value))}
                              min="0"
                              step="0.5"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                            <p className="text-gray-600 mt-1">{task.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                              {priorityIcons[task.priority]} {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span>Assigned to: {task.assignee?.username || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Estimated: {task.estimatedHours || 0}h</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Status and Actions */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            task.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.status === 'todo' ? 'To Do' :
                             task.status === 'in-progress' ? 'In Progress' : 'Done'}
                          </span>
                        </div>
                      </div>

                      {canEdit && (
                        <div className="space-y-2">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </Button>
                              <Button variant="outline" onClick={handleCancel}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button onClick={handleEdit} variant="outline">
                              <FileText className="w-4 h-4 mr-2" />
                              Edit Task
                            </Button>
                          )}
                        </div>
                      )}

                      {canAddProgress && (
                        <Button 
                          onClick={() => setShowProgressDialog(true)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Progress Update
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Feedback Section */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Feedback & Comments
                    </h4>
                    <div className="space-y-4">
                      {task.feedback && task.feedback.length > 0 ? (
                        task.feedback.map((feedback, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">{feedback.author?.username || 'Unknown'}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(feedback.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{feedback.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No feedback yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="space-y-4">
                  {/* Progress Updates Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Progress Updates</h4>
                    {canAddProgress && (
                      <Button 
                        onClick={() => setShowProgressDialog(true)}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Update
                      </Button>
                    )}
                  </div>

                  {/* Progress Updates List */}
                  {progressLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading progress updates...</p>
                    </div>
                  ) : progressData?.progressUpdates?.length > 0 ? (
                    <div className="space-y-4">
                      {progressData.progressUpdates.map((update) => (
                        <ProgressUpdateCard
                          key={update._id}
                          update={update}
                          taskId={task._id}
                          canDelete={user?._id === update.author?._id || user?._id === task?.creator?._id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No progress updates yet.</p>
                      {canAddProgress && (
                        <p className="text-sm text-gray-400 mt-1">
                          Click "Add Update" to start tracking progress.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog */}
      <ProgressUpdateDialog
        open={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
        taskId={task._id}
        taskTitle={task.title}
      />
    </>
  )
}

export default TaskDialog