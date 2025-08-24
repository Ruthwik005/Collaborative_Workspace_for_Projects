import { useState } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'
import TaskDetailsModal from '../components/TaskDetailsModal'

const locales = {
  'en-US': require('date-fns/locale/en-US')
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const Calendar = () => {
  const [selectedTask, setSelectedTask] = useState(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await axios.get('/api/tasks')
      return response.data
    }
  })

  // Convert tasks to calendar events
  const events = tasksData?.tasks
    ?.filter(task => task.dueDate)
    ?.map(task => ({
      id: task._id,
      title: task.title,
      start: new Date(task.dueDate),
      end: new Date(task.dueDate),
      task: task,
      className: cn(
        'cursor-pointer',
        task.priority === 'high' && 'bg-red-100 border-red-300',
        task.priority === 'medium' && 'bg-yellow-100 border-yellow-300',
        task.priority === 'low' && 'bg-green-100 border-green-300'
      )
    })) || []

  const handleEventClick = (event) => {
    setSelectedTask(event.task)
    setIsTaskModalOpen(true)
  }

  const eventStyleGetter = (event) => {
    const task = event.task
    let backgroundColor = '#e5e7eb' // default gray
    
    if (task.priority === 'high') {
      backgroundColor = '#fef2f2' // red-50
    } else if (task.priority === 'medium') {
      backgroundColor = '#fffbeb' // yellow-50
    } else if (task.priority === 'low') {
      backgroundColor = '#f0fdf4' // green-50
    }

    return {
      style: {
        backgroundColor,
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '12px'
      }
    }
  }

  const components = {
    event: (props) => {
      const task = props.event.task
      return (
        <div className="p-1">
          <div className="font-medium text-xs truncate">{task.title}</div>
          <div className="flex items-center gap-1 mt-1">
            <Badge 
              className={cn(
                "text-xs",
                task.priority === 'high' && "bg-red-500 text-white",
                task.priority === 'medium' && "bg-yellow-500 text-white",
                task.priority === 'low' && "bg-green-500 text-white"
              )}
            >
              {task.priority}
            </Badge>
            {task.assignee && (
              <span className="text-xs text-gray-600">
                {task.assignee.username}
              </span>
            )}
          </div>
        </div>
      )
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
        <p className="text-gray-600">View your tasks in a calendar timeline</p>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Task Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={handleEventClick}
              eventPropGetter={eventStyleGetter}
              components={components}
              views={['month', 'week', 'day']}
              defaultView="month"
              selectable
              popup
              tooltipAccessor={(event) => `${event.title} - ${event.task.priority} priority`}
            />
          </div>
        </CardContent>
      </Card>

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
            // Refetch tasks when updated
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

export default Calendar