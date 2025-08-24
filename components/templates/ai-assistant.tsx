'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Brain, X, Send, MessageSquare, Sparkles, Target,
  TrendingUp, Users, Clock, CheckCircle, ArrowRight,
  Lightbulb, Star, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface ColumnInfo {
  original: string
  mapped: string
  type: 'text' | 'number' | 'date' | 'time' | 'phone'
  completeness: number
  required: boolean
}

interface Template {
  id: string
  name: string
  category: string
  preview: string
  requiredVariables: string[]
  compatibility: number
  usageCount: number
  description: string
}

interface AIAssistantProps {
  availableColumns: ColumnInfo[]
  templates: Template[]
  onTemplateRecommend: (template: Template) => void
  onCustomTemplateRequest: () => void
}

interface Message {
  id: string
  type: 'ai' | 'user'
  content: string
  timestamp: Date
  templates?: Template[]
  action?: 'recommend_template' | 'custom_template' | 'industry_analysis'
}

export function AIAssistant({ 
  availableColumns, 
  templates, 
  onTemplateRecommend,
  onCustomTemplateRequest 
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationStage, setConversationStage] = useState<'welcome' | 'analysis' | 'industry' | 'recommendations' | 'custom'>('welcome')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize conversation when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startConversation()
    }
  }, [isOpen])

  const addMessage = (content: string, type: 'ai' | 'user', options?: Partial<Message>) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      ...options
    }
    
    setMessages(prev => [...prev, newMessage])
  }

  const simulateTyping = async (duration: number = 1500) => {
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, duration))
    setIsTyping(false)
  }

  const analyzeUserData = () => {
    const columnNames = availableColumns.map(col => col.mapped)
    
    // Detect potential industry based on columns
    let detectedIndustry = ''
    let confidence = 0
    
    if (columnNames.some(name => ['doctor', 'medico', 'consultorio', 'paciente'].includes(name))) {
      detectedIndustry = 'salud'
      confidence = 95
    } else if (columnNames.some(name => ['servicio', 'hora', 'fecha', 'cita'].includes(name))) {
      detectedIndustry = 'servicios'
      confidence = 80
    } else if (columnNames.some(name => ['producto', 'precio', 'descuento'].includes(name))) {
      detectedIndustry = 'retail'
      confidence = 75
    } else if (columnNames.some(name => ['mesa', 'personas', 'reserva'].includes(name))) {
      detectedIndustry = 'restaurantes'
      confidence = 85
    }
    
    return { detectedIndustry, confidence, columnNames }
  }

  const getCompatibleTemplates = () => {
    return templates
      .filter(template => template.compatibility >= 70)
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 3)
  }

  const startConversation = async () => {
    await simulateTyping(1000)
    
    addMessage(
      'Hola, soy su asistente de plantillas. He analizado su archivo CSV y puedo ayudarle a encontrar la plantilla perfecta para sus necesidades.',
      'ai'
    )
    
    setTimeout(async () => {
      const analysis = analyzeUserData()
      await simulateTyping(1200)
      
      addMessage(
        `Detecté que tiene datos de: ${analysis.columnNames.join(', ')}. Esto me da una buena idea de qué tipo de comunicación necesita.`,
        'ai'
      )
      
      setTimeout(async () => {
        await simulateTyping(1000)
        
        if (analysis.detectedIndustry && analysis.confidence > 70) {
          const industryNames: Record<string, string> = {
            'salud': 'sector de salud',
            'servicios': 'servicios profesionales',
            'retail': 'comercio retail',
            'restaurantes': 'restaurantes'
          }
          
          addMessage(
            `Basado en sus columnas, parece que trabaja en ${industryNames[analysis.detectedIndustry]}. ¿Es correcto?`,
            'ai',
            { action: 'industry_analysis' }
          )
          setConversationStage('industry')
        } else {
          addMessage(
            '¿Para qué tipo de comunicación usará estos datos? Por ejemplo: recordatorios de citas, promociones, confirmaciones, etc.',
            'ai'
          )
          setConversationStage('analysis')
        }
      }, 2000)
    }, 2000)
  }

  const handleIndustryConfirmation = async (confirmed: boolean) => {
    if (confirmed) {
      addMessage('Sí, es correcto', 'user')
      
      await simulateTyping(1000)
      const compatibleTemplates = getCompatibleTemplates()
      
      addMessage(
        `Perfecto. He encontrado ${compatibleTemplates.length} plantillas altamente compatibles con sus datos. Le recomiendo estas opciones:`,
        'ai',
        {
          templates: compatibleTemplates,
          action: 'recommend_template'
        }
      )
    } else {
      addMessage('No, trabajo en otro sector', 'user')
      
      await simulateTyping(1000)
      addMessage(
        'Entendido. ¿Puede contarme más sobre su negocio y qué tipo de mensajes necesita enviar?',
        'ai'
      )
    }
    
    setConversationStage('recommendations')
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return
    
    const userMessage = inputText.trim()
    addMessage(userMessage, 'user')
    setInputText('')
    
    await simulateTyping(1200)
    
    // Simple response logic based on conversation stage
    if (conversationStage === 'analysis') {
      const compatibleTemplates = getCompatibleTemplates()
      addMessage(
        `Entiendo. Basado en su descripción y los datos disponibles, estas son mis recomendaciones:`,
        'ai',
        {
          templates: compatibleTemplates,
          action: 'recommend_template'
        }
      )
      setConversationStage('recommendations')
    } else if (conversationStage === 'recommendations') {
      addMessage(
        `Gracias por la información adicional. ¿Le gustaría que revise alguna plantilla específica o prefiere que diseñe una plantilla personalizada para sus necesidades exactas?`,
        'ai',
        { action: 'custom_template' }
      )
      setConversationStage('custom')
    } else {
      addMessage(
        `Entiendo. ¿Hay algo más en lo que pueda ayudarle con las plantillas?`,
        'ai'
      )
    }
  }

  const handleCustomTemplate = () => {
    addMessage('Me interesa una plantilla personalizada', 'user')
    onCustomTemplateRequest()
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <AnimatedIcon
            icon={Brain}
            size={24}
            className="text-white group-hover:scale-110"
            animation="pulse"
          />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-16 right-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Asistente IA
          <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border z-50 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-4 rounded-t-2xl flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <AnimatedIcon icon={Brain} size={24} animation="pulse" />
          <div>
            <h3 className="font-semibold">Asistente IA</h3>
            <p className="text-xs opacity-75">Plantillas inteligentes</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 p-1"
        >
          <X size={20} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              message.type === 'user' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-800 shadow-sm border'
            }`}>
              <p className="text-sm">{message.content}</p>
              
              {/* Template recommendations */}
              {message.templates && message.templates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                        <span className="text-xs text-green-600 font-medium">
                          {template.compatibility}% compatible
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                      <Button
                        size="sm"
                        onClick={() => onTemplateRecommend(template)}
                        className="w-full text-xs"
                      >
                        Usar esta plantilla
                        <ArrowRight size={12} className="ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Industry confirmation buttons */}
              {message.action === 'industry_analysis' && (
                <div className="flex space-x-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleIndustryConfirmation(true)}
                    className="flex-1 text-xs"
                  >
                    <CheckCircle size={12} className="mr-1" />
                    Sí
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleIndustryConfirmation(false)}
                    className="flex-1 text-xs"
                  >
                    No
                  </Button>
                </div>
              )}
              
              {/* Custom template option */}
              {message.action === 'custom_template' && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={handleCustomTemplate}
                    className="w-full text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Sparkles size={12} className="mr-1" />
                    Plantilla personalizada
                  </Button>
                </div>
              )}
              
              <p className="text-xs opacity-50 mt-2">
                {message.timestamp.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 p-3 rounded-2xl shadow-sm border max-w-[80%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-2xl">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escriba su mensaje..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-gray-900"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            size="sm"
            className="px-3"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}