'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { API_URL } from '@/lib/config'
import { ArrowLeft, Bot, Save, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Rápido y económico)' },
  { value: 'gpt-4', label: 'GPT-4 (Mayor calidad)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Más rápido)' }
]

const ROLE_TEMPLATES = {
  assistant: {
    personality: 'Eres un asistente profesional y amable. Siempre mantienes un tono cortés y servicial.',
    business: 'Trabajas para una empresa que brinda servicios profesionales a sus clientes.',
    objectives: 'Tu objetivo es ayudar a los clientes con sus consultas y dirigirlos al departamento correcto cuando sea necesario.'
  },
  sales: {
    personality: 'Eres un consultor de ventas experto y persuasivo. Eres empático y te enfocas en entender las necesidades del cliente.',
    business: 'Vendes productos/servicios de alta calidad que realmente agregan valor a los clientes.',
    objectives: 'Tu objetivo es calificar leads, identificar necesidades y convertir prospectos en clientes satisfechos.'
  },
  support: {
    personality: 'Eres un especialista en soporte técnico paciente y detallado. Siempre buscas resolver los problemas completamente.',
    business: 'Brindas soporte técnico para productos/servicios tecnológicos.',
    objectives: 'Tu objetivo es resolver problemas técnicos, responder dudas y asegurar la satisfacción del cliente.'
  },
  reception: {
    personality: 'Eres una recepcionista profesional y organizada. Eres la primera impresión de la empresa.',
    business: 'Trabajas en la recepción de una empresa profesional.',
    objectives: 'Tu objetivo es recibir clientes, programar citas, derivar llamadas y brindar información general.'
  },
  custom: {
    personality: '',
    business: '',
    objectives: ''
  }
}

export default function CreateAgentPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Check plan limits
  const maxAgents = user?.maxAgents || 1
  const [currentAgentCount, setCurrentAgentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    role: 'assistant',
    personalityPrompt: ROLE_TEMPLATES.assistant.personality,
    businessPrompt: ROLE_TEMPLATES.assistant.business,
    objectivesPrompt: ROLE_TEMPLATES.assistant.objectives,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokensPerMessage: 500,
    isActive: true,
    isDefault: false
  })

  useEffect(() => {
    checkAgentCount()
  }, [])

  const checkAgentCount = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentAgentCount(data.data.agents.length || 0)
      }
    } catch (err) {
      console.error('Error checking agent count:', err)
    }
  }

  const handleInputChange = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRoleChange = (role: string) => {
    const template = ROLE_TEMPLATES[role as keyof typeof ROLE_TEMPLATES]
    setFormData(prev => ({
      ...prev,
      role,
      personalityPrompt: template.personality,
      businessPrompt: template.business,
      objectivesPrompt: template.objectives
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check agent limit
    if (currentAgentCount >= maxAgents) {
      setError(`Has alcanzado el límite de ${maxAgents} agente(s) para tu plan actual. Actualiza tu plan para crear más agentes.`)
      return
    }
    
    if (!formData.name.trim()) {
      setError('El nombre es requerido')
      return
    }
    
    if (!formData.personalityPrompt.trim()) {
      setError('La personalidad es requerida')
      return
    }
    
    if (!formData.businessPrompt.trim()) {
      setError('El contexto del negocio es requerido')
      return
    }
    
    if (!formData.objectivesPrompt.trim()) {
      setError('Los objetivos son requeridos')
      return
    }

    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear agente')
      }
      
      router.push('/dashboard/crm/agents')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Crear Agente de IA</h1>
            <p className="text-gray-600 mt-1">Configura un nuevo agente conversacional</p>
          </div>
        </div>
      </div>

      {/* Plan Limit Warning */}
      {currentAgentCount >= maxAgents && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-yellow-800 font-semibold">Límite de agentes alcanzado</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Has usado {currentAgentCount} de {maxAgents} agentes disponibles en tu plan actual.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/upgrade')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
            >
              Actualizar Plan
            </button>
          </div>
        </div>
      )}

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
                onChange={(e) => handleRoleChange(e.target.value)}
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
              <p className="text-xs text-gray-500 mt-1">
                Define el carácter y tono de comunicación del agente
              </p>
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
              <p className="text-xs text-gray-500 mt-1">
                Información sobre tu negocio para contextualizar al agente
              </p>
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
              <p className="text-xs text-gray-500 mt-1">
                Define qué debe lograr el agente en las conversaciones
              </p>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Configuración de IA
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo de IA
              </label>
              <select
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
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
              <p className="text-xs text-gray-500 mt-1">
                Controla la longitud máxima de las respuestas
              </p>
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
              <p className="text-xs text-gray-500 mt-1">
                Controla qué tan creativo vs preciso será el agente
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || currentAgentCount >= maxAgents}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Creando...' : 'Crear Agente'}
          </button>
        </div>
      </form>
    </div>
  )
}