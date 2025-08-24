import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'
import apiService from '../services/api'
import TaskColumn from '../components/TaskColumn'
import TaskCard from '../components/TaskCard'
import TaskDialog from '../components/TaskDialog'
import NewTaskDialog from '../components/NewTaskDialog'

const Dashboard = () => {
  const [activeId, setActiveId] = useState(null)
  const [activeTask, setActiveTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: apiService.getTasks,
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => apiService.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
    }
  })

  // Real-time updates
  useEffect(() => {
    if (window.socket) {
      const handleTaskUpdate = (data) => {
        queryClient.invalidateQueries(['tasks'])
      }

      window.socket.on('task-updated', handleTaskUpdate)
      window.socket.on('tasks-imported', handleTaskUpdate)

      return () => {
        window.socket?.off('task-updated', handleTaskUpdate)
        window.socket?.off('tasks-imported', handleTaskUpdate)
      }
    }
  }, [queryClient])

  // Organize tasks by status
  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    inprogress: tasks.filter(task => task.status === 'inprogress'),
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
        </div>
        <Button onClick={() => setShowNewTaskDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
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
          />
          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={tasksByStatus.inprogress}
            onTaskClick={handleTaskClick}
          />
          <TaskColumn
            title="Done"
            status="done"
            tasks={tasksByStatus.done}
            onTaskClick={handleTaskClick}
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
    </div>
  )
}

export default Dashboard