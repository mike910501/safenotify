'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { API_URL } from '@/lib/config'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
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
  RefreshCw,
  Zap,
  DollarSign,
  Brain,
  Cpu,
  Eye,
  Activity,
  Gauge
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { formatNumber, formatCurrency, getModelConfig } from '@/lib/model-pricing'

interface ModelMetric {
  name: string
  totalTokens: number
  usageCount: number
  estimatedCost: number
  usagePercentage: string
  avgTokensPerUse: number
  costPerUse: number
  lastUsed: string
}

interface AnalyticsData {
  overview: {
    totalConversations: number
    activeConversations: number
    totalAgents: number
    avgResponseTime: number
    satisfactionScore: number
    conversionRate: number
    totalMessages: number
    totalLeads: number
    convertedLeads: number
    totalTokens: number
    totalEstimatedCost: number
    avgCostPerConversation: number
    avgTokensPerConversation: number
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
  modelMetrics: ModelMetric[]
  modelTimelineTrends: Array<{ date: string; [key: string]: any }>
  costBreakdown: {
    totalCost: number
    mostExpensiveModel: string | null
    mostUsedModel: string | null
    modelCount: number
  }
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
    // Solo redirigir si estamos seguros de que el usuario no tiene CRM
    if (user && user.crmEnabled === false) {
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
          conversionRate: 34.7,
          totalMessages: 1250,
          totalLeads: 87,
          convertedLeads: 30,
          totalTokens: 125000,
          totalEstimatedCost: 2.45,
          avgCostPerConversation: 0.016,
          avgTokensPerConversation: 800
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
        ],
        modelMetrics: [
          {
            name: 'gpt-5-mini',
            totalTokens: 95000,
            usageCount: 118,
            estimatedCost: 0.238,
            usagePercentage: '64',
            avgTokensPerUse: 805,
            costPerUse: 0.00202,
            lastUsed: '2025-01-09'
          },
          {
            name: 'gpt-5-nano',
            totalTokens: 42000,
            usageCount: 67,
            estimatedCost: 0.019,
            usagePercentage: '28',
            avgTokensPerUse: 627,
            costPerUse: 0.00028,
            lastUsed: '2025-01-09'
          },
          {
            name: 'gpt-5',
            totalTokens: 18000,
            usageCount: 12,
            estimatedCost: 0.145,
            usagePercentage: '8',
            avgTokensPerUse: 1500,
            costPerUse: 0.01208,
            lastUsed: '2025-01-08'
          }
        ],
        modelTimelineTrends: [
          { date: '2024-01-01', total: 15000 },
          { date: '2024-01-02', total: 18000 },
          { date: '2024-01-03', total: 16500 },
          { date: '2024-01-04', total: 20000 },
          { date: '2024-01-05', total: 17500 },
          { date: '2024-01-06', total: 19000 },
          { date: '2024-01-07', total: 19000 }
        ],
        costBreakdown: {
          totalCost: 0.402,
          mostExpensiveModel: 'gpt-5',
          mostUsedModel: 'gpt-5-mini',
          modelCount: 3
        }
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header con glassmorphism */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              CRM Analytics
            </h1>
            <p className="text-white/60 mt-1">Métricas avanzadas de IA y conversaciones</p>
          </div>
          
          {/* Time Range Filter */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-1 inline-flex gap-1">
              {[
                { value: '24h', label: '24h' },
                { value: '7d', label: '7 días' },
                { value: '30d', label: '30 días' },
                { value: '90d', label: '90 días' },
                { value: 'all', label: 'Todo' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${
                    timeRange === option.value
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg text-white rounded-xl hover:bg-white/20 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg text-white rounded-xl hover:bg-white/20 transition-all">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Cards de Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Tokens */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-green-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Tokens Consumidos</h3>
                  <p className="text-white/60 text-sm">{timeRange}</p>
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {formatNumber(analytics?.overview.totalTokens || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-green-400 text-sm font-medium">
                {formatCurrency(analytics?.overview.totalEstimatedCost || 0)}
              </div>
              <span className="text-white/40 text-xs">costo estimado</span>
            </div>
          </div>

          {/* Conversaciones */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Conversaciones</h3>
                  <p className="text-white/60 text-sm">Total</p>
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {analytics?.overview.totalConversations || 0}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-blue-400 text-sm font-medium">
                {analytics?.overview.activeConversations || 0} activas
              </div>
            </div>
          </div>

          {/* Costo por Conversación */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-yellow-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Costo/Chat</h3>
                  <p className="text-white/60 text-sm">Promedio IA</p>
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {formatCurrency(analytics?.overview.avgCostPerConversation || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-yellow-400 text-sm font-medium">
                {formatNumber(analytics?.overview.avgTokensPerConversation || 0)} tokens/chat
              </div>
            </div>
          </div>

          {/* Eficiencia */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Conversión</h3>
                  <p className="text-white/60 text-sm">Eficiencia</p>
                </div>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {analytics?.overview.conversionRate || 0}%
            </div>
            <div className="flex items-center gap-2">
              <div className="text-purple-400 text-sm font-medium">
                {analytics?.overview.convertedLeads || 0}/{analytics?.overview.totalLeads || 0} leads
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Análisis por Modelo */}
        {analytics?.modelMetrics && analytics.modelMetrics.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Análisis por Modelo de IA</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analytics.modelMetrics.map((model) => {
                const config = getModelConfig(model.name);
                return (
                  <div key={model.name} className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: config.color + '20', border: `2px solid ${config.color}40` }}
                        >
                          <Brain className="w-6 h-6" style={{ color: config.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{model.name}</h3>
                          <p className="text-white/60 text-sm">{config.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-xs font-medium">
                          {model.usagePercentage}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Tokens</p>
                        <p className="text-white text-xl font-bold">{formatNumber(model.totalTokens)}</p>
                        <p className="text-white/40 text-xs">{model.usageCount} usos</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Costo</p>
                        <p className="text-white text-xl font-bold">{formatCurrency(model.estimatedCost)}</p>
                        <p className="text-white/40 text-xs">{formatCurrency(model.costPerUse)}/uso</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Promedio/uso</span>
                        <span className="text-white font-medium">{formatNumber(model.avgTokensPerUse)} tokens</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gráficas de Tendencias */}
        {analytics?.modelTimelineTrends && analytics.modelTimelineTrends.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-green-500" />
                Evolución de Uso de Tokens
              </h3>
              <div className="text-white/60 text-sm">
                {timeRange} • Total: {formatNumber(analytics.overview.totalTokens)}
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.modelTimelineTrends}>
                  <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                    tickFormatter={formatNumber}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '12px',
                      color: 'white'
                    }}
                    formatter={(value: any) => [formatNumber(value), 'Tokens']}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('es', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#tokenGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Distribución de Costos por Modelo */}
        {analytics?.modelMetrics && analytics.modelMetrics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfica de Distribución */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Gauge className="w-6 h-6 text-blue-500" />
                Distribución de Costos
              </h3>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.modelMetrics}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="estimatedCost"
                    >
                      {analytics.modelMetrics.map((entry, index) => {
                        const config = getModelConfig(entry.name);
                        return (
                          <Cell key={`cell-${index}`} fill={config.color} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: 'white'
                      }}
                      formatter={(value: any) => [formatCurrency(value), 'Costo']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda */}
              <div className="space-y-2">
                {analytics.modelMetrics.map((model) => {
                  const config = getModelConfig(model.name);
                  return (
                    <div key={model.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-white/80">{model.name}</span>
                      </div>
                      <span className="text-white font-medium">{formatCurrency(model.estimatedCost)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparación de Eficiencia */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-500" />
                Eficiencia por Modelo
              </h3>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.modelMetrics} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      type="number" 
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name"
                      width={100}
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: 'white'
                      }}
                      formatter={(value: any) => [formatCurrency(value), 'Costo por uso']}
                    />
                    <Bar 
                      dataKey="costPerUse"
                      fill="url(#costGradient)"
                      radius={[0, 8, 8, 0]}
                    />
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#EC4899" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {/* Resumen Ejecutivo y Tabla de Agentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resumen Ejecutivo */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              Resumen Ejecutivo
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Costo Total */}
              <div className="text-center">
                <p className="text-white/60 text-sm mb-2">Costo Total ({timeRange})</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {formatCurrency(analytics?.overview.totalEstimatedCost || 0)}
                </p>
              </div>
              
              {/* Proyección Mensual */}
              <div className="text-center">
                <p className="text-white/60 text-sm mb-2">Proyección Mensual</p>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  {formatCurrency((analytics?.overview.totalEstimatedCost || 0) * (30 / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1)))}
                </p>
                <p className="text-white/40 text-xs mt-1">Basado en tendencia actual</p>
              </div>
              
              {/* Información adicional */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Modelo más usado</span>
                  <span className="text-white">{analytics?.costBreakdown?.mostUsedModel || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Total de modelos</span>
                  <span className="text-white">{analytics?.costBreakdown?.modelCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Agentes activos</span>
                  <span className="text-white">{analytics?.overview.totalAgents || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Agentes */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Bot className="w-6 h-6 text-green-500" />
              Performance de Agentes
            </h3>
            
            <div className="space-y-4">
              {analytics?.agents && analytics.agents.length > 0 ? (
                analytics.agents.map((agent) => (
                  <div key={agent.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{agent.name}</h4>
                          <p className="text-white/60 text-sm capitalize">{agent.role}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        agent.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {agent.isActive ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Conversaciones</p>
                        <p className="text-white font-medium">{agent.totalConversations}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Respuesta</p>
                        <p className="text-white font-medium">{agent.avgResponseTime}s</p>
                      </div>
                      <div>
                        <p className="text-white/60">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-white font-medium">{agent.satisfactionRating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 mx-auto text-white/40 mb-4" />
                  <h3 className="text-white font-medium mb-2">No hay agentes configurados</h3>
                  <p className="text-white/60 text-sm">Configura tu primer agente para ver métricas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}