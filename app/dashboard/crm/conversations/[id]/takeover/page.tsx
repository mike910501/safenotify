'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { API_URL } from '@/lib/config'
import { useRouter, useParams } from 'next/navigation'
import { 
  User, 
  Bot, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Lightbulb,
  RefreshCw,
  PlayCircle,
  StopCircle,
  AlertCircle
} from 'lucide-react'

interface Suggestion {
  type: 'response' | 'action' | 'escalation'
  title: string
  content: string
  confidence: number
}

interface TakeoverStatus {
  isHumanTakeover: boolean
  collaborationMode: string
  takeoverAt?: string
  takeoverReason?: string
  escalationLevel: number
  lastAiSuggestion?: string
  aiSuggestionsCount: number
}

interface TakeoverLog {
  id: string
  eventType: string
  fromMode: string
  toMode: string
  reason?: string
  createdAt: string
  user: {
    name: string
    email: string
  }
}

export default function ConversationTakeoverPanel() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [status, setStatus] = useState<TakeoverStatus | null>(null)
  const [history, setHistory] = useState<TakeoverLog[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [takingOver, setTakingOver] = useState(false)
  const [ending, setEnding] = useState(false)
  const [requestingHelp, setRequestingHelp] = useState(false)
  
  const [takeoverReason, setTakeoverReason] = useState('')
  const [currentMessage, setCurrentMessage] = useState('')

  // Check CRM access
  useEffect(() => {
    if (user && !user.crmEnabled) {
      router.push('/dashboard')
      return
    }
  }, [user, router])

  // Load takeover status
  const loadTakeoverStatus = async () => {
    if (!conversationId) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/takeover/${conversationId}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data.data.status)
        setHistory(data.data.history)
      }
    } catch (error) {
      console.error('Error loading takeover status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate AI suggestions
  const generateSuggestions = async () => {
    if (!conversationId || !currentMessage) return

    setRequestingHelp(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/takeover/${conversationId}/suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentMessage })
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.data.suggestions)
        await loadTakeoverStatus() // Refresh status
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setRequestingHelp(false)
    }
  }

  // Start human takeover
  const startTakeover = async () => {
    if (!takeoverReason.trim()) return

    setTakingOver(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/takeover/${conversationId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reason: takeoverReason,
          customerMessage: currentMessage
        })
      })

      if (response.ok) {
        await loadTakeoverStatus()
        setTakeoverReason('')
      }
    } catch (error) {
      console.error('Error starting takeover:', error)
    } finally {
      setTakingOver(false)
    }
  }

  // End human takeover
  const endTakeover = async () => {
    setEnding(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/takeover/${conversationId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ returnToMode: 'ai_only' })
      })

      if (response.ok) {
        await loadTakeoverStatus()
      }
    } catch (error) {
      console.error('Error ending takeover:', error)
    } finally {
      setEnding(false)
    }
  }

  useEffect(() => {
    loadTakeoverStatus()
  }, [conversationId])

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'ai_only': return 'bg-blue-100 text-blue-800'
      case 'human_only': return 'bg-green-100 text-green-800'
      case 'collaboration': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEscalationColor = (level: number) => {
    switch (level) {
      case 0: return 'text-green-600'
      case 1: return 'text-yellow-600'
      case 2: return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Human Takeover Panel</h1>
              <p className="text-gray-600 mt-1">Manage AI-to-Human conversation handoff</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getModeColor(status?.collaborationMode || 'ai_only')}`}>
                {status?.collaborationMode === 'ai_only' && <><Bot className="w-4 h-4 inline mr-1" />AI Mode</>}
                {status?.collaborationMode === 'human_only' && <><User className="w-4 h-4 inline mr-1" />Human Mode</>}
                {status?.collaborationMode === 'collaboration' && <><MessageSquare className="w-4 h-4 inline mr-1" />Collaborative</>}
              </div>
              
              {status?.escalationLevel > 0 && (
                <div className={`flex items-center gap-1 font-medium ${getEscalationColor(status.escalationLevel)}`}>
                  <AlertTriangle className="w-4 h-4" />
                  Escalation Level {status.escalationLevel}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Takeover Control */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Takeover Control</h2>
            
            {!status?.isHumanTakeover ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for takeover
                  </label>
                  <textarea
                    value={takeoverReason}
                    onChange={(e) => setTakeoverReason(e.target.value)}
                    placeholder="e.g., Customer needs human assistance, complex issue, escalation requested..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
                
                <button
                  onClick={startTakeover}
                  disabled={!takeoverReason.trim() || takingOver}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {takingOver ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  {takingOver ? 'Starting Takeover...' : 'Start Human Takeover'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Human takeover active</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Started: {status.takeoverAt ? new Date(status.takeoverAt).toLocaleString() : 'Unknown'}
                  </p>
                  {status.takeoverReason && (
                    <p className="text-sm text-green-700 mt-1">
                      Reason: {status.takeoverReason}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={endTakeover}
                  disabled={ending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {ending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <StopCircle className="w-4 h-4" />
                  )}
                  {ending ? 'Ending Takeover...' : 'Return to AI Control'}
                </button>
              </div>
            )}
          </div>

          {/* AI Suggestions Panel */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Assistant</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current customer message
                </label>
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Enter the customer's message to get AI suggestions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                />
              </div>
              
              <button
                onClick={generateSuggestions}
                disabled={!currentMessage.trim() || requestingHelp}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {requestingHelp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                {requestingHelp ? 'Getting Help...' : 'Get AI Suggestions'}
              </button>
              
              {suggestions.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h3 className="text-sm font-medium text-gray-700">AI Suggestions:</h3>
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {suggestion.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {suggestion.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{suggestion.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Log */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Takeover History</h2>
          
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No takeover events yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {log.eventType === 'takeover_started' && <PlayCircle className="w-5 h-5 text-green-600" />}
                    {log.eventType === 'takeover_ended' && <StopCircle className="w-5 h-5 text-blue-600" />}
                    {log.eventType === 'takeover_requested' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                    {log.eventType === 'ai_suggestion' && <Lightbulb className="w-5 h-5 text-purple-600" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{log.user.name}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="capitalize">{log.eventType.replace('_', ' ')}</span>
                      <span className="text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <span className={`px-2 py-1 rounded ${getModeColor(log.fromMode)}`}>
                        {log.fromMode}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                      <span className={`px-2 py-1 rounded ${getModeColor(log.toMode)}`}>
                        {log.toMode}
                      </span>
                    </div>
                    
                    {log.reason && (
                      <p className="text-sm text-gray-700 mt-2">{log.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}