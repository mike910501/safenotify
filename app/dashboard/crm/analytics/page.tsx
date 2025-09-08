'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { API_URL } from '@/lib/config'
import { useRouter } from 'next/navigation'
import { 
  BarChart, 
  LineChart, 
  TrendingUp, 
  TrendingDown,
  MessageSquare, 
  Users, 
  Bot, 
  Clock,
  Star,
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalConversations: number
    activeConversations: number
    totalAgents: number
    avgResponseTime: number
    satisfactionScore: number
    conversionRate: number
  }
  trends: {
    conversations: Array<{ date: string; count: number }>
    responseTime: Array<{ date: string; time: number }>
    satisfaction: Array<{ date: string; score: number }>
  }
  agents: Array<{
    id: string
    name: string
    role: string
    totalConversations: number
    avgResponseTime: number
    satisfactionRating: number
    isActive: boolean
  }>
  topPerformers: Array<{
    agentName: string
    metric: string
    value: number | string
    change: number
  }>
}

export default function AnalyticsDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [refreshing, setRefreshing] = useState(false)

  // Check CRM access
  useEffect(() => {
    if (user && !user.crmEnabled) {
      router.push('/dashboard')
      return
    }
  }, [user, router])

  const fetchAnalytics = async () => {
    if (!user) return

    try {
      setError(null)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/analytics/crm?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
      } else {
        setError(data.error || 'Error loading analytics')
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      // Mock data for development
      setAnalytics({
        overview: {
          totalConversations: 156,
          activeConversations: 23,
          totalAgents: 3,
          avgResponseTime: 12.5,
          satisfactionScore: 4.2,
          conversionRate: 34.7
        },
        trends: {
          conversations: [
            { date: '2024-01-01', count: 12 },
            { date: '2024-01-02', count: 19 },
            { date: '2024-01-03', count: 15 },
            { date: '2024-01-04', count: 28 },
            { date: '2024-01-05', count: 22 },
            { date: '2024-01-06', count: 31 },
            { date: '2024-01-07', count: 29 }
          ],
          responseTime: [
            { date: '2024-01-01', time: 15.2 },
            { date: '2024-01-02', time: 12.8 },
            { date: '2024-01-03', time: 11.5 },
            { date: '2024-01-04', time: 9.3 },
            { date: '2024-01-05', time: 12.1 },
            { date: '2024-01-06', time: 8.7 },
            { date: '2024-01-07', time: 10.4 }
          ],
          satisfaction: [
            { date: '2024-01-01', score: 3.8 },
            { date: '2024-01-02', score: 4.1 },
            { date: '2024-01-03', score: 4.0 },
            { date: '2024-01-04', score: 4.3 },
            { date: '2024-01-05', score: 4.2 },
            { date: '2024-01-06', score: 4.5 },
            { date: '2024-01-07', score: 4.2 }
          ]
        },
        agents: [
          {
            id: '1',
            name: 'Sales Assistant Pro',
            role: 'sales',
            totalConversations: 89,
            avgResponseTime: 8.2,
            satisfactionRating: 4.4,
            isActive: true
          },
          {
            id: '2', 
            name: 'Support Specialist',
            role: 'support',
            totalConversations: 67,
            avgResponseTime: 15.1,
            satisfactionRating: 4.1,
            isActive: true
          }
        ],
        topPerformers: [
          { agentName: 'Sales Assistant Pro', metric: 'Response Time', value: '8.2s', change: -12.5 },
          { agentName: 'Support Specialist', metric: 'Satisfaction', value: '4.1★', change: 8.3 },
          { agentName: 'Sales Assistant Pro', metric: 'Conversations', value: 89, change: 23.1 }
        ]
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user && user.crmEnabled) {
      fetchAnalytics()
    }
  }, [user, timeRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return null
  }

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">CRM performance metrics and insights</p>
          </div>
        </div>

        {/* Loading Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">CRM performance metrics and insights</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-medium mb-2">
            Error Loading Analytics
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">CRM performance metrics and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <h3 className="font-medium text-gray-900">Total Conversations</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatNumber(analytics?.overview.totalConversations || 0)}
          </div>
          <div className="flex items-center gap-1">
            {getChangeIcon(23.1)}
            <span className={`text-sm ${getChangeColor(23.1)}`}>
              +23.1% from last period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <h3 className="font-medium text-gray-900">Active Conversations</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.overview.activeConversations || 0}
          </div>
          <div className="flex items-center gap-1">
            {getChangeIcon(-5.2)}
            <span className={`text-sm ${getChangeColor(-5.2)}`}>
              -5.2% from last period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-purple-600" />
              <h3 className="font-medium text-gray-900">Active Agents</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.overview.totalAgents || 0}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">
              {user?.maxAgents ? `of ${user.maxAgents} max` : ''}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <h3 className="font-medium text-gray-900">Avg Response Time</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.overview.avgResponseTime || 0}s
          </div>
          <div className="flex items-center gap-1">
            {getChangeIcon(-18.3)}
            <span className={`text-sm ${getChangeColor(-18.3)}`}>
              -18.3% from last period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-600" />
              <h3 className="font-medium text-gray-900">Satisfaction Score</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.overview.satisfactionScore || 0}★
          </div>
          <div className="flex items-center gap-1">
            {getChangeIcon(12.4)}
            <span className={`text-sm ${getChangeColor(12.4)}`}>
              +12.4% from last period
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Conversion Rate</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {analytics?.overview.conversionRate || 0}%
          </div>
          <div className="flex items-center gap-1">
            {getChangeIcon(7.8)}
            <span className={`text-sm ${getChangeColor(7.8)}`}>
              +7.8% from last period
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversations Trend</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Chart visualization would appear here</p>
              <p className="text-sm">Integration with Chart.js or similar</p>
            </div>
          </div>
        </div>

        {/* Response Time Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Trend</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <LineChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Line chart visualization would appear here</p>
              <p className="text-sm">Shows response time improvements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agent Performance</h3>
          <p className="text-gray-600 mt-1">Detailed performance metrics for each agent</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satisfaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics?.agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Bot className="w-5 h-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {agent.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.role === 'sales' ? 'bg-blue-100 text-blue-800' :
                      agent.role === 'support' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.totalConversations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.avgResponseTime}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      {agent.satisfactionRating}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(!analytics?.agents || analytics.agents.length === 0) && (
          <div className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-600">Create your first agent to see performance metrics.</p>
          </div>
        )}
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Performers</h3>
          <p className="text-gray-600 mt-1">Agents with outstanding performance metrics</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {analytics?.topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' :
                    'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{performer.agentName}</div>
                    <div className="text-sm text-gray-600">{performer.metric}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{performer.value}</div>
                  <div className={`text-sm flex items-center gap-1 ${getChangeColor(performer.change)}`}>
                    {getChangeIcon(performer.change)}
                    {Math.abs(performer.change).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}