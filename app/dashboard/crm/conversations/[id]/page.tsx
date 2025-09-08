'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { API_URL } from '@/lib/config'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Phone,
  Clock,
  MoreVertical,
  Archive,
  UserPlus,
  Settings,
  Loader2
} from 'lucide-react'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

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
  customerLead?: {
    name?: string
    email?: string
    company?: string
    customerType?: string
  }
  messages: Message[]
  messageCount: number
  lastMessageAt: string
  requiresAttention: boolean
  tags: string[]
  createdAt: string
}

export default function ConversationDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const conversationId = params?.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    if (conversationId) {
      fetchConversation()
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversation = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error('Error al cargar conversación')
      }
      
      const data = await response.json()
      setConversation(data.data.conversation)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !conversation) return

    try {
      setSending(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          role: 'user'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al enviar mensaje')
      }
      
      setNewMessage('')
      fetchConversation() // Refresh to get latest messages
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const updateConversationStatus = async (status: string) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        throw new Error('Error al actualizar conversación')
      }
      
      fetchConversation()
      setShowActions(false)
      
    } catch (err: any) {
      setError(err.message)
    }
  }

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600 mt-2">{error || 'Conversación no encontrada'}</p>
        <div className="flex gap-4 mt-4">
          <button 
            onClick={fetchConversation}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
          <button 
            onClick={() => router.push('/dashboard/crm')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Volver al CRM
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard/crm')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {conversation.customerLead?.name || conversation.customerName || 'Cliente'}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" />
                  <span>{conversation.customerPhone}</span>
                  {conversation.customerLead?.email && (
                    <>
                      <span>•</span>
                      <span>{conversation.customerLead.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(conversation.status)}`}>
                {conversation.status}
              </span>
              <span className={`text-sm font-medium ${getPriorityColor(conversation.priority)}`}>
                {conversation.priority}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] z-10">
                  <button
                    onClick={() => updateConversationStatus('TRANSFERRED')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Transferir a humano
                  </button>
                  <button
                    onClick={() => updateConversationStatus('ARCHIVED')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archivar
                  </button>
                  <button
                    onClick={() => updateConversationStatus('PAUSED')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Pausar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Info */}
        {conversation.currentAgent && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Bot className="w-4 h-4 text-purple-600" />
              <span>Agente activo: <strong>{conversation.currentAgent.name}</strong></span>
            </div>
            <div className="text-xs text-gray-500">
              {conversation.messageCount} mensajes • Última actividad: {new Date(conversation.lastMessageAt).toLocaleDateString()} {new Date(conversation.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
        <div className="space-y-4">
          {conversation.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              
              {message.role === 'assistant' && (
                <div className="ml-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-purple-600" />
                  </div>
                </div>
              )}
              
              {message.role === 'user' && (
                <div className="mr-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="w-3 h-3 text-gray-600" />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={sendMessage} className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={sending || conversation.status === 'ARCHIVED'}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim() || conversation.status === 'ARCHIVED'}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
        
        {conversation.status === 'ARCHIVED' && (
          <p className="text-sm text-gray-500 mt-2">
            Esta conversación está archivada. No se pueden enviar nuevos mensajes.
          </p>
        )}
      </div>
    </div>
  )
}