import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MoreVertical, Calendar, User, Tag } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'
import useAuthStore from '../stores/authStore'
import useSocketStore from '../stores/socketStore'
import TaskDetailsModal from '../components/TaskDetailsModal'

const Dashboard = () => {
  const { user } = useAuthStore()
  const { emitTaskUpdate } = useSocketStore()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    dueDate: ''
  })

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await axios.get('/api/tasks')
      return response.data
    }
  })

  // Fetch users for assignee dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get('/api/users')
      return response.data
    }
  })

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const response = await axios.post('/api/tasks', taskData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tasks'])
      setIsCreateModalOpen(false)
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        assignee: '',
        dueDate: ''
      })
      toast.success('Task created successfully!')
      emitTaskUpdate('task-created', data.task)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create task')
    }
  })

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const response = await axios.put(`/api/tasks/${taskId}`, { status })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Task status updated!')
      emitTaskUpdate('task-updated', data.task)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update task')
    }
  })

  const handleCreateTask = (e) => {
    e.preventDefault()
    createTaskMutation.mutate(newTask)
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    const newStatus = destination.droppableId

    updateTaskStatusMutation.mutate({
      taskId: draggableId,
      status: newStatus
    })
  }

  const openTaskDetails = (task) => {
    setSelectedTask(task)
    setIsTaskModalOpen(true)
  }

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' }
  ]

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-500 text-white'
      case 'in-progress': return 'bg-blue-500 text-white'
      case 'done': return 'bg-green-500 text-white'
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

  const isDueSoon = (dueDate) => {
    if (!dueDate) return false
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <p className="text-gray-600">Manage your team's tasks and track progress</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignee
                  </label>
                  <Select
                    value={newTask.assignee}
                    onValueChange={(value) => setNewTask({ ...newTask, assignee: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersData?.users?.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{column.title}</h3>
                <Badge variant="secondary">
                  {tasksData?.tasks?.filter(task => task.status === column.id).length || 0}
                </Badge>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[500px] p-4 rounded-lg border-2 border-dashed transition-colors",
                      snapshot.isDraggingOver
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 bg-gray-50"
                    )}
                  >
                    {tasksData?.tasks
                      ?.filter(task => task.status === column.id)
                      .map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "mb-4 p-4 bg-white rounded-lg shadow-sm border cursor-pointer task-card",
                                snapshot.isDragging && "dragging"
                              )}
                              onClick={() => openTaskDetails(task)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 line-clamp-2">
                                  {task.title}
                                </h4>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                  {task.assignee && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <User className="h-3 w-3" />
                                      {task.assignee.username}
                                    </div>
                                  )}
                                </div>
                                
                                {task.dueDate && (
                                  <div className={cn(
                                    "flex items-center gap-1 text-xs",
                                    isOverdue(task.dueDate)
                                      ? "text-red-600"
                                      : isDueSoon(task.dueDate)
                                      ? "text-yellow-600"
                                      : "text-gray-500"
                                  )}>
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(task.dueDate)}
                                  </div>
                                )}
                              </div>

                              {task.tags && task.tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Tag className="h-3 w-3 text-gray-400" />
                                  <div className="flex gap-1">
                                    {task.tags.slice(0, 2).map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {task.tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{task.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={() => {
            queryClient.invalidateQueries(['tasks'])
          }}
        />
      )}
    </div>
  )
}

export default Dashboard