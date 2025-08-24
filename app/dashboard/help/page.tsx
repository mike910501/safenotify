'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, HelpCircle, MessageCircle, Book, 
  Video, FileText, ChevronRight, ChevronDown,
  Mail, Phone, Clock, ExternalLink, Star,
  Lightbulb, Shield, Zap, Users, Settings,
  Send, FileText as TemplateIcon, CreditCard, BarChart3, CheckCircle
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

interface Guide {
  id: string
  title: string
  description: string
  icon: any
  estimatedTime: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  steps: number
}

export default function HelpPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [showLiveChat, setShowLiveChat] = useState(false)

  const handleGuideClick = (guideId: string) => {
    switch (guideId) {
      case 'quick-start':
        router.push('/dashboard/send')
        break
      case 'template-creation':
        router.push('/dashboard/templates')
        break
      case 'csv-formatting':
        // Descargar archivo CSV de ejemplo
        const link = document.createElement('a')
        link.href = '/ejemplo-contactos.csv'
        link.download = 'ejemplo-contactos.csv'
        link.click()
        break
      case 'analytics-guide':
        router.push('/dashboard/history')
        break
      case 'security-setup':
        router.push('/dashboard/settings')
        break
      default:
        console.log('Guía no implementada:', guideId)
    }
  }

  const categories = [
    { id: 'all', label: 'Todo', icon: HelpCircle },
    { id: 'getting-started', label: 'Primeros Pasos', icon: Lightbulb },
    { id: 'templates', label: 'Plantillas', icon: TemplateIcon },
    { id: 'campaigns', label: 'Campañas', icon: Send },
    { id: 'billing', label: 'Facturación', icon: CreditCard },
    { id: 'analytics', label: 'Estadísticas', icon: BarChart3 },
    { id: 'security', label: 'Seguridad', icon: Shield }
  ]

  const faqs: FAQ[] = [
    {
      id: '1',
      question: '¿Cómo creo mi primera campaña de mensajes?',
      answer: 'Para crear tu primera campaña: 1) Ve a "Enviar Mensajes", 2) Selecciona o crea una plantilla, 3) Sube tu archivo CSV con los contactos, 4) Personaliza las variables, 5) Revisa y envía. El proceso es muy intuitivo y te guiamos paso a paso.',
      category: 'getting-started',
      tags: ['campaña', 'envío', 'csv', 'plantilla']
    },
    {
      id: '2',
      question: '¿Qué formato debe tener mi archivo de contactos?',
      answer: 'El archivo debe ser CSV con las columnas: nombre, telefono (formato +57XXXXXXXXXX), y cualquier variable personalizada que uses en tu plantilla. La primera fila debe contener los encabezados. Ejemplo: nombre,telefono,empresa\nJuan,+573001234567,ACME Corp',
      category: 'campaigns',
      tags: ['csv', 'formato', 'contactos', 'teléfono']
    },
    {
      id: '3',
      question: '¿Cómo funciona el sistema de aprobación de plantillas?',
      answer: 'Las plantillas pasan por un proceso de revisión: 1) Creas tu plantilla en Template Studio, 2) Nuestro sistema IA la revisa automáticamente, 3) Si necesita ajustes, recibir\ás sugerencias, 4) Una vez aprobada, puedes usarla en tus campañas. Este proceso garantiza que tus mensajes cumplan con las políticas de WhatsApp.',
      category: 'templates',
      tags: ['plantilla', 'aprobación', 'ai', 'whatsapp']
    },
    {
      id: '4',
      question: '¿Por qué algunos mensajes no se entregan?',
      answer: 'Los mensajes pueden fallar por varias razones: números inválidos, teléfonos bloqueados, problemas de conectividad, o violaciones de políticas. En tu historial de campañas puedes ver las estadísticas detalladas y razones específicas de fallas para optimizar futuras campañas.',
      category: 'analytics',
      tags: ['entrega', 'fallas', 'estadísticas', 'whatsapp']
    },
    {
      id: '5',
      question: '¿Cómo actualizo mi plan o compro más mensajes?',
      answer: 'Ve a "Planes y Precios" en el menú lateral, selecciona el plan que más te convenga y procede al checkout. Los pagos se procesan de forma segura a través de Wompi. Tu nuevo plan se activa inmediatamente después del pago exitoso.',
      category: 'billing',
      tags: ['plan', 'upgrade', 'pago', 'mensajes']
    },
    {
      id: '6',
      question: '¿Es seguro subir mis contactos a SafeNotify?',
      answer: 'Absolutamente. Tus datos están protegidos con encriptación de grado militar y se eliminan automáticamente después de cada campaña. No almacenamos información de contactos permanentemente. Cumplimos con GDPR y todas las regulaciones de privacidad.',
      category: 'security',
      tags: ['seguridad', 'privacidad', 'gdpr', 'encriptación']
    },
    {
      id: '7',
      question: '¿Puedo programar el envío de mis mensajes?',
      answer: 'Actualmente SafeNotify envía los mensajes inmediatamente. La función de programación está en desarrollo y estará disponible próximamente. Mientras tanto, puedes preparar tu campaña y enviarla cuando desees.',
      category: 'campaigns',
      tags: ['programación', 'envío', 'horario', 'futuro']
    },
    {
      id: '8',
      question: '¿Qué significa la tasa de entrega en mis estadísticas?',
      answer: 'La tasa de entrega es el porcentaje de mensajes que llegaron exitosamente a los destinatarios. Se calcula como: (Mensajes entregados / Mensajes enviados) × 100. Una buena tasa está por encima del 95%. Factores como calidad de números y contenido del mensaje afectan esta métrica.',
      category: 'analytics',
      tags: ['tasa', 'entrega', 'estadísticas', 'métricas']
    }
  ]

  const guides: Guide[] = [
    {
      id: 'quick-start',
      title: 'Guía de Inicio Rápido',
      description: 'Comienza enviando tu primera campaña ahora mismo',
      icon: Zap,
      estimatedTime: '5 min',
      difficulty: 'beginner',
      steps: 4
    },
    {
      id: 'template-creation',
      title: 'Crear Plantillas Efectivas',
      description: 'Accede a Template Studio para diseñar plantillas profesionales',
      icon: TemplateIcon,
      estimatedTime: '15 min',
      difficulty: 'intermediate',
      steps: 8
    },
    {
      id: 'csv-formatting',
      title: 'Formato de Archivos CSV',
      description: 'Descarga plantilla de ejemplo y aprende el formato correcto',
      icon: FileText,
      estimatedTime: '8 min',
      difficulty: 'beginner',
      steps: 5
    },
    {
      id: 'analytics-guide',
      title: 'Interpretar tus Estadísticas',
      description: 'Ve tus campañas anteriores y aprende de los resultados',
      icon: BarChart3,
      estimatedTime: '12 min',
      difficulty: 'intermediate',
      steps: 6
    },
    {
      id: 'security-setup',
      title: 'Configurar Seguridad',
      description: 'Accede a configuración para personalizar tu cuenta',
      icon: Shield,
      estimatedTime: '5 min',
      difficulty: 'beginner',
      steps: 3
    },
    {
      id: 'advanced-campaigns',
      title: 'Campañas Avanzadas',
      description: 'Técnicas avanzadas para campañas de alto impacto',
      icon: Users,
      estimatedTime: '25 min',
      difficulty: 'advanced',
      steps: 12
    }
  ]

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
    
    return matchesSearch && matchesCategory
  })

  const getDifficultyColor = (difficulty: Guide['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: Guide['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'Principiante'
      case 'intermediate': return 'Intermedio'
      case 'advanced': return 'Avanzado'
      default: return difficulty
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Centro de Ayuda
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Encuentra respuestas rápidas y aprende a sacar el máximo provecho de SafeNotify
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Busca tu pregunta aquí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-lg text-gray-900"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-all duration-300" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Chat en Vivo
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Habla directamente con nuestro equipo de soporte
              </p>
              <Button 
                onClick={() => setShowLiveChat(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Iniciar Chat
              </Button>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-all duration-300" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Email Soporte
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Envíanos un email y te responderemos en 24h
              </p>
              <Button 
                onClick={() => window.location.href = 'mailto:support@safenotify.com?subject=Consulta SafeNotify'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-all duration-300" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Video Tutoriales
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Aprende paso a paso con nuestros videos
              </p>
              <Button 
                onClick={() => alert('Los tutoriales en video estarán disponibles próximamente.')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Próximamente
              </Button>
            </div>
          </Card>
        </div>

        {/* Category Filters */}
        <Card className="bg-white" padding="lg">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.id
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.label}
                </button>
              )
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Preguntas Frecuentes
              </h2>
              <span className="text-sm text-gray-500">
                {filteredFAQs.length} {filteredFAQs.length === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>

            {filteredFAQs.length > 0 ? (
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="bg-white hover:shadow-md transition-all duration-300" padding="none">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">
                        {faq.question}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedFAQ === faq.id ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-4 animate-fade-in-down">
                        <div className="border-t pt-4">
                          <p className="text-gray-600 leading-relaxed mb-4">
                            {faq.answer}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {faq.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white text-center py-12" padding="lg">
                <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No encontramos resultados
                </h3>
                <p className="text-gray-600 mb-4">
                  Intenta con diferentes palabras clave o explora nuestras guías
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm('')
                    setActiveCategory('all')
                  }}
                  variant="outline"
                >
                  Limpiar Filtros
                </Button>
              </Card>
            )}
          </div>

          {/* Guides Sidebar */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Guías Paso a Paso
              </h2>
              
              <div className="space-y-4">
                {guides.map((guide) => {
                  const Icon = guide.icon
                  return (
                    <Card 
                      key={guide.id} 
                      className="bg-white hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105" 
                      padding="lg"
                      onClick={() => handleGuideClick(guide.id)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                            {guide.title}
                            {guide.id === 'csv-formatting' && (
                              <ExternalLink className="w-4 h-4 ml-2 text-gray-400" />
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {guide.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {guide.estimatedTime}
                              </div>
                              <div className="flex items-center">
                                <Book className="w-3 h-3 mr-1" />
                                {guide.steps} pasos
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getDifficultyColor(guide.difficulty)}`}>
                              {getDifficultyLabel(guide.difficulty)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Contact Info */}
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200" padding="lg">
              <h3 className="font-semibold text-gray-900 mb-4">
                ¿Necesitas más ayuda?
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-gray-700">
                  <Mail className="w-4 h-4 mr-3 text-primary-600" />
                  support@safenotify.com
                </div>
                <div className="flex items-center text-gray-700">
                  <Phone className="w-4 h-4 mr-3 text-primary-600" />
                  +57 300 214 6502
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-3 text-primary-600" />
                  Lun - Vie, 9AM - 6PM COT
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-primary-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tiempo de respuesta promedio</span>
                  <span className="font-medium text-gray-900">2 horas</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Satisfacción del cliente</span>
                  <div className="flex items-center">
                    <div className="flex items-center mr-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="font-medium text-gray-900">4.9/5</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Live Chat Modal */}
        {showLiveChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="bg-white w-full max-w-md" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Chat de Soporte
                </h3>
                <button
                  onClick={() => setShowLiveChat(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-semibold">SA</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Soporte SafeNotify</p>
                      <p className="text-xs text-gray-500">En línea ahora</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">
                    ¡Hola! 👋 Soy parte del equipo de SafeNotify. ¿En qué puedo ayudarte hoy?
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Respuesta típica en menos de 2 minutos
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}