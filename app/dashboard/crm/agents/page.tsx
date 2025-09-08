'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  Bot, 
  Plus, 
  Search,
  Settings,
  Play,
  Pause,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  Activity,
  DollarSign,
  Star
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description?: string
  role: string
  isActive: boolean
  isDefault: boolean
  personalityPrompt: string
  businessPrompt: string
  objectivesPrompt: string
  model: string
  temperature: number
  totalConversations: number
  totalMessages: number
  avgResponseTime: number
  satisfactionRating: number
  totalTokensUsed: number
  estimatedCost: number
  createdAt: string
  updatedAt: string
}

export default function AgentsPage() {
  const { user } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error('Error al cargar agentes')
      }
      
      const data = await response.json()
      setAgents(data.data.agents || [])
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAgentStatus = async (agentId: string) => {
    try {
      const token = localStorage.getItem('token')
      const agent = agents.find(a => a.id === agentId)
      
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !agent?.isActive })
      })
      
      if (!response.ok) {
        throw new Error('Error al actualizar agente')
      }
      
      fetchAgents() // Refresh data
      
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este agente?')) return
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar agente')
      }
      
      fetchAgents() // Refresh data
      
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'sales': return 'text-green-600 bg-green-100'
      case 'support': return 'text-blue-600 bg-blue-100'
      case 'reception': return 'text-purple-600 bg-purple-100'
      case 'assistant': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-56"></div>
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
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Search Skeleton */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        
        {/* Agents Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="animate-pulse">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="text-center">
                        <div className="h-6 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-8"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50">
                <div className="animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
          onClick={fetchAgents}
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
          <h1 className="text-3xl font-bold text-gray-900">Agentes de IA</h1>
          <p className="text-gray-600 mt-1">Gestiona y configura tus agentes conversacionales</p>
        </div>
        
        <button 
          onClick={() => window.location.href = '/dashboard/crm/agents/create'}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Agente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Agentes</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
            <Bot className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {agents.filter(a => a.isActive).length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversaciones</p>
              <p className="text-2xl font-bold text-blue-600">
                {agents.reduce((sum, a) => sum + a.totalConversations, 0)}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Costo Total</p>
              <p className="text-2xl font-bold text-purple-600">
                ${agents.reduce((sum, a) => sum + a.estimatedCost, 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar agentes por nombre o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Agent Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${agent.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Bot className={`w-6 h-6 ${agent.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {agent.name}
                      {agent.isDefault && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{agent.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAgentStatus(agent.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      agent.isActive 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {agent.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="relative">
                    <button 
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {selectedAgent === agent.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                        <button
                          onClick={() => window.location.href = `/dashboard/crm/agents/${agent.id}/edit`}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Role Badge */}
              <div className="mt-3">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(agent.role)}`}>
                  {agent.role}
                </span>
              </div>
            </div>

            {/* Agent Stats */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{agent.totalConversations}</p>
                  <p className="text-xs text-gray-500">Conversaciones</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{agent.totalMessages}</p>
                  <p className="text-xs text-gray-500">Mensajes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{agent.avgResponseTime.toFixed(1)}s</p>
                  <p className="text-xs text-gray-500">Tiempo Resp.</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{agent.satisfactionRating.toFixed(1)}/5</p>
                  <p className="text-xs text-gray-500">Satisfacción</p>
                </div>
              </div>
              
              {/* Model & Cost Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Modelo:</span>
                  <span className="font-medium text-gray-900">{agent.model}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-500">Temperatura:</span>
                  <span className="font-medium text-gray-900">{agent.temperature}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-500">Costo estimado:</span>
                  <span className="font-medium text-gray-900">${agent.estimatedCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Agent Status */}
            <div className={`px-6 py-3 ${agent.isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${agent.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                  {agent.isActive ? 'Activo' : 'Pausado'}
                </span>
                <span className="text-xs text-gray-500">
                  Actualizado {new Date(agent.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No se encontraron agentes' : 'No tienes agentes creados'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Intenta con diferentes términos de búsqueda.' 
              : 'Crea tu primer agente de IA para comenzar a automatizar conversaciones.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => window.location.href = '/dashboard/crm/agents/create'}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear Primer Agente
            </button>
          )}
        </div>
      )}
    </div>
  )
}