'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, Play, CheckCircle, Clock, Bot,
  MessageSquare, Calendar, User, Hash,
  ChevronRight, Eye, Zap
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { API_URL } from '@/lib/config'

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables: string[]
  status: 'approved' | 'active'
  createdAt: string
  aiScore?: number
  twilioSid?: string
  twilioTemplateId?: string
}

interface CampaignTemplatesSelectorProps {
  onSelectTemplate: (template: Template) => void
  selectedTemplate?: Template | null
}

export function CampaignTemplatesSelector({ onSelectTemplate, selectedTemplate }: CampaignTemplatesSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  useEffect(() => {
    fetchAllTemplates()
  }, [])

  const fetchAllTemplates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Use the approved endpoint that shows all available templates (user + system)
      const response = await fetch(`${API_URL}/api/templates-ai/approved`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching campaign templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (template: Template) => {
    return template.status === 'active'
      ? {
          icon: Play,
          color: 'text-secondary-600',
          bgColor: 'bg-secondary-50',
          borderColor: 'border-secondary-200',
          text: '🚀 Activa',
          description: 'Lista para campañas'
        }
      : {
          icon: CheckCircle,
          color: 'text-primary-600',
          bgColor: 'bg-primary-50',
          borderColor: 'border-primary-200',
          text: '✅ Aprobada',
          description: 'Pendiente de activación'
        }
  }

  const isSystemTemplate = (templateName: string) => {
    return ['recordatorio_citas', 'confirmacion_citas'].includes(templateName)
  }

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" padding="lg">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-dark-600">Cargando plantillas disponibles...</p>
        </div>
      </Card>
    )
  }

  if (templates.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-primary-50 to-secondary-50/30 border-primary-200 shadow-lg" padding="lg">
        <div className="text-center py-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary-500/10 blur-2xl rounded-full" />
            <AnimatedIcon icon={MessageSquare} size={80} className="text-primary-400 mx-auto relative" animation="pulse" />
          </div>
          <h3 className="text-2xl font-bold text-primary-800 mb-3">
            🌟 ¡No hay plantillas disponibles!
          </h3>
          <p className="text-primary-600 max-w-md mx-auto mb-6 leading-relaxed">
            No se encontraron plantillas activas para usar en campañas.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" padding="lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <AnimatedIcon icon={Sparkles} size={28} className="text-secondary-600" animation="pulse" />
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Plantillas Disponibles
            </h2>
            <p className="text-dark-500 text-sm">
              {templates.length} plantilla{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''} para campañas
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => {
          const statusConfig = getStatusConfig(template)
          const isSelected = selectedTemplate?.id === template.id
          const isExpanded = expandedTemplate === template.id
          const isSystem = isSystemTemplate(template.name)
          
          return (
            <div 
              key={template.id} 
              className={`group border-2 rounded-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                isSelected 
                  ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-secondary-50 shadow-lg scale-105' 
                  : 'border-light-200 bg-white hover:border-primary-200 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div 
                className="p-6"
                onClick={() => {
                  onSelectTemplate(template)
                  setExpandedTemplate(isExpanded ? null : template.id)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className={`absolute inset-0 ${statusConfig.color.replace('text-', 'bg-').replace('-600', '-500/20')} blur-md rounded-full`} />
                      <AnimatedIcon 
                        icon={statusConfig.icon} 
                        size={32} 
                        className={`${statusConfig.color} relative`} 
                        animation="pulse" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-lg font-bold transition-colors duration-300 ${
                          isSelected ? 'text-primary-700' : 'text-dark-800 group-hover:text-primary-600'
                        }`}>
                          {template.name}
                        </h3>
                        {isSystem && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            🏢 Sistema
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
                          {statusConfig.text}
                        </span>
                        <span className="text-xs text-dark-500">{statusConfig.description}</span>
                        {template.aiScore && (
                          <div className="flex items-center space-x-1 px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs">
                            <Bot className="w-3 h-3" />
                            <span>{template.aiScore}/100</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-dark-600 flex items-center space-x-2 bg-light-100 px-3 py-2 rounded-lg">
                      <Hash className="w-4 h-4 text-primary-500" />
                      <span className="font-medium">{template.variables.length} variables</span>
                    </div>
                    
                    <ChevronRight 
                      className={`w-6 h-6 transition-all duration-300 ${
                        isSelected ? 'text-primary-600 rotate-90' : 'text-dark-400 group-hover:text-primary-600'
                      }`} 
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Preview */}
              {isExpanded && (
                <div className="border-t border-light-200 bg-gradient-to-br from-light-50 to-white p-6 animate-slide-down">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-dark-800 mb-3 flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-primary-600" />
                        Vista Previa del Mensaje
                      </h4>
                      <div className="bg-white border-2 border-light-200 rounded-lg p-4 shadow-inner">
                        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 w-8 h-1 rounded-full mb-3" />
                        <p className="text-dark-700 whitespace-pre-wrap leading-relaxed text-sm">
                          {template.content}
                        </p>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-light-100">
                          <div className="text-xs text-dark-400">
                            {template.content.length} caracteres
                          </div>
                          {template.twilioSid && (
                            <div className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded">
                              SID: {template.twilioSid}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-dark-800 mb-3 flex items-center">
                        <Hash className="w-4 h-4 mr-2 text-secondary-600" />
                        Variables Requeridas
                      </h4>
                      {template.variables.length > 0 ? (
                        <div className="space-y-2">
                          {template.variables.map((variable, index) => (
                            <div 
                              key={index} 
                              className="flex items-center space-x-2 bg-secondary-50 border border-secondary-200 rounded-lg p-3"
                            >
                              <div className="w-2 h-2 bg-secondary-500 rounded-full" />
                              <span className="font-medium text-secondary-800">{`{{${variable}}}`}</span>
                            </div>
                          ))}
                          <div className="mt-4 p-3 bg-accent-50 border border-accent-200 rounded-lg">
                            <p className="text-accent-700 text-sm">
                              <Zap className="w-4 h-4 inline mr-1" />
                              Tu archivo CSV debe incluir columnas para todas estas variables.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-light-50 rounded-lg border-2 border-dashed border-light-300">
                          <CheckCircle className="w-8 h-8 text-secondary-500 mx-auto mb-2" />
                          <p className="text-dark-600 font-medium">Sin variables</p>
                          <p className="text-dark-500 text-sm">Esta plantilla no requiere datos adicionales</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-light-200">
                    <Button
                      onClick={() => onSelectTemplate(template)}
                      className={`w-full py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                        isSelected
                          ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-lg'
                          : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="w-6 h-6 mr-3" />
                          ✨ Plantilla Seleccionada
                        </>
                      ) : (
                        <>
                          <Eye className="w-6 h-6 mr-3" />
                          🚀 Usar Esta Plantilla
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl">
        <p className="text-primary-700 text-sm font-medium flex items-center">
          <Sparkles className="w-4 h-4 mr-2" />
          💡 Las plantillas del sistema están disponibles para todos los usuarios. Las plantillas personales solo son visibles para ti.
        </p>
      </div>
    </Card>
  )
}