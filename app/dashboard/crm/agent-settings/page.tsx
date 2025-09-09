'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { 
  Bot, 
  Save, 
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Target,
  Briefcase,
  Settings,
  AlertCircle
} from 'lucide-react'

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

interface Agent {
  id: string
  name: string
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
}

export default function AgentSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchAgent()
  }, [])

  const fetchAgent = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Error al cargar agente')
      
      const data = await response.json()
      const agents = data.agents || []
      
      // Obtener el primer agente activo
      const activeAgent = agents.find((a: Agent) => a.isActive) || agents[0]
      
      if (activeAgent) {
        setAgent(activeAgent)
      } else {
        setError('No se encontró ningún agente configurado')
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveAgent = async () => {
    if (!agent) return
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const token = localStorage.getItem('token')
      
      const response = await fetch(`${API_URL}/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalityPrompt: agent.personalityPrompt,
          businessPrompt: agent.businessPrompt,
          objectivesPrompt: agent.objectivesPrompt,
          model: agent.model,
          temperature: agent.temperature,
          maxTokensPerMessage: agent.maxTokensPerMessage
        })
      })
      
      if (!response.ok) {
        throw new Error('Error al guardar agente')
      }
      
      setSuccess('✅ Agente actualizado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600 mt-2">{error || 'No se pudo cargar el agente'}</p>
        <button 
          onClick={() => router.push('/dashboard/crm')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Volver al CRM
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/crm')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-8 h-8 text-purple-600" />
              Configuración del Agente IA
            </h1>
            <p className="text-gray-600 mt-1">
              Personaliza cómo responde tu asistente virtual
            </p>
          </div>
        </div>
        
        <button
          onClick={saveAgent}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Personality Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Personalidad</h2>
            <p className="text-sm text-gray-600">Define el tono y estilo de comunicación</p>
          </div>
        </div>
        
        <textarea
          value={agent.personalityPrompt}
          onChange={(e) => setAgent({ ...agent, personalityPrompt: e.target.value })}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          placeholder="Ej: Eres un asistente amigable y profesional. Hablas de forma clara y empática..."
        />
        
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>💡 Tip:</strong> Define cómo debe comunicarse tu agente. Incluye tono, 
            nivel de formalidad, uso de emojis, y características de personalidad.
          </p>
        </div>
      </div>

      {/* Business Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Información del Negocio</h2>
            <p className="text-sm text-gray-600">Datos sobre tu empresa, productos y servicios</p>
          </div>
        </div>
        
        <textarea
          value={agent.businessPrompt}
          onChange={(e) => setAgent({ ...agent, businessPrompt: e.target.value })}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          placeholder="Ej: Trabajas para [Empresa]. Ofrecemos [productos/servicios]. Nuestros precios son..."
        />
        
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>💡 Tip:</strong> Incluye nombre de la empresa, productos/servicios que ofreces, 
            precios, horarios de atención, ubicación, y cualquier información relevante del negocio.
          </p>
        </div>
      </div>

      {/* Objectives Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Objetivos</h2>
            <p className="text-sm text-gray-600">¿Qué debe lograr el agente en cada conversación?</p>
          </div>
        </div>
        
        <textarea
          value={agent.objectivesPrompt}
          onChange={(e) => setAgent({ ...agent, objectivesPrompt: e.target.value })}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
          placeholder="Ej: Tu objetivo es calificar leads, agendar citas, responder preguntas frecuentes..."
        />
        
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>💡 Tip:</strong> Define objetivos claros como: generar leads, agendar citas, 
            resolver dudas, capturar datos de contacto, o cerrar ventas.
          </p>
        </div>
      </div>

      {/* Agent Personality */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Personalidad del Agente</h2>
            <p className="text-sm text-gray-600">Define cómo se comporta y comunica tu agente</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personalidad y Tono *
          </label>
          <textarea
            value={agent.personalityPrompt}
            onChange={(e) => setAgent({ ...agent, personalityPrompt: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="Describe cómo debe comportarse el agente, su tono y personalidad..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Define el carácter y tono de comunicación del agente
          </p>
        </div>
      </div>

      {/* Business Context */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Briefcase className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Información del Negocio</h2>
            <p className="text-sm text-gray-600">Contexto sobre tu empresa y servicios</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contexto del Negocio *
          </label>
          <textarea
            value={agent.businessPrompt}
            onChange={(e) => setAgent({ ...agent, businessPrompt: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="Describe tu negocio, productos/servicios, industria..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Información sobre tu negocio para contextualizar al agente
          </p>
        </div>
      </div>

      {/* Objectives */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Objetivos y Metas</h2>
            <p className="text-sm text-gray-600">Define qué debe lograr tu agente</p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Objetivos y Metas *
          </label>
          <textarea
            value={agent.objectivesPrompt}
            onChange={(e) => setAgent({ ...agent, objectivesPrompt: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            placeholder="¿Qué objetivos debe cumplir este agente? ¿Cuáles son sus metas principales?"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Define qué debe lograr el agente en las conversaciones
          </p>
        </div>
      </div>

      {/* Advanced AI Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configuración de IA</h2>
            <p className="text-sm text-gray-600">Modelo y parámetros técnicos</p>
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo de IA
          </label>
          <div className="space-y-3">
            {MODELS.map((model) => (
              <div
                key={model.value}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  agent.model === model.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setAgent({ ...agent, model: model.value })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="model"
                        value={model.value}
                        checked={agent.model === model.value}
                        onChange={() => setAgent({ ...agent, model: model.value })}
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tokens máximos
            </label>
            <input
              type="number"
              min="50"
              max="2000"
              value={agent.maxTokensPerMessage}
              onChange={(e) => setAgent({ ...agent, maxTokensPerMessage: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Longitud máxima de respuesta
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperatura: {agent.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={agent.temperature}
              onChange={(e) => setAgent({ ...agent, temperature: parseFloat(e.target.value) })}
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
          
          {agent.model?.startsWith('gpt-5') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Esfuerzo de Razonamiento
              </label>
              <select
                value={agent.reasoningEffort || 'medium'}
                onChange={(e) => setAgent({ ...agent, reasoningEffort: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              >
                <option value="minimal">Mínimo - Respuestas rápidas</option>
                <option value="low">Bajo - Balance velocidad/calidad</option>
                <option value="medium">Medio - Razonamiento estándar</option>
                <option value="high">Alto - Análisis profundo</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controla qué tan profundo razona antes de responder
              </p>
            </div>
          )}
        </div>
        
        {agent.model?.startsWith('gpt-5') && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verbosidad
            </label>
            <select
              value={agent.verbosity || 'medium'}
              onChange={(e) => setAgent({ ...agent, verbosity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            >
              <option value="low">Baja - Respuestas concisas</option>
              <option value="medium">Media - Balance longitud</option>
              <option value="high">Alta - Explicaciones detalladas</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controla qué tan detalladas serán las respuestas
            </p>
          </div>
        )}
      </div>

      {/* Example Templates */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Ejemplos de configuración efectiva
        </h3>
        
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>🏥 Para clínicas:</strong>
            <p className="mt-1">
              "Eres un asistente médico virtual amable y profesional. Trabajas para [Clínica]. 
              Tu objetivo es agendar citas, recordar a pacientes sus consultas y responder dudas básicas sobre servicios."
            </p>
          </div>
          
          <div>
            <strong>🍕 Para restaurantes:</strong>
            <p className="mt-1">
              "Eres un asistente entusiasta y servicial. Trabajas para [Restaurante]. 
              Tu objetivo es tomar reservas, informar sobre el menú del día y gestionar pedidos a domicilio."
            </p>
          </div>
          
          <div>
            <strong>💼 Para servicios profesionales:</strong>
            <p className="mt-1">
              "Eres un asistente ejecutivo profesional y eficiente. Trabajas para [Empresa]. 
              Tu objetivo es calificar leads, agendar reuniones y proporcionar información sobre servicios."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}