import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const CalendarPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600">View tasks by their due dates</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Calendar View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p>Calendar functionality will be implemented in Phase 1</p>
            <p className="text-sm mt-2">This will show tasks organized by due date</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CalendarPage