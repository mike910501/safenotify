'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { 
  Send, FileText, Users, Clock, MessageSquare, 
  ChevronRight, Shield, Zap, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CSVUploader } from '@/components/csv-upload/csv-uploader'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { TemplateLibrary } from '@/components/templates/template-library'
import { CampaignTemplatesSelector } from '@/components/templates/campaign-templates-selector'
import { TemplatePreview } from '@/components/templates/template-preview'
import { AIAssistant } from '@/components/templates/ai-assistant'
import { CustomTemplateService } from '@/components/templates/custom-template-service'
import { UpgradeCta } from '@/components/ui/upgrade-cta'
import { LimitExceededModal } from '@/components/ui/limit-exceeded-modal'
import { useAuth } from '@/hooks/useAuth'

type Step = 'upload' | 'template' | 'review' | 'sending'

interface Template {
  id: string
  name: string
  category: string
  preview: string
  requiredVariables: string[]
  optionalVariables?: string[]
  usageCount: number
  description: string
  twilioSid?: string
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

export default function SendMessagesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [message, setMessage] = useState('')
  const [contactsCount, setContactsCount] = useState(0)
  
  // CSV and template data
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([])
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({})
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({})
  
  // UI state
  const [showCustomTemplateService, setShowCustomTemplateService] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [campaignResult, setCampaignResult] = useState<any>(null)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitDetails, setLimitDetails] = useState<any>(null)
  
  // Debug: Log key state changes
  console.log('Send Page State:', {
    currentStep,
    csvDataLength: csvData.length,
    availableColumnsLength: availableColumns.length,
    contactsCount,
    variableMappings,
    defaultValues
  })

  const steps = [
    { id: 'upload', label: 'Cargar Contactos', icon: Users },
    { id: 'template', label: 'Elegir Plantilla', icon: FileText },
    { id: 'review', label: 'Revisar y Enviar', icon: Send },
  ]

  // Mock data for CSV integration - in real app this would come from CSV uploader
  const handleCSVUploadComplete = (data: CSVRow[], columns: ColumnInfo[]) => {
    console.log('Send Page - CSV Upload Complete:', { 
      dataLength: data.length, 
      columnsLength: columns.length,
      columns: columns.map(col => ({ original: col.original, mapped: col.mapped }))
    })
    setCsvData(data)
    setAvailableColumns(columns)
    setContactsCount(data.length)
  }

  const getStepIndex = (step: Step) => {
    return steps.findIndex(s => s.id === step)
  }

  // Send messages function
  const sendMessages = async () => {
    if (!selectedTemplate || csvData.length === 0) {
      alert('Error: No hay plantilla seleccionada o datos CSV')
      return
    }

    setIsLoading(true)
    setCurrentStep('sending')

    try {
      console.log('🚀 Starting message sending process...')
      
      const BACKEND_URL = API_URL
      console.log('📡 Backend URL:', BACKEND_URL)
      
      // Create campaign
      const formData = new FormData()
      formData.append('name', `Campaign ${new Date().toLocaleString()}`)
      formData.append('templateSid', selectedTemplate.twilioSid || '')
      formData.append('variableMappings', JSON.stringify(variableMappings))
      formData.append('defaultValues', JSON.stringify(defaultValues))
      
      // Create CSV content
      const csvHeaders = availableColumns.map(col => col.original).join(',')
      const csvRows = csvData.map(row => 
        availableColumns.map(col => row[col.original] || '').join(',')
      ).join('\n')
      const csvContent = csvHeaders + '\n' + csvRows
      
      const csvBlob = new Blob([csvContent], { type: 'text/csv' })
      formData.append('csvFile', csvBlob, 'contacts.csv')
      
      console.log('📤 Creating campaign with backend...')
      console.log('📋 Campaign data:', {
        name: `Campaign ${new Date().toLocaleString()}`,
        templateSid: selectedTemplate.twilioSid,
        contactsCount: csvData.length,
        variableMappings,
        defaultValues
      })
      
      // Create campaign
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No hay token de autenticación')
      }

      const createResponse = await fetch(`${BACKEND_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      const createResult = await createResponse.json()
      console.log('📝 Campaign creation response:', createResult)
      
      if (!createResponse.ok || !createResult.success) {
        // Manejo especial para límites excedidos
        if (createResponse.status === 403 && createResult.details) {
          const details = createResult.details
          setLimitDetails(details)
          setShowLimitModal(true)
          setIsLoading(false)
          return // No throw error, solo mostrar modal
        }
        
        throw new Error(createResult.error || `Error creating campaign (${createResponse.status})`)
      }
      
      const campaignId = createResult.campaign.id
      
      // Send messages
      console.log('📱 Sending messages...')
      const sendResponse = await fetch(`${BACKEND_URL}/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ confirm: 'true' })
      })
      
      if (!sendResponse.ok) {
        throw new Error(`HTTP error! status: ${sendResponse.status}`)
      }
      
      const sendResult = await sendResponse.json()
      console.log('✅ Messages sent:', sendResult)
      
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Error sending messages')
      }
      
      // Set campaign results (keep in sending state to show results)
      setCampaignResult({
        sent: sendResult.campaign.sentCount || 0,
        errors: sendResult.campaign.errorCount || 0,
        total: sendResult.campaign.totalContacts || 0,
        campaign: sendResult.campaign,
        message: sendResult.message
      })
      
    } catch (error) {
      console.error('❌ Error sending messages:', error)
      alert(`Error enviando mensajes: ${error.message}`)
      setCurrentStep('review') // Go back to review step
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Enviar Mensajes
        </h1>
        <p className="text-gray-600">
          Envíe notificaciones masivas de forma segura y eficiente
        </p>
      </div>

      {/* Upgrade CTA Banner - Mostrar si no tiene mensajes o está cerca del límite */}
      {user && (
        <UpgradeCta
          variant="banner"
          currentPlan={user.planType}
          messagesUsed={user.messagesUsed}
          messagesLimit={user.messagesLimit}
          showProgress={true}
          urgent={user.messagesUsed >= user.messagesLimit}
        />
      )}

      {/* Progress Steps */}
      <Card className="bg-white" padding="lg">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = getStepIndex(step.id as Step) < getStepIndex(currentStep)
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isActive ? 'bg-primary-600 text-white scale-110' : ''}
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} />
                    ) : (
                      <step.icon size={20} />
                    )}
                  </div>
                  <span
                    className={`
                      ml-3 font-medium transition-colors duration-300
                      ${isActive ? 'text-primary-700' : ''}
                      ${isCompleted ? 'text-green-700' : ''}
                      ${!isActive && !isCompleted ? 'text-gray-500' : ''}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`
                          h-full transition-all duration-500 ease-out
                          ${isCompleted ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'}
                        `}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Upload CSV */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <CSVUploader 
              onDataProcessed={(data, columns) => {
                console.log('Send Page - Received callback with:', { dataLength: data.length, columnsLength: columns.length })
                handleCSVUploadComplete(data, columns)
              }}
              onContinue={() => {
                if (availableColumns.length > 0 && csvData.length > 0) {
                  setCurrentStep('template')
                }
              }}
            />
            
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200" padding="md">
                <div className="flex items-start space-x-3">
                  <Zap className="text-blue-600 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-blue-900">Procesamiento Rápido</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Validación instantánea de hasta 10,000 contactos
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-green-50 border-green-200" padding="md">
                <div className="flex items-start space-x-3">
                  <Shield className="text-green-600 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-green-900">100% Seguro</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Sus datos nunca salen de su navegador
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="bg-purple-50 border-purple-200" padding="md">
                <div className="flex items-start space-x-3">
                  <Clock className="text-purple-600 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="font-medium text-purple-900">Eliminación Automática</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Datos borrados después del envío
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Data loaded message with manual continue */}
            {availableColumns.length > 0 && csvData.length > 0 && (
              <Card className="bg-green-50 border-green-200" padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="text-green-600" size={20} />
                    <div>
                      <p className="text-green-800 font-medium">¡Archivo procesado exitosamente!</p>
                      <p className="text-green-700 text-sm">
                        {availableColumns.length} columnas y {csvData.length} contactos detectados. Listo para continuar.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className="gradient-primary"
                    onClick={() => setCurrentStep('template')}
                  >
                    Siguiente Paso
                    <ChevronRight className="ml-2" size={20} />
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Test Button - Remove this after debugging */}
            <Card className="bg-yellow-50 border-yellow-200" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 font-medium">DEBUG: Probar con datos simulados</p>
                  <p className="text-yellow-700 text-sm">
                    Esto simulará datos de CSV para probar el sistema de plantillas
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const testData = [
                      { 
                        nombre: 'Juan Pérez', 
                        telefono: '3001234567', 
                        fecha: '2024-01-15', 
                        hora: '14:30', 
                        doctor: 'Dr. García',
                        servicio: 'Consulta General',
                        ubicacion: 'Consultorio 201'
                      },
                      { 
                        nombre: 'María López', 
                        telefono: '3157894561', 
                        fecha: '2024-01-16', 
                        hora: '10:00', 
                        doctor: 'Dra. Rodríguez',
                        servicio: 'Manicure y Pedicure',
                        ubicacion: 'Salón Principal'
                      },
                      { 
                        nombre: 'Carlos Sánchez', 
                        telefono: '3226667788', 
                        fecha: '2024-01-17', 
                        hora: '16:15', 
                        doctor: 'Dr. Martínez',
                        servicio: 'Consulta Especializada',
                        ubicacion: 'Torre Médica Piso 3'
                      }
                    ]
                    
                    const testColumns = [
                      { original: 'nombre', mapped: 'nombre', type: 'text' as const, completeness: 100, required: true },
                      { original: 'telefono', mapped: 'telefono', type: 'phone' as const, completeness: 100, required: true },
                      { original: 'fecha', mapped: 'fecha', type: 'date' as const, completeness: 100, required: false },
                      { original: 'hora', mapped: 'hora', type: 'time' as const, completeness: 100, required: false },
                      { original: 'doctor', mapped: 'doctor', type: 'text' as const, completeness: 100, required: false },
                      { original: 'servicio', mapped: 'servicio', type: 'text' as const, completeness: 100, required: false },
                      { original: 'ubicacion', mapped: 'ubicacion', type: 'text' as const, completeness: 100, required: false }
                    ]
                    
                    console.log('Test button - setting test data:', { testData, testColumns })
                    setCsvData(testData)
                    setAvailableColumns(testColumns)
                    setContactsCount(testData.length)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Usar Datos de Prueba
                </Button>
              </div>
            </Card>
            
          </div>
        )}

        {/* Step 2: Select Template */}
        {currentStep === 'template' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Templates Section */}
            <div className="lg:col-span-2">
              {/* Campaign Template Selector - Shows all available templates */}
              <CampaignTemplatesSelector
                onSelectTemplate={(template) => {
                  // Convert Template interface from campaign selector to local Template format
                  const convertedTemplate = {
                    id: template.id,
                    name: template.name,
                    category: template.category,
                    preview: template.content,
                    requiredVariables: template.variables,
                    optionalVariables: [],
                    usageCount: 0,
                    description: `${template.status === 'active' ? 'Activa' : 'Aprobada'}`,
                    twilioSid: template.twilioSid
                  }
                  setSelectedTemplate(convertedTemplate)
                  setMessage(template.content)
                }}
                selectedTemplate={selectedTemplate}
              />
            </div>
            
            {/* Template Preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <TemplatePreview
                  template={selectedTemplate}
                  availableColumns={availableColumns}
                  csvData={csvData}
                  onVariableMapping={setVariableMappings}
                  onDefaultValues={setDefaultValues}
                />
                
                {/* Debug info */}
                {availableColumns.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                    <strong>Debug:</strong> {availableColumns.length} columnas disponibles: {' '}
                    {availableColumns.map(col => `${col.original}(${col.mapped})`).join(', ')}
                  </div>
                )}
                
                {/* Navigation */}
                {selectedTemplate && (
                  <div className="mt-6 space-y-3">
                    <Button
                      size="lg"
                      className="w-full gradient-primary cta-glow"
                      onClick={() => setCurrentStep('review')}
                    >
                      Continuar a Revisión
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => setCurrentStep('upload')}
                    >
                      Atrás
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review and Send */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <Card className="bg-white" padding="lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Revise antes de enviar
              </h2>
              
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Users className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Destinatarios</p>
                      <p className="text-xl font-bold text-gray-900">{contactsCount}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-green-100">
                      <MessageSquare className="text-green-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Caracteres</p>
                      <p className="text-xl font-bold text-gray-900">{message.length}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-purple-100">
                      <Clock className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tiempo estimado</p>
                      <p className="text-xl font-bold text-gray-900">5 min</p>
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Vista previa del mensaje</h3>
                  <Card className="bg-gray-50" padding="md">
                    <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
                  </Card>
                </div>

                {/* Privacy Notice */}
                <Card className="bg-blue-50 border-blue-200" padding="md">
                  <div className="flex items-start space-x-3">
                    <Shield className="text-blue-600 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="font-medium text-blue-900">Recordatorio de Privacidad</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Todos los datos serán eliminados automáticamente después del envío.
                        No conservamos ninguna información personal.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setCurrentStep('template')}
              >
                Atrás
              </Button>
              <Button 
                size="lg" 
                className={
                  user && user.messagesUsed >= user.messagesLimit
                    ? "bg-red-600 hover:bg-red-700 text-white cursor-not-allowed"
                    : "gradient-primary cta-glow"
                }
                onClick={user && user.messagesUsed >= user.messagesLimit 
                  ? () => router.push('/dashboard/upgrade')
                  : sendMessages
                }
                disabled={isLoading}
              >
                <Send className="mr-2" size={20} />
                {user && user.messagesUsed >= user.messagesLimit 
                  ? '¡Comprar Plan para Enviar!'
                  : isLoading 
                    ? 'Enviando...' 
                    : `Enviar ${contactsCount} Mensajes`
                }
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Sending Messages */}
        {currentStep === 'sending' && (
          <div className="flex justify-center items-center py-20">
            <Card className="bg-white text-center" padding="xl">
              <div className="space-y-6">
                {!campaignResult ? (
                  <>
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
                    <h2 className="text-2xl font-semibold text-gray-900">Enviando mensajes...</h2>
                    <p className="text-gray-600">
                      Por favor espere mientras procesamos {contactsCount} mensajes
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">¡Mensajes enviados!</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{campaignResult.sent}</p>
                          <p className="text-sm text-green-700">Enviados exitosamente</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">{campaignResult.errors}</p>
                          <p className="text-sm text-red-700">Errores</p>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Total procesados: <span className="font-semibold">{campaignResult.total}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center space-x-4">
                      <Button 
                        onClick={() => {
                          setCurrentStep('upload')
                          setCampaignResult(null)
                          setCsvData([])
                          setAvailableColumns([])
                          setSelectedTemplate(null)
                          setVariableMappings({})
                          setDefaultValues({})
                          setContactsCount(0)
                        }}
                        variant="outline"
                      >
                        Enviar Nuevos Mensajes
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep('review')}
                        className="gradient-primary"
                      >
                        Regresar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* AI Assistant */}
      <AIAssistant
        availableColumns={availableColumns}
        templates={[]} // This would be populated with compatible templates
        onTemplateRecommend={(template) => {
          setSelectedTemplate(template)
          setMessage(template.preview)
          setCurrentStep('template')
        }}
        onCustomTemplateRequest={() => setShowCustomTemplateService(true)}
      />
      
      {/* Custom Template Service */}
      <CustomTemplateService
        isOpen={showCustomTemplateService}
        onClose={() => setShowCustomTemplateService(false)}
        onSubmit={(request) => {
          console.log('Custom template request:', request)
          setShowCustomTemplateService(false)
          // Here you would normally send the request to your backend
          alert('Solicitud de plantilla personalizada enviada. Nos contactaremos pronto.')
        }}
        availableColumns={availableColumns.map(col => col.mapped)}
      />

      {/* Limit Exceeded Modal */}
      <LimitExceededModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        planType={user?.planType || 'free'}
        messagesUsed={user?.messagesUsed || 0}
        messagesLimit={user?.messagesLimit || 10}
        messagesRequired={limitDetails?.required || 0}
      />
    </div>
  )
}