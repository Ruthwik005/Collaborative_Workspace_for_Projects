import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Calendar, Clock, Users, Video, ExternalLink } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'
import useAuthStore from '../stores/authStore'
import useSocketStore from '../stores/socketStore'

const Meetings = () => {
  const { user } = useAuthStore()
  const { emitMeetingUpdate } = useSocketStore()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    type: 'general',
    attendees: []
  })

  // Fetch meetings
  const { data: meetingsData, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const response = await axios.get('/api/meetings')
      return response.data
    }
  })

  // Fetch users for attendee selection
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get('/api/users')
      return response.data
    }
  })

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData) => {
      const response = await axios.post('/api/meetings', meetingData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['meetings'])
      setIsCreateModalOpen(false)
      setNewMeeting({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        type: 'general',
        attendees: []
      })
      toast.success('Meeting created successfully!')
      emitMeetingUpdate('meeting-created', data.meeting)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create meeting')
    }
  })

  // Schedule standup mutation
  const scheduleStandupMutation = useMutation({
    mutationFn: async (standupData) => {
      const response = await axios.post('/api/meetings/schedule-standup', standupData)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['meetings'])
      toast.success('Daily standup scheduled successfully!')
      emitMeetingUpdate('meeting-created', data.meeting)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to schedule standup')
    }
  })

  const handleCreateMeeting = (e) => {
    e.preventDefault()
    createMeetingMutation.mutate(newMeeting)
  }

  const handleScheduleStandup = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateString = tomorrow.toISOString().split('T')[0]
    
    scheduleStandupMutation.mutate({
      date: dateString,
      time: '09:00',
      duration: 30
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getMeetingTypeColor = (type) => {
    switch (type) {
      case 'standup': return 'bg-blue-500 text-white'
      case 'planning': return 'bg-purple-500 text-white'
      case 'review': return 'bg-green-500 text-white'
      case 'retrospective': return 'bg-orange-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const isUpcoming = (startTime) => {
    return new Date(startTime) > new Date()
  }

  const isHappening = (startTime, endTime) => {
    const now = new Date()
    return now >= new Date(startTime) && now <= new Date(endTime)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage team meetings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScheduleStandup}>
            Schedule Standup
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Meeting</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <Input
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="Enter meeting title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    placeholder="Enter meeting description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={newMeeting.startTime}
                      onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={newMeeting.endTime}
                      onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <Select
                    value={newMeeting.type}
                    onValueChange={(value) => setNewMeeting({ ...newMeeting, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="standup">Standup</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="retrospective">Retrospective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMeetingMutation.isPending}
                  >
                    {createMeetingMutation.isPending ? 'Creating...' : 'Create Meeting'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meetings List */}
      <div className="grid gap-6">
        {meetingsData?.meetings?.map((meeting) => (
          <Card key={meeting._id} className={cn(
            "transition-all",
            isHappening(meeting.startTime, meeting.endTime) && "ring-2 ring-blue-500 bg-blue-50"
          )}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {meeting.title}
                    <Badge className={getMeetingTypeColor(meeting.type)}>
                      {meeting.type}
                    </Badge>
                    {isHappening(meeting.startTime, meeting.endTime) && (
                      <Badge className="bg-green-500 text-white">
                        Live
                      </Badge>
                    )}
                    {isUpcoming(meeting.startTime) && (
                      <Badge variant="outline">
                        Upcoming
                      </Badge>
                    )}
                  </CardTitle>
                  {meeting.description && (
                    <p className="text-gray-600 mt-2">{meeting.description}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(meeting.startTime)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDateTime(meeting.endTime)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{meeting.attendees?.length || 0} attendees</span>
                  </div>
                  {meeting.googleMeetLink && (
                    <a
                      href={meeting.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Video className="h-4 w-4" />
                      Join Meeting
                    </a>
                  )}
                </div>

                {/* Attendees */}
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Attendees:</h4>
                    <div className="flex flex-wrap gap-2">
                      {meeting.attendees.map((attendee) => (
                        <div
                          key={attendee.user._id}
                          className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-full text-xs"
                        >
                          <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {attendee.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span>{attendee.user.username}</span>
                          {attendee.status && (
                            <Badge variant="outline" className="text-xs">
                              {attendee.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!meetingsData?.meetings || meetingsData.meetings.length === 0) && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings scheduled</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first meeting</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Meeting
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Meetings