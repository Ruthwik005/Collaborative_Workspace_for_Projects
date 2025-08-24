import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from './ui/card'
import { formatDate, isOverdue, getDaysUntilDue } from '../lib/utils'
import { User, Calendar, AlertTriangle } from 'lucide-react'

const TaskCard = ({ task, onClick, isDragging = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }

  const priorityLabels = {
    low: 'Low',
    medium: 'Medium', 
    high: 'High'
  }

  const overdue = isOverdue(task.dueDate)
  const daysUntil = getDaysUntilDue(task.dueDate)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 flex-1">
              {task.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Assignee */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <User className="w-3 h-3" />
            <span>{task.assignee?.username || 'Unassigned'}</span>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3 h-3" />
            <span className={`${
              overdue ? 'text-red-600 font-medium' : 
              daysUntil <= 2 ? 'text-yellow-600 font-medium' : 'text-gray-600'
            }`}>
              {formatDate(task.dueDate)}
              {overdue && <AlertTriangle className="w-3 h-3 inline ml-1" />}
            </span>
          </div>

          {/* GitHub Integration */}
          {task.githubUrl && (
            <div className="flex items-center gap-1">
              <span className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-mono">
                #{task.githubIssueNumber}
              </span>
            </div>
          )}

          {/* Google Doc Link */}
          {task.googleDocUrl && (
            <div className="flex items-center gap-1">
              <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                Doc
              </span>
            </div>
          )}

          {/* Feedback count */}
          {task.feedback && task.feedback.length > 0 && (
            <div className="text-xs text-gray-500">
              {task.feedback.length} comment{task.feedback.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskCard