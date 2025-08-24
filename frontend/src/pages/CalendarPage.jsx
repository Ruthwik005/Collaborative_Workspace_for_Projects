import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const CalendarPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Task Calendar</h1>
        <p className="text-gray-600">View and manage your tasks in calendar format</p>
      </div>

      {/* Test Card */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p>Calendar functionality is loading...</p>
            <p className="text-sm mt-2">If you can see this, the basic routing is working!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CalendarPage