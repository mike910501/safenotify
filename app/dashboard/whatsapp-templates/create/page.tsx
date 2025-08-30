'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { 
  ArrowLeft, Save, Eye, EyeOff, MessageSquare, 
  AlertCircle, CheckCircle, Plus, Minus, Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface TemplatePreview {
  header?: string
  body: string
  footer?: string
}

export default function CreateWhatsAppTemplatePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY' as 'UTILITY' | 'MARKETING' | 'AUTHENTICATION',
    language: 'es',
    headerText: '',
    bodyText: '',
    footerText: '',
    variablesMapping: {} as Record<string, string>
  })
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [detectedVariables, setDetectedVariables] = useState<number[]>([])
  const [preview, setPreview] = useState<TemplatePreview>({ body: '' })

  useEffect(() => {
    detectVariables()
    generatePreview()
  }, [formData.headerText, formData.bodyText, formData.footerText, formData.variablesMapping])

  const detectVariables = () => {
    const variableMatches = formData.bodyText.match(/\{\{\d+\}\}/g) || []
    const variableNumbers = variableMatches
      .map(v => parseInt(v.replace(/[{}]/g, '')))
      .filter((v, i, arr) => arr.indexOf(v) === i) // Remove duplicates
      .sort((a, b) => a - b)
    
    setDetectedVariables(variableNumbers)

    // Initialize variable mapping for new variables
    const newMapping = { ...formData.variablesMapping }
    variableNumbers.forEach(num => {
      if (!newMapping[num.toString()]) {
        newMapping[num.toString()] = `variable_${num}`
      }
    })
    
    // Remove mapping for variables that no longer exist
    Object.keys(newMapping).forEach(key => {
      if (!variableNumbers.includes(parseInt(key))) {
        delete newMapping[key]
      }
    })

    if (JSON.stringify(newMapping) !== JSON.stringify(formData.variablesMapping)) {
      setFormData(prev => ({ ...prev, variablesMapping: newMapping }))
    }
  }

  const generatePreview = () => {
    let bodyPreview = formData.bodyText
    
    // Replace variables with sample data
    const sampleData: Record<string, string> = {
      'nombre': 'Juan Pérez',
      'empresa': 'SafeNotify',
      'servicio': 'Consulta General',
      'fecha': '15 de Septiembre 2025',
      'hora': '10:30 AM',
      'lugar': 'Consultorio 201',
      'doctor': 'Dr. García',
      'telefono': '+573001234567',
      'codigo': '12345'
    }

    detectedVariables.forEach(num => {
      const mapping = formData.variablesMapping[num.toString()]
      const value = mapping && sampleData[mapping] ? sampleData[mapping] : `[${mapping || `Variable ${num}`}]`
      bodyPreview = bodyPreview.replace(new RegExp(`\\{\\{${num}\\}\\}`, 'g'), value)
    })

    setPreview({
      header: formData.headerText || undefined,
      body: bodyPreview,
      footer: formData.footerText || undefined
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del template es requerido'
    }

    if (!formData.bodyText.trim()) {
      newErrors.bodyText = 'El contenido del mensaje es requerido'
    }

    // Validate variables are sequential
    if (detectedVariables.length > 0) {
      const expectedSequence = Array.from({ length: detectedVariables.length }, (_, i) => i + 1)
      if (!detectedVariables.every((v, i) => v === expectedSequence[i])) {
        newErrors.bodyText = 'Las variables deben ser secuenciales: {{1}}, {{2}}, {{3}}, etc.'
      }
    }

    // Validate variable mappings
    detectedVariables.forEach(num => {
      const mapping = formData.variablesMapping[num.toString()]
      if (!mapping || !mapping.trim()) {
        newErrors[`variable_${num}`] = `Mapping para {{${num}}} es requerido`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/whatsapp-templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        alert('✅ Template creado exitosamente. Será enviado a Meta para aprobación.')
        router.push('/dashboard/whatsapp-templates')
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleVariableMappingChange = (variableNum: string, mapping: string) => {
    setFormData(prev => ({
      ...prev,
      variablesMapping: { ...prev.variablesMapping, [variableNum]: mapping }
    }))
    if (errors[`variable_${variableNum}`]) {
      setErrors(prev => ({ ...prev, [`variable_${variableNum}`]: '' }))
    }
  }

  const predefinedMappings = [
    'nombre', 'empresa', 'servicio', 'fecha', 'hora', 'lugar', 
    'doctor', 'telefono', 'codigo', 'cliente', 'producto', 'precio'
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crear Template WhatsApp</h1>
          <p className="text-gray-600">Crea un nuevo template para ser aprobado por Meta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <Card className="bg-white" padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Template *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="ej: cita_recordatorio_v1"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="UTILITY">Utilidad</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Autenticación</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Idioma
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Template Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contenido del Template</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.headerText}
                    onChange={(e) => handleInputChange('headerText', e.target.value)}
                    placeholder="Texto del header"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido del Mensaje *
                  </label>
                  <textarea
                    value={formData.bodyText}
                    onChange={(e) => handleInputChange('bodyText', e.target.value)}
                    placeholder="Hola {{1}}, tu cita para {{2}} el {{3}} a las {{4}} está confirmada."
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.bodyText ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.bodyText && (
                    <p className="text-red-600 text-xs mt-1">{errors.bodyText}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Usa {{1}}, {{2}}, {{3}} para variables dinámicas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Footer (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.footerText}
                    onChange={(e) => handleInputChange('footerText', e.target.value)}
                    placeholder="Responde STOP para no recibir más mensajes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Variable Mapping */}
              {detectedVariables.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mapeo de Variables ({detectedVariables.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Define qué representa cada variable en tu template
                  </p>
                  
                  <div className="space-y-3">
                    {detectedVariables.map(num => (
                      <div key={num} className="flex items-center space-x-3">
                        <span className="w-12 text-sm font-medium text-gray-700">
                          {`{{${num}}}`}
                        </span>
                        <span className="text-gray-500">→</span>
                        <div className="flex-1">
                          <select
                            value={formData.variablesMapping[num.toString()] || ''}
                            onChange={(e) => handleVariableMappingChange(num.toString(), e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              errors[`variable_${num}`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Seleccionar variable...</option>
                            {predefinedMappings.map(mapping => (
                              <option key={mapping} value={mapping}>
                                {mapping}
                              </option>
                            ))}
                          </select>
                          {errors[`variable_${num}`] && (
                            <p className="text-red-600 text-xs mt-1">{errors[`variable_${num}`]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    'Creando...'
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Crear Template
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="bg-white" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vista Previa</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff size={14} className="mr-1" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye size={14} className="mr-1" />
                    Mostrar
                  </>
                )}
              </Button>
            </div>

            {showPreview && (
              <div className="space-y-4">
                {/* Mobile Preview */}
                <div className="max-w-sm mx-auto">
                  <div className="bg-gray-100 rounded-t-2xl p-2">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                      {/* WhatsApp Header */}
                      <div className="bg-green-600 text-white p-3 flex items-center space-x-3">
                        <Smartphone className="w-5 h-5" />
                        <div>
                          <div className="font-medium">WhatsApp Business</div>
                          <div className="text-xs opacity-75">Template Preview</div>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="p-4 space-y-3">
                        {preview.header && (
                          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-300">
                            <div className="text-sm font-medium text-gray-700">
                              {preview.header}
                            </div>
                          </div>
                        )}

                        <div className="bg-green-50 rounded-lg p-3 ml-4">
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {preview.body || 'Escribe el contenido del mensaje...'}
                          </div>
                        </div>

                        {preview.footer && (
                          <div className="text-xs text-gray-500 italic px-4">
                            {preview.footer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-1">Proceso de Aprobación</div>
                      <ul className="space-y-1 text-xs">
                        <li>• El template será enviado a Meta para revisión</li>
                        <li>• El proceso puede tomar 24-48 horas</li>
                        <li>• Solo templates aprobados pueden usarse en campañas</li>
                        <li>• Variables deben ser secuenciales ({{1}}, {{2}}, {{3}})</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Variables Info */}
                {detectedVariables.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="font-medium text-gray-900 mb-2">
                      Variables Detectadas ({detectedVariables.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map(num => (
                        <span
                          key={num}
                          className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                        >
                          {`{{${num}}} → ${formData.variablesMapping[num.toString()] || 'sin mapear'}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}