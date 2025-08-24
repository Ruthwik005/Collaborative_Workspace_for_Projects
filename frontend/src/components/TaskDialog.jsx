import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

const TaskDialog = ({ task, open, onClose }) => {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-600 mb-4">{task.description}</p>
          <div className="text-sm text-gray-500">
            <p>Assignee: {task.assignee?.username}</p>
            <p>Priority: {task.priority}</p>
            <p>Due Date: {new Date(task.dueDate).toLocaleDateString()}</p>
            <p>Status: {task.status}</p>
          </div>
          <div className="mt-4 text-center text-gray-500">
            <p>Full task details and feedback system will be implemented in Phase 1</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TaskDialog