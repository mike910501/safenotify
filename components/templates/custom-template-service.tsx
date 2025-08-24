'use client'

import { useState } from 'react'
import { 
  Sparkles, X, Send, Clock, CheckCircle, Star,
  MessageSquare, Users, Zap, Target, ArrowRight, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface CustomTemplateServiceProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (request: CustomTemplateRequest) => void
  availableColumns: string[]
}

interface CustomTemplateRequest {
  businessName: string
  businessType: string
  messageType: string
  tone: 'formal' | 'friendly' | 'professional'
  requiredVariables: string[]
  customVariables: string
  sampleMessage: string
  contactInfo: {
    name: string
    email: string
    phone: string
  }
  urgency: 'standard' | 'express'
}

const MESSAGE_TYPES = [
  { id: 'recordatorio', name: 'Recordatorio de cita', description: 'Para recordar citas o servicios programados' },
  { id: 'confirmacion', name: 'Confirmación', description: 'Para confirmar reservas o pedidos' },
  { id: 'promocion', name: 'Promoción', description: 'Para ofertas y descuentos especiales' },
  { id: 'notificacion', name: 'Notificación', description: 'Para avisos importantes o actualizaciones' },
  { id: 'seguimiento', name: 'Seguimiento', description: 'Para hacer seguimiento post-servicio' },
  { id: 'bienvenida', name: 'Bienvenida', description: 'Para nuevos clientes o usuarios' },
  { id: 'personalizado', name: 'Personalizado', description: 'Tipo de mensaje específico' }
]

const TONE_OPTIONS = [
  { id: 'formal', name: 'Formal', description: 'Lenguaje profesional y cortés', example: 'Estimado/a [nombre], nos complace informarle...' },
  { id: 'friendly', name: 'Amigable', description: 'Cercano y cálido', example: '¡Hola [nombre]! Esperamos verte pronto...' },
  { id: 'professional', name: 'Profesional', description: 'Directo y eficiente', example: 'Hola [nombre], su cita está confirmada...' }
]

export function CustomTemplateService({ 
  isOpen, 
  onClose, 
  onSubmit,
  availableColumns 
}: CustomTemplateServiceProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CustomTemplateRequest>({
    businessName: '',
    businessType: '',
    messageType: '',
    tone: 'professional',
    requiredVariables: [],
    customVariables: '',
    sampleMessage: '',
    contactInfo: {
      name: '',
      email: '',
      phone: ''
    },
    urgency: 'standard'
  })

  const [selectedVariables, setSelectedVariables] = useState<string[]>([])

  if (!isOpen) return null

  const handleVariableToggle = (variable: string) => {
    setSelectedVariables(prev => 
      prev.includes(variable) 
        ? prev.filter(v => v !== variable)
        : [...prev, variable]
    )
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    const request: CustomTemplateRequest = {
      ...formData,
      requiredVariables: selectedVariables
    }
    onSubmit(request)
  }

  const isStepComplete = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.businessType && formData.messageType
      case 2:
        return formData.tone && selectedVariables.length > 0
      case 3:
        return formData.sampleMessage.trim().length > 0
      case 4:
        return formData.contactInfo.name && formData.contactInfo.email
      default:
        return false
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AnimatedIcon icon={Sparkles} size={28} animation="pulse" />
              <div>
                <h2 className="text-2xl font-bold">Plantilla Personalizada</h2>
                <p className="text-purple-100">Diseñada específicamente para su negocio</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2"
            >
              <X size={24} />
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Paso {currentStep} de 4</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}% completado</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Business Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Información del Negocio</h3>
                <p className="text-gray-600">Cuéntenos sobre su empresa para personalizar la plantilla</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de su empresa/clínica
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ej: Clínica Salud Integral"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de negocio
                  </label>
                  <input
                    type="text"
                    value={formData.businessType}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                    placeholder="Ej: Clínica médica, Salón de belleza, Restaurante"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de mensaje
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {MESSAGE_TYPES.map((type) => (
                      <label key={type.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          value={type.id}
                          checked={formData.messageType === type.id}
                          onChange={(e) => setFormData(prev => ({ ...prev, messageType: e.target.value }))}
                          className="mt-1 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{type.name}</p>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Target className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Configuración de Plantilla</h3>
                <p className="text-gray-600">Defina el tono y las variables a usar</p>
              </div>

              {/* Tone selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tono deseado
                </label>
                <div className="space-y-3">
                  {TONE_OPTIONS.map((tone) => (
                    <div key={tone.id} 
                         className={`p-4 border rounded-lg cursor-pointer transition-all ${
                           formData.tone === tone.id 
                             ? 'border-purple-500 bg-purple-50' 
                             : 'border-gray-200 hover:border-gray-300'
                         }`}
                         onClick={() => setFormData(prev => ({ ...prev, tone: tone.id as any }))}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{tone.name}</h4>
                          <p className="text-sm text-gray-600">{tone.description}</p>
                          <p className="text-xs text-gray-500 mt-1 italic">{tone.example}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.tone === tone.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Variables disponibles en sus datos
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {availableColumns.map((variable) => (
                    <label key={variable} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVariables.includes(variable)}
                        onChange={() => handleVariableToggle(variable)}
                        className="text-purple-600 focus:ring-purple-500 rounded"
                      />
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {`{${variable}}`}
                      </code>
                    </label>
                  ))}
                </div>
                
                {selectedVariables.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Variables seleccionadas:</strong> {selectedVariables.map(v => `{${v}}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Custom variables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables adicionales (opcional)
                </label>
                <textarea
                  value={formData.customVariables}
                  onChange={(e) => setFormData(prev => ({ ...prev, customVariables: e.target.value }))}
                  placeholder="Ej: especialidad, ubicación, horario especial, etc."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Step 3: Message Example */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Mensaje de Ejemplo</h3>
                <p className="text-gray-600">Proporcione un ejemplo o inspiración para su plantilla</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje ejemplo o inspiración
                </label>
                <textarea
                  value={formData.sampleMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, sampleMessage: e.target.value }))}
                  placeholder="Escriba un ejemplo del mensaje que le gustaría enviar a sus clientes..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    Sea específico sobre el tono y la información que debe incluir
                  </p>
                  <span className="text-sm text-gray-500">
                    {formData.sampleMessage.length} caracteres
                  </span>
                </div>
              </div>

              <Card className="bg-blue-50 border-blue-200" padding="md">
                <div className="flex items-start space-x-3">
                  <Zap className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="font-medium text-blue-900">Consejo</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Incluya detalles específicos de su industria y el tipo de comunicación que necesita. 
                      Nuestros expertos usarán esta información para crear una plantilla perfecta.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 4: Contact & Delivery */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <Send className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Información de Contacto</h3>
                <p className="text-gray-600">Para entregarle su plantilla personalizada</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo.name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo, name: e.target.value }
                    }))}
                    placeholder="Su nombre completo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.contactInfo.phone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo, phone: e.target.value }
                    }))}
                    placeholder="300 123 4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                  placeholder="su@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                />
              </div>

              {/* Urgency selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tiempo de entrega
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        value="standard"
                        checked={formData.urgency === 'standard'}
                        onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as any }))}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Estándar (24-48 horas)</p>
                        <p className="text-sm text-gray-500">Entrega en 1-2 días hábiles</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">$85,000</span>
                  </label>

                  <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        value="express"
                        checked={formData.urgency === 'express'}
                        onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as any }))}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Express (12-24 horas)</p>
                        <p className="text-sm text-gray-500">Entrega el mismo día o siguiente</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">$125,000</span>
                  </label>
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200" padding="lg">
                <h4 className="font-semibold text-gray-900 mb-3">Resumen del Servicio</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>Plantilla personalizada para {formData.businessType}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>Optimizada para {selectedVariables.length} variables de sus datos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>Tono {TONE_OPTIONS.find(t => t.id === formData.tone)?.name.toLowerCase()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-blue-600" />
                    <span>
                      Entrega en {formData.urgency === 'express' ? '12-24 horas' : '24-48 horas'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Atrás
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepComplete()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Continuar
                <ArrowRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepComplete()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8"
              >
                Solicitar Plantilla
                <span className="ml-2 font-bold">
                  ${formData.urgency === 'express' ? '125,000' : '85,000'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}