'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { 
  ArrowLeft, Sparkles, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Lightbulb, MessageSquare, Save, Eye,
  Bot, Loader2, Plus, Trash2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface ValidationResult {
  approved: boolean
  score: number
  reasons: string[]
  suggestions: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  excelRequirements: string[]
  suggestedVariables?: string[]
}

export default function CreateTemplatePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Form state
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [variables, setVariables] = useState<string[]>([])
  const [newVariable, setNewVariable] = useState('')

  // Validation state
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [excelGuide, setExcelGuide] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'medical', label: 'Médica' },
    { value: 'beauty', label: 'Belleza' },
    { value: 'service', label: 'Servicios' },
    { value: 'promotion', label: 'Promocional' },
    { value: 'reminder', label: 'Recordatorios' }
  ]

  const handleAddVariable = () => {
    if (newVariable.trim() && !variables.includes(newVariable.trim())) {
      setVariables([...variables, newVariable.trim()])
      setNewVariable('')
    }
  }

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const handleValidateWithAI = async () => {
    if (!name.trim() || !content.trim()) {
      alert('Nombre y contenido son requeridos')
      return
    }

    setValidating(true)
    setValidation(null)
    setExcelGuide(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/templates-ai/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          content,
          category,
          variables
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setValidation(data.validation)
        setExcelGuide(data.excelGuide)
      } else {
        alert(data.error || 'Error en la validación')
      }
    } catch (error) {
      console.error('Error validating template:', error)
      alert('Error de conexión')
    } finally {
      setValidating(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!validation) {
      alert('La plantilla debe ser validada por IA antes de crearla')
      return
    }

    setCreating(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/templates-ai/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          content,
          category,
          variables,
          validationData: validation
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message || '¡Plantilla creada y enviada para revisión!')
        router.push('/dashboard/templates')
      } else {
        alert(data.error || 'Error creando plantilla')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const getValidationStatusConfig = () => {
    if (!validation) return null

    // Check if score is >= 70 for approval (or use isValid from backend)
    const isApproved = validation.isValid || validation.score >= 70

    if (isApproved) {
      // Different levels based on score
      if (validation.score >= 90) {
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: '¡Plantilla Excelente!',
          subtitle: `Score: ${validation.score}/100 - Alta probabilidad de aprobación`
        }
      } else if (validation.score >= 80) {
        return {
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Plantilla Aprobada',
          subtitle: `Score: ${validation.score}/100 - Buena calidad`
        }
      } else {
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Plantilla Aceptable',
          subtitle: `Score: ${validation.score}/100 - Puede necesitar mejoras`
        }
      }
    } else {
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Plantilla No Aprobada',
        subtitle: `Score: ${validation.score}/100 - Requiere cambios significativos`
      }
    }
  }

  const generatePreview = () => {
    let preview = content
    variables.forEach(variable => {
      const sampleValues: Record<string, string> = {
        'nombre': 'Juan Pérez',
        'empresa': 'Mi Empresa',
        'servicio': 'Consulta',
        'fecha': '2024-01-15',
        'hora': '14:30',
        'precio': '$50,000',
        'ubicacion': 'Calle 123'
      }
      const value = sampleValues[variable.toLowerCase()] || `[${variable}]`
      preview = preview.replace(new RegExp(`{{${variable}}}`, 'g'), value)
    })
    return preview
  }

  const statusConfig = getValidationStatusConfig()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/templates')}
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver a Plantillas
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Sparkles className="w-6 h-6 mr-2 text-purple-600" />
          Nueva Plantilla con IA
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6">
          <Card className="bg-white" padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Información de la Plantilla
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ej: Confirmación de Cita Médica"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido del Mensaje *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Hola {{nombre}}, le recordamos su cita el {{fecha}} a las {{hora}}..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa {`{{variable}}`} para campos dinámicos
                </p>
              </div>

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variables Dinámicas
                </label>
                
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="nombre, fecha, hora..."
                  />
                  <Button
                    type="button"
                    onClick={handleAddVariable}
                    size="sm"
                  >
                    <Plus size={16} />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{variable}</span>
                      <button
                        onClick={() => handleRemoveVariable(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className="bg-white" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Vista Previa</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye size={14} className="mr-1" />
                {showPreview ? 'Ocultar' : 'Ver'}
              </Button>
            </div>

            {showPreview && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg max-w-xs">
                  <p className="text-sm whitespace-pre-wrap">
                    {generatePreview()}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* AI Validation Section */}
        <div className="space-y-6">
          {/* Validation Button */}
          <Card className="bg-white" padding="lg">
            <div className="text-center space-y-4">
              <Bot className="w-12 h-12 text-purple-600 mx-auto" />
              <div>
                <h3 className="font-semibold text-gray-900">Validación con IA</h3>
                <p className="text-sm text-gray-600">
                  Valida tu plantilla contra las políticas de WhatsApp
                </p>
              </div>
              
              <Button
                onClick={handleValidateWithAI}
                disabled={validating || !name.trim() || !content.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Validar con IA
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Validation Results */}
          {validation && statusConfig && (
            <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border`} padding="lg">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <statusConfig.icon className={`w-6 h-6 ${statusConfig.color} mt-0.5`} />
                  <div>
                    <h3 className={`font-semibold ${statusConfig.color}`}>
                      {statusConfig.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {statusConfig.subtitle}
                    </p>
                  </div>
                </div>

                {/* Reasons */}
                {validation.reasons && Array.isArray(validation.reasons) && validation.reasons.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Razones:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.reasons.map((reason, index) => (
                        <li key={index} className="text-sm text-gray-700">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {/* Improved Template Suggestion */}
                {validation.improvedTemplate && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-1" />
                      💡 Plantilla Mejorada por IA:
                    </h4>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 space-y-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap font-medium">
                          {validation.improvedTemplate}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          onClick={() => {
                            setContent(validation.improvedTemplate)
                            // Extract variables from improved template
                            const variablePattern = /\{\{(\w+)\}\}/g
                            const foundVars = []
                            let match
                            while ((match = variablePattern.exec(validation.improvedTemplate)) !== null) {
                              if (!foundVars.includes(match[1])) {
                                foundVars.push(match[1])
                              }
                            }
                            setVariables(foundVars)
                          }}
                        >
                          ✨ Usar Esta Versión Mejorada
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Suggestions List */}
                {validation.suggestions && validation.suggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1 text-amber-500" />
                      Sugerencias para Mejorar:
                    </h4>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <ul className="space-y-2">
                        {validation.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-amber-900 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Excel Format Guide */}
                {validation.excelFormat && validation.excelFormat.columns && validation.excelFormat.columns.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-600" />
                      📊 Formato Requerido para tu Excel/CSV:
                    </h4>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-blue-200">
                          <thead>
                            <tr className="bg-blue-100">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                Columna
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                Descripción
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                Ejemplo
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-blue-100">
                            {validation.excelFormat.columns.map((col, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">
                                    {col.column}
                                  </code>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {col.description}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                                  {col.example}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-xs text-blue-800 flex items-start">
                          <span className="mr-1">💡</span>
                          <span>{validation.excelFormat.example || 'La primera fila debe contener los nombres exactos de las columnas.'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Create Button */}
          {validation && (
            <div className="space-y-4">
              {validation.score >= 90 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-3">
                    ✅ ¡Excelente! Tu plantilla tiene un score de {validation.score}/100. Alta probabilidad de ser aprobada rápidamente.
                  </p>
                </div>
              ) : validation.score >= 80 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    👍 Buena plantilla con score de {validation.score}/100. Será revisada manualmente antes de activarse.
                  </p>
                </div>
              ) : validation.score >= 70 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    ⚠️ Score de {validation.score}/100. La plantilla es aceptable pero considera aplicar las sugerencias de la IA.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 mb-3">
                    ❌ Score bajo ({validation.score}/100). Se recomienda mejorar la plantilla antes de enviarla.
                  </p>
                </div>
              )}
              
              <Button
                onClick={handleCreateTemplate}
                disabled={creating}
                className="w-full bg-primary-600 hover:bg-primary-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando para Revisión...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Crear y Enviar para Revisión
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}