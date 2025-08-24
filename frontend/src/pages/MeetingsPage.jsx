import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Plus } from 'lucide-react'

const MeetingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage team meetings</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p>Meeting functionality will be implemented in Phase 1</p>
            <p className="text-sm mt-2">This will show scheduled meetings and auto-scheduling</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MeetingsPage