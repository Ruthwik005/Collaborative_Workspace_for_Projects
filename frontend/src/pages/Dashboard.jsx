import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import TaskColumn from '../components/TaskColumn'
import TaskCard from '../components/TaskCard'
import TaskDialog from '../components/TaskDialog'
import NewTaskDialog from '../components/NewTaskDialog'
import ProgressUpdateDialog from '../components/ProgressUpdateDialog'
import { useSocket } from '../hooks/useSocket'

const Dashboard = () => {
  const [activeId, setActiveId] = useState(null)
  const [activeTask, setActiveTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progressTask, setProgressTask] = useState(null)
  const queryClient = useQueryClient()
  const { socket, isConnected } = useSocket()
  const { isLoggedIn, user } = useAuthStore()

  console.log('Dashboard component rendering, isLoggedIn:', isLoggedIn, 'user:', user)

  // Fetch tasks only if user is logged in
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
    enabled: isLoggedIn, // Only run query if user is logged in
    retry: false, // Don't retry if it fails
  })

  console.log('Dashboard tasks:', tasks, 'isLoading:', isLoading, 'error:', error)

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => api.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
    }
  })

  // Real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      const handleTaskUpdate = (data) => {
        console.log('Task update received:', data)
        queryClient.invalidateQueries(['tasks'])
      }

      socket.on('task-updated', handleTaskUpdate)
      socket.on('tasks-imported', handleTaskUpdate)

      return () => {
        socket.off('task-updated', handleTaskUpdate)
        socket.off('tasks-imported', handleTaskUpdate)
      }
    }
  }, [socket, isConnected, queryClient])

  // Organize tasks by status
  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    'in-progress': tasks.filter(task => task.status === 'in-progress'),
    done: tasks.filter(task => task.status === 'done')
  }

  const handleDragStart = (event) => {
    const { active } = event
    setActiveId(active.id)
    const task = tasks.find(t => t._id === active.id)
    setActiveTask(task)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (!over) return

    const activeTask = tasks.find(t => t._id === active.id)
    const overColumn = over.id

    if (activeTask && activeTask.status !== overColumn) {
      updateTaskMutation.mutate({
        taskId: activeTask._id,
        updates: { status: overColumn }
      })
    }

    setActiveId(null)
    setActiveTask(null)
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
  }

  const handleAddProgress = (task) => {
    setProgressTask(task)
    setShowProgressDialog(true)
  }

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false)
    setProgressTask(null)
  }

  const handleStatusChange = (task, newStatus) => {
    updateTaskMutation.mutate({
      taskId: task._id,
      updates: { status: newStatus }
    })
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please Log In</h2>
          <p className="text-gray-600">You need to be logged in to view the dashboard.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Tasks</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => queryClient.invalidateQueries(['tasks'])}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <p className="text-gray-600">Manage your team's tasks in real-time</p>
          {socket && (
            <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'} to real-time updates
            </p>
          )}
        </div>
        <Button 
          onClick={() => setShowNewTaskDialog(true)}
          disabled={!isLoggedIn}
          className={!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isLoggedIn ? 'New Task' : 'Login to Create Task'}
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to move tasks:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Drag & Drop:</strong> Click and drag any task card to another column</li>
              <li>• <strong>Status Dropdown:</strong> Use the "Status" button on each task card</li>
              <li>• <strong>Progress Updates:</strong> Click "Progress" to add updates without changing status</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Task Board */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TaskColumn
            title="To Do"
            status="todo"
            tasks={tasksByStatus.todo}
            onTaskClick={handleTaskClick}
            onAddProgress={handleAddProgress}
            onStatusChange={handleStatusChange}
          />
          <TaskColumn
            title="In Progress"
            status="in-progress"
            tasks={tasksByStatus['in-progress']}
            onTaskClick={handleTaskClick}
            onAddProgress={handleAddProgress}
            onStatusChange={handleStatusChange}
          />
          <TaskColumn
            title="Done"
            status="done"
            tasks={tasksByStatus.done}
            onTaskClick={handleTaskClick}
            onAddProgress={handleAddProgress}
            onStatusChange={handleStatusChange}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* New Task Dialog */}
      <NewTaskDialog
        open={showNewTaskDialog}
        onClose={() => setShowNewTaskDialog(false)}
      />

      {/* Progress Update Dialog */}
      <ProgressUpdateDialog
        open={showProgressDialog}
        onClose={handleCloseProgressDialog}
        task={progressTask}
      />
    </div>
  )
}

export default Dashboard