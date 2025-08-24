import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'

const TaskColumn = ({ title, status, tasks, onTaskClick, onAddProgress, onStatusChange }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  })

  const statusColors = {
    todo: 'border-l-blue-500',
    'in-progress': 'border-l-yellow-500',
    done: 'border-l-green-500'
  }

  return (
    <Card className={`${statusColors[status]} border-l-4`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          {title}
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-normal">
            {tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={setNodeRef}
          className={`min-h-[400px] space-y-3 ${
            isOver ? 'bg-gray-50 rounded-lg' : ''
          }`}
        >
          <SortableContext
            items={tasks.map(task => task._id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={() => onTaskClick(task)}
                onAddProgress={onAddProgress}
                onStatusChange={onStatusChange}
              />
            ))}
          </SortableContext>
          
          {tasks.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No tasks in this column</p>
              {status === 'todo' && (
                <p className="text-xs mt-1">Create a new task to get started</p>
              )}
              {status === 'in-progress' && (
                <p className="text-xs mt-1">Drag tasks here or use the Status dropdown</p>
              )}
              {status === 'done' && (
                <p className="text-xs mt-1">Completed tasks will appear here</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskColumn