'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { API_URL } from '@/lib/config'
import { ArrowLeft, Bot, Save, Loader2, Trash2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

interface AgentFormData {
  name: string
  description: string
  role: string
  personalityPrompt: string
  businessPrompt: string
  objectivesPrompt: string
  model: string
  temperature: number
  maxTokensPerMessage: number
  // ✅ Nuevos campos GPT-5
  reasoningEffort?: string
  verbosity?: string
  isActive: boolean
  isDefault: boolean
}

const ROLES = [
  { value: 'assistant', label: 'Asistente General' },
  { value: 'sales', label: 'Ventas' },
  { value: 'support', label: 'Soporte' },
  { value: 'reception', label: 'Recepción' },
  { value: 'custom', label: 'Personalizado' }
]

const MODELS = [
  { 
    value: 'gpt-5-mini', 
    label: 'GPT-5 Mini', 
    description: '💰 Súper balance entre costo y calidad. Responde natural, con buena coherencia y memoria. Ideal para chatbots de soporte y ventas que manejan mucho volumen.',
    badge: 'Recomendado'
  },
  { 
    value: 'gpt-5-nano', 
    label: 'GPT-5 Nano', 
    description: 'Ultra barato. Perfecto para chatbots de primer contacto o respuestas rápidas frecuentes. Sacrifica un poco de creatividad, pero rinde muy bien en respuestas cortas.',
    badge: 'Económico'
  },
  { 
    value: 'gpt-5', 
    label: 'GPT-5 Completo', 
    description: 'Más potente que GPT-4, a menor costo. Úsalo si tu chatbot debe manejar preguntas complejas o dar asesoría avanzada (ej: banca, salud, legal). Recomendado como "cerebro premium" y combinar con 5-mini para la base.',
    badge: 'Premium'
  },
  { 
    value: 'gpt-4o-mini', 
    label: 'GPT-4o Mini', 
    description: 'Todavía muy útil si buscas un modelo estable, barato y probado. Buen plan B si quieres diversificar y no depender solo de la serie GPT-5.',
    badge: 'Estable'
  }
]

export default function EditAgentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const agentId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    role: 'assistant',
    personalityPrompt: '',
    businessPrompt: '',
    objectivesPrompt: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokensPerMessage: 500,
    isActive: true,
    isDefault: false
  })

  const [originalData, setOriginalData] = useState<AgentFormData | null>(null)

  useEffect(() => {
    if (agentId) {
      fetchAgent()
    }
  }, [agentId])

  const fetchAgent = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        throw new Error('Error al cargar agente')
      }
      
      const data = await response.json()
      const agent = data.data.agent
      
      const agentData: AgentFormData = {
        name: agent.name,
        description: agent.description || '',
        role: agent.role,
        personalityPrompt: agent.personalityPrompt,
        businessPrompt: agent.businessPrompt,
        objectivesPrompt: agent.objectivesPrompt,
        model: agent.model,
        temperature: agent.temperature,
        maxTokensPerMessage: agent.maxTokensPerMessage,
        isActive: agent.isActive,
        isDefault: agent.isDefault
      }
      
      setFormData(agentData)
      setOriginalData(agentData)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const hasChanges = () => {
    if (!originalData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('El nombre es requerido')
      return
    }

    try {
      setSaving(true)
      setError('')
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar agente')
      }
      
      router.push('/dashboard/crm/agents')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este agente? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setDeleting(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar agente')
      }
      
      router.push('/dashboard/crm/agents')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !formData.name) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={fetchAgent}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Agente</h1>
            <p className="text-gray-600 mt-1">Modifica la configuración del agente</p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary-600" />
            Información Básica
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Agente *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: DrBot, Asistente de Ventas, etc."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Breve descripción del agente"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol *
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Agente activo</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Agente predeterminado</span>
              </label>
            </div>
          </div>
        </div>

        {/* Personality Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Configuración de Personalidad
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personalidad del Agente *
              </label>
              <textarea
                value={formData.personalityPrompt}
                onChange={(e) => handleInputChange('personalityPrompt', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe cómo debe comportarse el agente, su tono y personalidad..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contexto del Negocio *
              </label>
              <textarea
                value={formData.businessPrompt}
                onChange={(e) => handleInputChange('businessPrompt', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe tu negocio, productos/servicios, industria..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objetivos y Metas *
              </label>
              <textarea
                value={formData.objectivesPrompt}
                onChange={(e) => handleInputChange('objectivesPrompt', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="¿Qué objetivos debe cumplir este agente? ¿Cuáles son sus metas principales?"
                required
              />
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Configuración de IA
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo de IA
              </label>
              <div className="space-y-3">
                {MODELS.map((model) => (
                  <div
                    key={model.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      formData.model === model.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('model', model.value)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="model"
                            value={model.value}
                            checked={formData.model === model.value}
                            onChange={() => handleInputChange('model', model.value)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span className="font-medium text-gray-900">{model.label}</span>
                          {model.badge && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              model.badge === 'Recomendado' ? 'bg-green-100 text-green-800' :
                              model.badge === 'Económico' ? 'bg-blue-100 text-blue-800' :
                              model.badge === 'Premium' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {model.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 ml-6">
                          {model.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo tokens por mensaje
              </label>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={formData.maxTokensPerMessage}
                onChange={(e) => handleInputChange('maxTokensPerMessage', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperatura: {formData.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Más preciso (0)</span>
                <span>Más creativo (2)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={saving || !hasChanges()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}