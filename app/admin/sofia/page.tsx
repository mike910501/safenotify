'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ConversationSummary {
  id: string
  phone: string
  name: string
  email: string
  specialty: string
  qualificationScore: number
  grade: string
  messageCount: number
  lastActivity: string
}

export default function SofiaAdminDashboard() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

      const response = await fetch('/api/admin/sofia/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Admin role required.')
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setConversations(data.conversations || [])

    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Error loading dashboard data: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading Sofia Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ {error}</div>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Admin
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">🤖</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sofia AI - Dashboard de Leads</h1>
                <p className="text-gray-600">Monitoreo de conversaciones de ventas para TODOS los negocios 🚀</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/admin')}
              className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              ← Volver al Admin Principal
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Conversations</h3>
            <p className="text-2xl font-bold text-blue-600">{conversations.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">A Grade Leads</h3>
            <p className="text-2xl font-bold text-green-600">
              {conversations.filter(c => c.grade === 'A').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">B Grade Leads</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {conversations.filter(c => c.grade === 'B').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
            <p className="text-2xl font-bold text-purple-600">
              {conversations.length > 0 
                ? Math.round(conversations.reduce((sum, c) => sum + c.qualificationScore, 0) / conversations.length)
                : 0
              }
            </p>
          </div>
        </div>

        {/* Conversations Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Conversations ({conversations.length})
            </h3>
          </div>
          
          {conversations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No conversations found. Start chatting with Sofia to see data here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Negocio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensajes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Actividad</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {conversation.name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-500">{conversation.phone}</div>
                          {conversation.email && (
                            <div className="text-sm text-gray-400">{conversation.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversation.specialty || 'No identificada'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversation.qualificationScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          conversation.grade === 'A' ? 'text-green-600 bg-green-100' :
                          conversation.grade === 'B' ? 'text-yellow-600 bg-yellow-100' :
                          'text-red-600 bg-red-100'
                        }`}>
                          {conversation.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conversation.messageCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(conversation.lastActivity).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Debug Info */}
        <div className="mt-8 bg-gray-100 p-4 rounded text-sm">
          <strong>Debug Info:</strong>
          <br />API Status: {error ? 'Error' : 'OK'}
          <br />Conversations loaded: {conversations.length}
          <br />Last fetch: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}