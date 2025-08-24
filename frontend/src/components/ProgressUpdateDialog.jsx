import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { 
  FileText, 
  CheckSquare, 
  Upload, 
  Mic, 
  Plus, 
  X, 
  Save,
  Clock
} from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-toastify'

const ProgressUpdateDialog = ({ open, onClose, task }) => {
  const [updateType, setUpdateType] = useState('text')
  const [content, setContent] = useState('')
  const [checklist, setChecklist] = useState([{ text: '', completed: false }])
  const [selectedFile, setSelectedFile] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  
  const queryClient = useQueryClient()

  const addProgressMutation = useMutation({
    mutationFn: (data) => api.addProgressUpdate(task._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Progress update added successfully!')
      handleClose()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add progress update')
    }
  })

  const handleClose = () => {
    setUpdateType('text')
    setContent('')
    setChecklist([{ text: '', completed: false }])
    setSelectedFile(null)
    setAudioBlob(null)
    setRecordingTime(0)
    setIsRecording(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (updateType === 'text' && !content.trim()) {
      toast.error('Please enter a progress update')
      return
    }

    if (updateType === 'checklist' && checklist.every(item => !item.text.trim())) {
      toast.error('Please add at least one checklist item')
      return
    }

    const formData = {
      type: updateType,
      content: content || 'Progress update'
    }

    if (updateType === 'checklist') {
      formData.checklist = checklist.filter(item => item.text.trim())
    }

    if (updateType === 'file' && selectedFile) {
      formData.file = selectedFile
    }

    if (updateType === 'voice' && audioBlob) {
      // Convert blob to file
      const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' })
      formData.file = audioFile
    }

    addProgressMutation.mutate(formData)
  }

  const addChecklistItem = () => {
    setChecklist([...checklist, { text: '', completed: false }])
  }

  const removeChecklistItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index))
  }

  const updateChecklistItem = (index, field, value) => {
    const newChecklist = [...checklist]
    newChecklist[index][field] = value
    setChecklist(newChecklist)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)

      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      recorder.onstop = () => {
        clearInterval(timer)
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }
    } catch (error) {
      toast.error('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Add Progress Update
          </DialogTitle>
          <DialogDescription>
            Update progress for task: <strong>{task?.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Update Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: 'text', icon: FileText, label: 'Text Update' },
              { type: 'checklist', icon: CheckSquare, label: 'Checklist' },
              { type: 'file', icon: Upload, label: 'File Upload' },
              { type: 'voice', icon: Mic, label: 'Voice Note' }
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => setUpdateType(type)}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  updateType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mx-auto mb-2" />
                <div className="text-sm font-medium">{label}</div>
              </button>
            ))}
          </div>

          {/* Text Update */}
          {updateType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress Update
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe your progress, what you've completed, any challenges faced..."
                rows={4}
                required
              />
            </div>
          )}

          {/* Checklist */}
          {updateType === 'checklist' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Checklist Items
              </label>
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.text}
                      onChange={(e) => updateChecklistItem(index, 'text', e.target.value)}
                      placeholder={`Checklist item ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeChecklistItem(index)}
                      disabled={checklist.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addChecklistItem}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          )}

          {/* File Upload */}
          {updateType === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept="*/*"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500 font-medium">
                    Choose a file
                  </span>
                  <span className="text-gray-500"> or drag and drop</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">Max file size: 10MB</p>
                {selectedFile && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-700">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Recording */}
          {updateType === 'voice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Note
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Mic className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                {!isRecording && !audioBlob && (
                  <Button
                    type="button"
                    onClick={startRecording}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                )}
                {isRecording && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                    </div>
                    <Button
                      type="button"
                      onClick={stopRecording}
                      variant="outline"
                    >
                      Stop Recording
                    </Button>
                  </div>
                )}
                {audioBlob && !isRecording && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Recording saved</span>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null)
                        setRecordingTime(0)
                      }}
                      variant="outline"
                    >
                      Record Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addProgressMutation.isPending}
            >
              {addProgressMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Add Update
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ProgressUpdateDialog
