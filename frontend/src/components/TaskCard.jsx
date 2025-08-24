import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from './ui/button'
import { 
  Calendar, 
  User, 
  AlertTriangle, 
  FileText,
  Activity,
  MessageSquare,
  Plus,
  ChevronDown
} from 'lucide-react'

const TaskCard = ({ task, onClick, onAddProgress, onStatusChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done'
  const priorityColors = {
    low: 'border-l-green-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-red-500'
  }

  const priorityIcons = {
    low: '🟢',
    medium: '🟡',
    high: '🔴'
  }

  const handleAddProgress = (e) => {
    e.stopPropagation() // Prevent triggering the card click
    onAddProgress(task)
  }

  const handleStatusChange = (e, newStatus) => {
    e.stopPropagation() // Prevent triggering the card click
    if (onStatusChange && newStatus !== task.status) {
      onStatusChange(task, newStatus)
    }
  }

  const getStatusOptions = () => {
    const options = []
    if (task.status === 'todo') {
      options.push({ value: 'in-progress', label: 'Move to In Progress' })
    }
    if (task.status === 'todo' || task.status === 'in-progress') {
      options.push({ value: 'done', label: 'Mark as Done' })
    }
    if (task.status === 'in-progress') {
      options.push({ value: 'todo', label: 'Move back to To Do' })
    }
    if (task.status === 'done') {
      options.push({ value: 'in-progress', label: 'Move back to In Progress' })
      options.push({ value: 'todo', label: 'Move back to To Do' })
    }
    return options
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${priorityColors[task.priority]} border-l-4`}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">
            {task.title}
          </h3>
          <span className="text-xs text-gray-500 ml-2">
            {priorityIcons[task.priority]}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Progress Indicators */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {task.progressUpdates && task.progressUpdates.length > 0 && (
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>{task.progressUpdates.length} update{task.progressUpdates.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {task.feedback && task.feedback.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task.feedback.length} comment{task.feedback.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Task Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-3 h-3" />
            <span className="truncate">{task.assignee?.username || 'Unassigned'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-3 h-3" />
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
            {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
          </div>
        </div>

        {/* Status Badge and Actions */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            task.status === 'todo' ? 'bg-gray-100 text-gray-800' :
            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {task.status === 'todo' ? 'To Do' :
             task.status === 'in-progress' ? 'In Progress' : 'Done'}
          </span>
          
          <div className="flex items-center gap-2">
            {task.estimatedHours > 0 && (
              <span className="text-xs text-gray-500">
                {task.estimatedHours}h
              </span>
            )}
            
            {/* Status Change Dropdown */}
            <div className="relative group">
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
              >
                <ChevronDown className="w-3 h-3 mr-1" />
                Status
              </Button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                {getStatusOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => handleStatusChange(e, option.value)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Add Progress Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddProgress}
              className="h-6 px-2 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard