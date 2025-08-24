import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage integrations and preferences</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>GitHub Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>GitHub integration will be implemented in Phase 2</p>
              <p className="text-sm mt-2">Connect repositories and sync issues</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Google Calendar integration will be implemented in Phase 2</p>
              <p className="text-sm mt-2">Auto-schedule meetings and sync calendar</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage