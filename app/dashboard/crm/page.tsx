'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import ConversationCard from '@/components/crm/ConversationCard'
import { 
  MessageSquare, 
  Users, 
  Bot, 
  Plus, 
  Search,
  Filter,
  Clock,
  User,
  MoreVertical,
  Eye,
  Archive,
  BarChart3,
  Flame,
  Thermometer,
  Snowflake
} from 'lucide-react'

interface Conversation {
  id: string
  sessionId: string
  customerPhone: string
  customerName?: string
  status: 'ACTIVE' | 'PAUSED' | 'WAITING' | 'COMPLETED' | 'ARCHIVED' | 'TRANSFERRED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  currentAgent?: {
    id: string
    name: string
  }
  messageCount: number
  lastMessageAt: string
  requiresAttention: boolean
  tags: string[]
}

interface Agent {
  id: string
  name: string
  role: string
  isActive: boolean
  isDefault: boolean
  totalConversations: number
}

export default function CRMDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [scoreFilter, setScoreFilter] = useState<string>('ALL')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Fetch conversations
      const conversationsResponse = await fetch(`${API_URL}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!conversationsResponse.ok) {
        throw new Error('Error al cargar conversaciones')
      }
      
      const conversationsData = await conversationsResponse.json()
      setConversations(conversationsData.conversations || [])
      
      // Fetch agents
      const agentsResponse = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!agentsResponse.ok) {
        throw new Error('Error al cargar agentes')
      }
      
      const agentsData = await agentsResponse.json()
      setAgents(agentsData.agents || [])
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.customerPhone.includes(searchTerm) || 
                         conv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.sessionId.includes(searchTerm)
    const matchesStatus = statusFilter === 'ALL' || conv.status === statusFilter
    
    // Score filter logic
    let matchesScore = true;
    if (scoreFilter === 'HOT') {
      matchesScore = (conv as any).qualificationScore >= 70;
    } else if (scoreFilter === 'WARM') {
      matchesScore = (conv as any).qualificationScore >= 40 && (conv as any).qualificationScore < 70;
    } else if (scoreFilter === 'COLD') {
      matchesScore = (conv as any).qualificationScore < 40;
    }
    
    return matchesSearch && matchesStatus && matchesScore
  })

  // Get score counts for filter pills
  const getScoreCounts = () => {
    const total = conversations.length;
    const hot = conversations.filter(conv => (conv as any).qualificationScore >= 70).length;
    const warm = conversations.filter(conv => (conv as any).qualificationScore >= 40 && (conv as any).qualificationScore < 70).length;
    const cold = conversations.filter(conv => (conv as any).qualificationScore < 40).length;
    return { total, hot, warm, cold };
  };

  const scoreCounts = getScoreCounts();

  // Handle card actions
  const handleViewConversation = (conversationId: string) => {
    router.push(`/dashboard/crm/conversations/${conversationId}`);
  };

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'ARCHIVED' })
      });
      
      // Refresh conversations
      fetchData();
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh conversations
      fetchData();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100'
      case 'WAITING': return 'text-yellow-600 bg-yellow-100' 
      case 'PAUSED': return 'text-gray-600 bg-gray-100'
      case 'COMPLETED': return 'text-blue-600 bg-blue-100'
      case 'ARCHIVED': return 'text-gray-500 bg-gray-50'
      case 'TRANSFERRED': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'NORMAL': return 'text-blue-600'
      case 'LOW': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="animate-pulse">
            <div className="flex gap-4">
              <div className="flex-1 h-10 bg-gray-200 rounded"></div>
              <div className="w-48 h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        
        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <div className="h-6 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 border-b last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  <div className="w-8 h-4 bg-gray-200 rounded"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="w-16 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-600 mt-1">Gestiona conversaciones y agentes de IA</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => router.push('/dashboard/crm/analytics')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Ver Analytics
          </button>
          <button 
            onClick={() => router.push('/dashboard/crm/agent-settings')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Bot className="w-4 h-4" />
            Configurar Agente IA
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversaciones</p>
              <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-green-600">
                {conversations.filter(c => c.status === 'ACTIVE').length}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Agentes</p>
              <p className="text-2xl font-bold text-purple-600">{agents.length}</p>
            </div>
            <Bot className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Requieren Atención</p>
              <p className="text-2xl font-bold text-orange-600">
                {conversations.filter(c => c.requiresAttention).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* New Header with Filters */}
      <div className="bg-white border-b sticky top-0 z-10 rounded-lg shadow-sm border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              CRM WhatsApp
            </h2>
            
            {/* Filter Pills */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setScoreFilter('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  scoreFilter === 'ALL' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                Todas ({scoreCounts.total})
              </button>
              <button 
                onClick={() => setScoreFilter('HOT')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  scoreFilter === 'HOT' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white border border-gray-200 hover:bg-red-50 text-gray-700'
                }`}
              >
                <Flame className="w-4 h-4" />
                Hot ({scoreCounts.hot})
              </button>
              <button 
                onClick={() => setScoreFilter('WARM')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  scoreFilter === 'WARM' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-white border border-gray-200 hover:bg-yellow-50 text-gray-700'
                }`}
              >
                <Thermometer className="w-4 h-4" />
                Warm ({scoreCounts.warm})
              </button>
              <button 
                onClick={() => setScoreFilter('COLD')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  scoreFilter === 'COLD' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-gray-200 hover:bg-blue-50 text-gray-700'
                }`}
              >
                <Snowflake className="w-4 h-4" />
                Cold ({scoreCounts.cold})
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o mensaje..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                  focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="WAITING">Esperando</option>
                <option value="PAUSED">Pausado</option>
                <option value="COMPLETED">Completado</option>
                <option value="TRANSFERRED">Transferido</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Conversaciones Cards */}
      <div className="min-h-screen bg-gray-50">
        {filteredConversations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {filteredConversations.map((conversation, index) => (
              <div 
                key={conversation.id}
                className="animate-slideIn"
                style={{ 
                  animationDelay: `${Math.min(index * 0.05, 0.5)}s`,
                  animationFillMode: 'both'
                }}
              >
                <ConversationCard
                  conversation={{
                    ...conversation,
                    customerLead: {
                      name: conversation.customerName,
                      phone: conversation.customerPhone,
                      email: ''
                    },
                    lastActivity: conversation.lastMessageAt || conversation.lastActivity,
                    qualificationScore: Math.floor(Math.random() * 100), // Placeholder until real data
                    unreadCount: conversation.requiresAttention ? Math.floor(Math.random() * 5) + 1 : 0,
                    lastMessage: 'Último mensaje de la conversación...',
                    isTyping: false
                  }}
                  onView={handleViewConversation}
                  onArchive={handleArchiveConversation}
                  onDelete={handleDeleteConversation}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || statusFilter !== 'ALL' || scoreFilter !== 'ALL'
                  ? 'No se encontraron conversaciones' 
                  : 'No hay conversaciones'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'ALL' || scoreFilter !== 'ALL'
                  ? 'No se encontraron conversaciones con los filtros aplicados. Intenta ajustar tus criterios de búsqueda.' 
                  : 'Las conversaciones aparecerán aquí cuando los clientes escriban a tus números de WhatsApp configurados.'}
              </p>
              {!(searchTerm || statusFilter !== 'ALL' || scoreFilter !== 'ALL') && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/dashboard/crm/agent-settings')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Configurar Agente IA
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => router.push('/dashboard/crm/agent-settings')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center hover:scale-105 transform"
        title="Configurar Agente IA"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}