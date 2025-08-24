import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Download, 
  FileText, 
  Calendar, 
  Clock, 
  Trash2, 
  RefreshCw,
  Eye,
  Loader2
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const Reports = () => {
  const queryClient = useQueryClient()

  // Fetch reports
  const { data: reportsData, isLoading, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await axios.get('/api/reports')
      return response.data
    }
  })

  // Generate new report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/reports/generate')
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Weekly report generated successfully')
      queryClient.invalidateQueries(['reports'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate report')
    }
  })

  // Download report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async (reportId) => {
      const response = await axios.get(`/api/reports/${reportId}/download`, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `weekly-report-${reportId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Report downloaded successfully')
    },
    onError: (error) => {
      toast.error('Failed to download report')
    }
  })

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId) => {
      await axios.delete(`/api/reports/${reportId}`)
    },
    onSuccess: () => {
      toast.success('Report deleted successfully')
      queryClient.invalidateQueries(['reports'])
    },
    onError: (error) => {
      toast.error('Failed to delete report')
    }
  })

  const handleGenerateReport = () => {
    generateReportMutation.mutate()
  }

  const handleDownloadReport = (reportId) => {
    downloadReportMutation.mutate(reportId)
  }

  const handleDeleteReport = (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      deleteReportMutation.mutate(reportId)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReportStatus = (report) => {
    if (report.status === 'completed') {
      return { label: 'Completed', color: 'bg-green-100 text-green-800' }
    } else if (report.status === 'generating') {
      return { label: 'Generating', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { label: 'Failed', color: 'bg-red-100 text-red-800' }
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Reports</h1>
            <p className="text-gray-600 mt-2">
              View and download automated weekly progress reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isPending}
            >
              {generateReportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FileText className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : reportsData?.reports?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportsData.reports.map((report) => {
            const status = getReportStatus(report)
            return (
              <Card key={report._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">Weekly Report</CardTitle>
                    </div>
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                  </div>
                  <CardDescription>
                    Week of {formatDate(report.weekStart)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Generated: {formatDate(report.createdAt)}</span>
                    </div>
                    
                    {report.stats && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-semibold text-blue-600">
                            {report.stats.completedTasks || 0}
                          </div>
                          <div className="text-xs text-gray-600">Tasks Completed</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-semibold text-green-600">
                            {report.stats.totalFeedback || 0}
                          </div>
                          <div className="text-xs text-gray-600">Feedback Items</div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {report.status === 'completed' && (
                        <>
                          <Button
                            onClick={() => handleDownloadReport(report._id)}
                            disabled={downloadReportMutation.isPending}
                            size="sm"
                            className="flex-1"
                          >
                            {downloadReportMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            Download
                          </Button>
                          <Button
                            onClick={() => window.open(`/api/reports/${report._id}/preview`, '_blank')}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleDeleteReport(report._id)}
                        disabled={deleteReportMutation.isPending}
                        variant="destructive"
                        size="sm"
                      >
                        {deleteReportMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
            <p className="text-gray-600 mb-4">
              Generate your first weekly report to see progress summaries and insights.
            </p>
            <Button
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isPending}
            >
              {generateReportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate First Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            About Weekly Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">What's Included</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Completed tasks summary</li>
                <li>• Team activity overview</li>
                <li>• Feedback and comments</li>
                <li>• GitHub integration status</li>
                <li>• Meeting attendance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Schedule</h4>
              <p className="text-sm text-gray-600">
                Reports are automatically generated every Friday at 5:00 PM. 
                You can also manually generate reports at any time using the button above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports