'use client'

import { useState, useEffect } from 'react'
import { 
  Smartphone, Users, ArrowRight, CheckCircle, AlertTriangle,
  RefreshCw, Eye, MessageSquare, Settings, Target, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface Template {
  id: string
  name: string
  preview: string
  requiredVariables: string[]
  optionalVariables?: string[]
  usageCount: number
  description: string
}

interface ColumnInfo {
  original: string
  mapped: string
  type: 'text' | 'number' | 'date' | 'time' | 'phone'
  completeness: number
  required: boolean
}

interface CSVRow {
  [key: string]: string
}

interface TemplatePreviewProps {
  template: Template | null
  availableColumns: ColumnInfo[]
  csvData: CSVRow[]
  onVariableMapping?: (mappings: Record<string, string>) => void
  onDefaultValues?: (defaults: Record<string, string>) => void
}

// ROBUST VARIABLE DETECTION ENGINE
const detectVariablesInTemplate = (templateText: string): string[] => {
  // Pattern to find all text within curly braces: {variable}
  const variablePattern = /\{([^}]+)\}/g
  const variables: string[] = []
  let match
  
  while ((match = variablePattern.exec(templateText)) !== null) {
    const variableName = match[1].trim() // Remove spaces: { nombre } -> nombre
    if (variableName && !variables.includes(variableName)) {
      variables.push(variableName)
    }
  }
  
  return variables.sort() // Return sorted unique variables
}


export function TemplatePreview({ 
  template, 
  availableColumns, 
  csvData,
  onVariableMapping,
  onDefaultValues 
}: TemplatePreviewProps) {
  const [selectedContactIndex, setSelectedContactIndex] = useState(0)
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({})
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({})
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  // ENHANCED VARIABLE DETECTION - All variables get flexible mapping
  const allTemplateVariables = template ? detectVariablesInTemplate(template.preview) : []
  
  // Track which variables use CSV vs default values
  const [variableTypes, setVariableTypes] = useState<Record<string, 'csv' | 'default'>>({})

  // SMART AUTO-INITIALIZATION - Only runs when template changes
  useEffect(() => {
    if (!template) return

    const newMappings: Record<string, string> = {}
    const newDefaults: Record<string, string> = {}
    const newTypes: Record<string, 'csv' | 'default'> = {}
    
    // Initialize all variables with smart defaults - NO AUTO-SELECTION
    allTemplateVariables.forEach(variable => {
      // Don't override existing user choices
      if (variableTypes[variable]) {
        newTypes[variable] = variableTypes[variable]
        return
      }
      
      // Always initialize as default value type, requiring user to manually select CSV columns
      newTypes[variable] = 'default'
      if (variable.toLowerCase().includes('fecha')) {
        newDefaults[variable] = new Date().toISOString().split('T')[0]
      } else if (variable.toLowerCase().includes('hora')) {
        newDefaults[variable] = '09:00'
      } else {
        newDefaults[variable] = ''
      }
    })

    // Update states only with new values
    setVariableMappings(prev => ({ ...prev, ...newMappings }))
    setDefaultValues(prev => ({ ...prev, ...newDefaults }))
    setVariableTypes(prev => ({ ...prev, ...newTypes }))
    
  }, [template?.id, availableColumns.length]) // Only re-run when template or columns change


  if (!template) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Seleccione una plantilla</h3>
          <p className="text-gray-500">
            Elija una plantilla de la biblioteca para ver la vista previa
          </p>
          {availableColumns.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              {availableColumns.length} columnas detectadas: {availableColumns.map(col => col.original).join(', ')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ENHANCED preview text generation with ALL detected variables
  const getPreviewText = (contactIndex: number = selectedContactIndex): string => {
    if (!template) return ''
    if (csvData.length === 0) return template.preview

    const contact = csvData[contactIndex] || csvData[0]
    let previewText = template.preview

    // Use ALL detected variables, not just template-defined ones
    allTemplateVariables.forEach(variable => {
      const mapping = variableMappings[variable]
      const defaultValue = defaultValues[variable]
      
      let value = ''
      
      // Priority: CSV data > Default values > Placeholder
      if (mapping && contact[mapping]) {
        value = contact[mapping]
      } else if (defaultValue && defaultValue.trim() !== '') {
        value = defaultValue
      } else {
        value = `{${variable}}` // Keep as placeholder if no value
      }
      
      // Replace all instances of this variable
      previewText = previewText.replace(new RegExp(`\\{${variable}\\}`, 'g'), value)
    })

    return previewText
  }

  // Handle changing variable type (csv vs default)
  const handleVariableTypeChange = (variable: string, type: 'csv' | 'default') => {
    setVariableTypes(prev => ({ ...prev, [variable]: type }))
    
    if (type === 'default') {
      // Clear CSV mapping, set default value
      const newMappings = { ...variableMappings }
      delete newMappings[variable]
      setVariableMappings(newMappings)
      onVariableMapping?.(newMappings)
      
      // Initialize default value if empty
      if (!defaultValues[variable]) {
        const newDefaults = { ...defaultValues }
        if (variable.toLowerCase().includes('fecha')) {
          newDefaults[variable] = new Date().toISOString().split('T')[0]
        } else if (variable.toLowerCase().includes('hora')) {
          newDefaults[variable] = '09:00'
        } else {
          newDefaults[variable] = ''
        }
        setDefaultValues(newDefaults)
        onDefaultValues?.(newDefaults)
      }
    } else {
      // Clear default value, prepare for CSV mapping
      const newDefaults = { ...defaultValues }
      delete newDefaults[variable]
      setDefaultValues(newDefaults)
      onDefaultValues?.(newDefaults)
    }
  }

  const handleMappingChange = (variable: string, mapping: string) => {
    const newMappings = { ...variableMappings, [variable]: mapping }
    setVariableMappings(newMappings)
    onVariableMapping?.(newMappings)
  }

  const handleDefaultValueChange = (variable: string, value: string) => {
    const newDefaults = { ...defaultValues, [variable]: value }
    setDefaultValues(newDefaults)
    onDefaultValues?.(newDefaults)
  }

  const previewText = getPreviewText()
  const characterCount = previewText.length
  const isOverLimit = characterCount > 4096

  // ENHANCED compatibility calculation
  const compatibleContacts = csvData.filter(contact => {
    // Check if all variables have either mappings or default values
    return allTemplateVariables.every(variable => {
      const type = variableTypes[variable]
      if (type === 'csv') {
        const mapping = variableMappings[variable]
        return mapping && contact[mapping] && contact[mapping].trim() !== ''
      } else {
        const defaultVal = defaultValues[variable]
        return defaultVal && defaultVal.trim() !== ''
      }
    })
  }).length

  const partialContacts = csvData.length - compatibleContacts

  return (
    <div className="space-y-6">
      {/* Template header */}
      <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200" padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
            <p className="text-gray-600 mt-1">{template.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Usada {template.usageCount.toLocaleString()} veces</p>
            <div className="flex items-center space-x-2 mt-1">
              <Users size={16} className="text-primary-600" />
              <span className="text-primary-600 font-medium">
                {compatibleContacts} compatibles
              </span>
              <span className="text-blue-600 text-sm">
                ({Object.values(variableTypes).filter(t => t === 'csv').length} CSV + {Object.values(variableTypes).filter(t => t === 'default').length} defecto)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* FLEXIBLE Variable Configuration */}
      <Card className="bg-white" padding="lg">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Settings size={20} className="mr-2" />
          Configuración de Variables
        </h4>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Para cada variable, elige si usar una <strong>columna de tu archivo CSV</strong> o un <strong>valor por defecto</strong>:
          </p>
          
          {allTemplateVariables.map(variable => {
            const variableType = variableTypes[variable] || 'default'
            const mapping = variableMappings[variable]
            const column = availableColumns.find(col => col.mapped === mapping)
            const isDateField = variable.toLowerCase().includes('fecha')
            const isTimeField = variable.toLowerCase().includes('hora')
            
            return (
              <div key={variable} className="border rounded-lg p-4 space-y-3">
                {/* Variable Header */}
                <div className="flex items-center justify-between">
                  <code className="text-lg font-medium text-primary-600 bg-primary-100 px-3 py-1 rounded">
                    {`{${variable}}`}
                  </code>
                  
                  {/* Type Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Usar:</span>
                    <select
                      value={variableType}
                      onChange={(e) => handleVariableTypeChange(variable, e.target.value as 'csv' | 'default')}
                      className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                    >
                      <option value="csv">📁 Columna CSV</option>
                      <option value="default">✏️ Valor por defecto</option>
                    </select>
                  </div>
                </div>
                
                {/* Configuration based on type */}
                {variableType === 'csv' ? (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-blue-700 font-medium min-w-0 flex-shrink-0">
                        Mapear a columna:
                      </span>
                      <select
                        value={mapping || ''}
                        onChange={(e) => handleMappingChange(variable, e.target.value)}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar columna...</option>
                        {availableColumns.map(col => (
                          <option key={col.mapped} value={col.mapped}>
                            {col.original} ({col.completeness}% completo)
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center">
                        {column ? (
                          <>
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-xs text-green-600 ml-1">
                              {column.completeness}%
                            </span>
                          </>
                        ) : (
                          <AlertTriangle size={16} className="text-amber-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-orange-700 font-medium min-w-0 flex-shrink-0">
                        Valor por defecto:
                      </span>
                      {isDateField ? (
                        <input
                          type="date"
                          value={defaultValues[variable] || ''}
                          onChange={(e) => handleDefaultValueChange(variable, e.target.value)}
                          className="flex-1 px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : isTimeField ? (
                        <input
                          type="time"
                          value={defaultValues[variable] || ''}
                          onChange={(e) => handleDefaultValueChange(variable, e.target.value)}
                          className="flex-1 px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={`Ej: ${variable === 'servicio' ? 'Manicure, Pedicure, Corte...' : 'Ingrese valor...'}`}
                          value={defaultValues[variable] || ''}
                          onChange={(e) => handleDefaultValueChange(variable, e.target.value)}
                          className="flex-1 px-3 py-2 border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      )}
                      <div className="flex items-center">
                        {defaultValues[variable] && defaultValues[variable].trim() !== '' ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <AlertTriangle size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          
          {/* Summary */}
          <div className="border-t pt-4 mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Variables detectadas: <strong>{allTemplateVariables.length}</strong>
              </span>
              <div className="flex space-x-4">
                <span className="text-blue-600">
                  📁 CSV: {Object.values(variableTypes).filter(t => t === 'csv').length}
                </span>
                <span className="text-orange-600">
                  ✏️ Por defecto: {Object.values(variableTypes).filter(t => t === 'default').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text preview */}
        <Card className="bg-white" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Eye size={20} className="mr-2" />
              Vista Previa
            </h4>
            
            <div className="flex items-center space-x-2">
              <select
                value={selectedContactIndex}
                onChange={(e) => setSelectedContactIndex(Number(e.target.value))}
                className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {csvData.slice(0, 5).map((contact, index) => (
                  <option key={index} value={index}>
                    {contact.nombre || `Contacto ${index + 1}`}
                  </option>
                ))}
              </select>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContactIndex((prev) => 
                  prev >= csvData.length - 1 ? 0 : prev + 1
                )}
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Preview text */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {previewText}
              </p>
            </div>
            
            {/* Character count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Caracteres:</span>
              <span className={`font-medium ${
                isOverLimit ? 'text-red-600' : characterCount > 3500 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {characterCount} / 4,096
              </span>
            </div>
            
            {isOverLimit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  ⚠️ El mensaje excede el límite de caracteres de WhatsApp
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Mobile preview */}
        <Card className="bg-white" padding="lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Smartphone size={20} className="mr-2" />
            Así se verá en WhatsApp
          </h4>
          
          <div className="bg-gradient-to-b from-green-400 to-green-500 p-4 rounded-t-2xl">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <p className="font-medium">Su Empresa</p>
                <p className="text-xs opacity-75">en línea</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 min-h-[200px] rounded-b-2xl">
            <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%] ml-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {previewText}
              </p>
              <p className="text-xs text-gray-500 mt-2 text-right">
                {new Date().toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Compatibility summary */}
      <Card className="bg-white" padding="lg">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Target size={20} className="mr-2" />
          Resumen de Compatibilidad
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Datos completos</p>
              <p className="text-xl font-bold text-gray-900">✅ {compatibleContacts}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-purple-100">
              <Settings className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Variables configuradas</p>
              <p className="text-xl font-bold text-gray-900">⚙️ {allTemplateVariables.length}</p>
              <p className="text-xs text-gray-500">({Object.values(variableTypes).filter(t => t === 'csv').length} CSV + {Object.values(variableTypes).filter(t => t === 'default').length} defecto)</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Clock className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tiempo estimado</p>
              <p className="text-xl font-bold text-gray-900">
                {Math.ceil(csvData.length / 60)} min
              </p>
            </div>
          </div>
        </div>
        
        {partialContacts > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Nota:</strong> {partialContacts} contactos usarán valores por defecto para variables faltantes.
              Para mejor resultado, considere agregar las columnas faltantes a su archivo.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}