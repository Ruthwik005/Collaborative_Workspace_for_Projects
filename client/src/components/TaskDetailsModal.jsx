import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, MessageSquare, Calendar, User, Tag, ExternalLink } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select'
import { Badge } from './ui/Badge'
import { cn } from '../lib/utils'
import useAuthStore from '../stores/authStore'
import useSocketStore from '../stores/socketStore'

const TaskDetailsModal = ({ task, isOpen, onClose, onUpdate }) => {
  const { user } = useAuthStore()
  const { emitTaskUpdate } = useSocketStore()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState(task)
  const [newFeedback, setNewFeedback] = useState('')

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const response = await axios.put(`/api/tasks/${task._id}`, taskData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tasks'])
      setIsEditing(false)
      setEditedTask(data.task)
      onUpdate()
      toast.success('Task updated successfully!')
      emitTaskUpdate('task-updated', data.task)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update task')
    }
  })

  // Add feedback mutation
  const addFeedbackMutation = useMutation({
    mutationFn: async (feedback) => {
      const response = await axios.post(`/api/tasks/${task._id}/feedback`, feedback)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tasks'])
      setNewFeedback('')
      onUpdate()
      toast.success('Feedback added successfully!')
      emitTaskUpdate('task-updated', data.task)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add feedback')
    }
  })

  const handleSave = () => {
    updateTaskMutation.mutate(editedTask)
  }

  const handleAddFeedback = (e) => {
    e.preventDefault()
    if (!newFeedback.trim()) return
    addFeedbackMutation.mutate({ content: newFeedback })
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString()
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Task Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left side - Task details */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                {isEditing ? (
                  <Input
                    value={editedTask.title}
                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  />
                ) : (
                  <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                {isEditing ? (
                  <Textarea
                    value={editedTask.description}
                    onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-600">{task.description || 'No description'}</p>
                )}
              </div>

              {/* Task metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  {isEditing ? (
                    <Select
                      value={editedTask.status}
                      onValueChange={(value) => setEditedTask({ ...editedTask, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={cn(
                      "capitalize",
                      task.status === 'todo' && "bg-gray-500 text-white",
                      task.status === 'in-progress' && "bg-blue-500 text-white",
                      task.status === 'done' && "bg-green-500 text-white"
                    )}>
                      {task.status}
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  {isEditing ? (
                    <Select
                      value={editedTask.priority}
                      onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {task.assignee?.username || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className={cn(
                      "text-gray-900",
                      isOverdue(task.dueDate) && "text-red-600"
                    )}>
                      {formatDate(task.dueDate) || 'No due date'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex gap-1">
                      {task.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Google Doc link */}
              {task.googleDocUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Doc
                  </label>
                  <a
                    href={task.googleDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {task.googleDocTitle || 'View Document'}
                  </a>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={updateTaskMutation.isPending}>
                      {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Task
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Activity feed */}
          <div className="w-96 border-l bg-gray-50 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Activity Feed</h3>
            
            {/* Add feedback */}
            <form onSubmit={handleAddFeedback} className="mb-6">
              <Textarea
                value={newFeedback}
                onChange={(e) => setNewFeedback(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="mb-2"
              />
              <Button
                type="submit"
                size="sm"
                disabled={addFeedbackMutation.isPending || !newFeedback.trim()}
              >
                {addFeedbackMutation.isPending ? 'Adding...' : 'Add Comment'}
              </Button>
            </form>

            {/* Activity list */}
            <div className="space-y-4">
              {task.feedback && task.feedback.length > 0 ? (
                task.feedback.map((feedback, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {feedback.user?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {feedback.user?.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{feedback.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailsModal