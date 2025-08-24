import React from 'react'
import { Card, CardContent, CardHeader } from './ui/card'
import { Button } from './ui/button'
import { 
  FileText, 
  CheckSquare, 
  Upload, 
  Mic, 
  Download,
  Clock,
  User,
  Trash2
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { toast } from 'react-toastify'

const ProgressUpdateCard = ({ update, taskId, canDelete = false }) => {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProgressUpdate(taskId, update._id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Progress update deleted')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete progress update')
    }
  })

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this progress update?')) {
      deleteMutation.mutate()
    }
  }

  const getTypeIcon = () => {
    switch (update.type) {
      case 'text':
        return <FileText className="w-4 h-4" />
      case 'checklist':
        return <CheckSquare className="w-4 h-4" />
      case 'file':
        return <Upload className="w-4 h-4" />
      case 'voice':
        return <Mic className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeLabel = () => {
    switch (update.type) {
      case 'text':
        return 'Text Update'
      case 'checklist':
        return 'Checklist'
      case 'file':
        return 'File Upload'
      case 'voice':
        return 'Voice Note'
      default:
        return 'Update'
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon()}
            <span className="text-sm font-medium text-gray-700">
              {getTypeLabel()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{update.author?.username || 'Unknown'}</span>
            <Clock className="w-3 h-3 ml-2" />
            <span>{new Date(update.createdAt).toLocaleString()}</span>
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Text Content */}
        {update.content && (
          <div className="mb-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {update.content}
            </p>
          </div>
        )}

        {/* Checklist */}
        {update.checklist && update.checklist.length > 0 && (
          <div className="mb-3">
            <div className="space-y-2">
              {update.checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckSquare 
                    className={`w-4 h-4 ${
                      item.completed ? 'text-green-500' : 'text-gray-400'
                    }`} 
                  />
                  <span className={`text-sm ${
                    item.completed ? 'text-gray-500 line-through' : 'text-gray-700'
                  }`}>
                    {item.text}
                  </span>
                  {item.completed && item.completedAt && (
                    <span className="text-xs text-gray-500">
                      ({new Date(item.completedAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Attachment */}
        {update.fileUrl && update.fileName && (
          <div className="mb-3">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Upload className="w-4 h-4 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {update.fileName}
                </p>
                {update.fileSize && (
                  <p className="text-xs text-gray-500">
                    {formatFileSize(update.fileSize)}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(update.fileUrl, '_blank')}
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Voice Note */}
        {update.voiceUrl && (
          <div className="mb-3">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Mic className="w-4 h-4 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  Voice Note
                </p>
                {update.voiceDuration && (
                  <p className="text-xs text-gray-500">
                    Duration: {formatDuration(update.voiceDuration)}
                  </p>
                )}
              </div>
              <audio controls className="h-8">
                <source src={update.voiceUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProgressUpdateCard
