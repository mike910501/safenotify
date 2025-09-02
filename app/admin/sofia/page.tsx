'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface ConversationSummary {
  id: string
  phone: string
  name: string
  email: string
  specialty: string
  monthlyPatients: number | null
  qualificationScore: number
  grade: string
  status: string
  conversationState: string
  lastActivity: string
  messageCount: number
  firstMessage: string
  lastResponse: string
  conversationId: string
  createdAt: string
}

interface DashboardStats {
  totalLeads: number
  activeConversations: number
  qualityLeads: number
  scheduledDemos: number
  recentActivity: number
  gradeDistribution: {
    A: number
    B: number
    C: number
  }
  conversionRate: number
}

interface ConversationDetail {
  id: string
  messages: Array<{
    role: string
    content: string
    timestamp: string
  }>
  lead: {
    phone: string
    name: string
    email: string
    specialty: string
    qualificationScore: number
    grade: string
  }
}

export default function SofiaAdminDashboard() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Fetch conversations and stats in parallel
      const [conversationsRes, statsRes] = await Promise.all([
        fetch('/api/admin/sofia/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/admin/sofia/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      if (!conversationsRes.ok || !statsRes.ok) {
        if (conversationsRes.status === 403 || statsRes.status === 403) {
          toast.error('Access denied. Admin role required.')
          router.push('/dashboard')
          return
        }
        throw new Error('Failed to fetch data')
      }

      const conversationsData = await conversationsRes.json()
      const statsData = await statsRes.json()

      setConversations(conversationsData.conversations)
      setStats(statsData.stats)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchConversationDetail = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/sofia/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch conversation detail')
      }

      const data = await response.json()
      setSelectedConversation(data.conversation)
      setShowDetail(true)

    } catch (error) {
      console.error('Error fetching conversation detail:', error)
      toast.error('Error loading conversation details')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO')
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100'
      case 'B': return 'text-yellow-600 bg-yellow-100'
      case 'C': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">Sofia AI - Admin Dashboard</h1>
            <p className="text-gray-600">Monitor and manage SafeNotify sales conversations</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalLeads}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500">Active Conversations</h3>
              <p className="text-2xl font-bold text-green-600">{stats.activeConversations}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500">Quality Leads (A & B)</h3>
              <p className="text-2xl font-bold text-yellow-600">{stats.qualityLeads}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-gray-500">Demos Scheduled</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.scheduledDemos}</p>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Distribution by Grade</h3>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm">A Grade: {stats.gradeDistribution.A}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm">B Grade: {stats.gradeDistribution.B}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-sm">C Grade: {stats.gradeDistribution.C}</span>
              </div>
            </div>
          </div>

          {/* Conversations Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Conversations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {conversation.name}
                          </div>
                          <div className="text-sm text-gray-500">{conversation.phone}</div>
                          <div className="text-sm text-gray-400">{conversation.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversation.specialty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversation.qualificationScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(conversation.grade)}`}>
                          {conversation.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversation.messageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(conversation.lastActivity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchConversationDetail(conversation.conversationId)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Detail Modal */}
      {showDetail && selectedConversation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Conversation Details - {selectedConversation.lead.name} ({selectedConversation.lead.phone})
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded p-4 mb-4">
              {selectedConversation.messages.map((message, index) => (
                <div key={index} className={`mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-2 rounded max-w-xs ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatDate(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}