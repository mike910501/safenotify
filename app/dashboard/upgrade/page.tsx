'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Check, Zap, Crown, Rocket, CreditCard, 
  Shield, MessageSquare, Clock, ArrowRight,
  Star, TrendingUp, Users, Headphones, Award,
  ChevronRight, Sparkles, Activity, Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface Plan {
  id: string
  name: string
  price: number
  messages: number
  duration: number
  features: string[]
  highlights?: string[]
  popular?: boolean
  current?: boolean
  badge?: string
}

interface WompiConfig {
  environment: string
  publicKey: string
  configured: boolean
}

export default function UpgradePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [wompiConfig, setWompiConfig] = useState<WompiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
    fetchWompiConfig()
  }, [])

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3005/api/payments/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        const formattedPlans: Plan[] = [
          {
            id: 'basic',
            name: 'Básico',
            price: data.plans.basic.price,
            messages: data.plans.basic.messages,
            duration: data.plans.basic.duration,
            features: [
              `${data.plans.basic.messages} mensajes mensuales`,
              'Plantillas prediseñadas',
              'Eliminación automática de datos',
              'Soporte por email en horario laboral',
              'Panel de control intuitivo'
            ],
            highlights: ['Ideal para pequeños negocios'],
            current: user?.planType === 'basic',
            badge: 'Empieza aquí'
          },
          {
            id: 'pro',
            name: 'Profesional',
            price: data.plans.pro.price,
            messages: data.plans.pro.messages,
            duration: data.plans.pro.duration,
            features: [
              `${data.plans.pro.messages} mensajes mensuales`,
              'Todas las plantillas + personalizadas',
              'Eliminación automática garantizada',
              'Soporte prioritario 12/7',
              'Análisis y estadísticas detalladas',
              'Programación avanzada de envíos',
              'Segmentación de contactos'
            ],
            highlights: ['El favorito de nuestros clientes'],
            popular: true,
            current: user?.planType === 'pro',
            badge: 'Más vendido'
          },
          {
            id: 'enterprise',
            name: 'Empresarial',
            price: data.plans.enterprise.price,
            messages: data.plans.enterprise.messages,
            duration: data.plans.enterprise.duration,
            features: [
              `${data.plans.enterprise.messages} mensajes mensuales`,
              'Plantillas ilimitadas con IA',
              'Eliminación certificada con reportes',
              'Soporte dedicado 24/7',
              'Dashboard ejecutivo con KPIs',
              'API de integración completa',
              'Múltiples usuarios y roles',
              'Compliance y auditoría'
            ],
            highlights: ['Máximo rendimiento y control'],
            current: user?.planType === 'enterprise',
            badge: 'Premium'
          }
        ]
        
        setPlans(formattedPlans)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWompiConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3005/api/payments/wompi/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setWompiConfig(data.config)
      }
    } catch (error) {
      console.error('Error fetching Wompi config:', error)
    }
  }

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free' || planId === user?.planType) return

    setProcessingPayment(planId)

    try {
      router.push(`/dashboard/checkout?plan=${planId}`)
    } catch (error) {
      console.error('Error selecting plan:', error)
      setProcessingPayment(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const getPlanGradient = (planId: string) => {
    switch (planId) {
      case 'basic': return 'from-blue-500 to-cyan-500'
      case 'pro': return 'from-purple-500 to-pink-500'
      case 'enterprise': return 'from-amber-500 to-orange-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getPlanAccent = (planId: string) => {
    switch (planId) {
      case 'basic': return 'blue'
      case 'pro': return 'purple'
      case 'enterprise': return 'amber'
      default: return 'gray'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-lg w-96 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-full max-w-2xl mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[600px] bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header mejorado */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-100 to-purple-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary-600 mr-2" />
            <span className="text-sm font-semibold text-primary-700">
              Planes diseñados para tu éxito
            </span>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Potencia tu comunicación empresarial
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Elige el plan que mejor se adapte a tu negocio. Sin contratos a largo plazo, 
            cancela cuando quieras. Tu privacidad siempre protegida.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-8 pt-8">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">100% Privacidad</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">+1000 Empresas</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">Cobertura Nacional</span>
            </div>
          </div>
        </div>

        {/* Current Plan Banner - Mejorado */}
        {user && user.planType !== 'free' && (
          <div className="mb-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-purple-500 p-[2px]">
            <div className="bg-white rounded-2xl p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tu plan actual: {' '}
                      <span className="text-primary-600">
                        {user.planType === 'basic' ? 'Básico' : 
                         user.planType === 'pro' ? 'Profesional' : 'Empresarial'}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Has usado {user.messagesUsed} de {user.messagesLimit} mensajes este mes
                    </p>
                  </div>
                </div>
                
                <div className="w-full md:w-64">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>Uso mensual</span>
                    <span className="font-medium">
                      {Math.round((user.messagesUsed / user.messagesLimit) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${Math.min((user.messagesUsed / user.messagesLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid - Completamente rediseñado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.current
            const canSelect = !isCurrentPlan && plan.id !== 'free'
            const accent = getPlanAccent(plan.id)
            
            return (
              <div
                key={plan.id}
                className={`relative group ${plan.popular ? 'md:-mt-4' : ''}`}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                {/* Badge elegante */}
                {plan.badge && (
                  <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 z-10`}>
                    <div className={`
                      px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg
                      ${plan.popular 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                        : `bg-gradient-to-r ${getPlanGradient(plan.id)}`
                      }
                    `}>
                      {plan.badge}
                    </div>
                  </div>
                )}

                <Card 
                  className={`
                    relative h-full bg-white overflow-hidden
                    transition-all duration-500 ease-out
                    ${hoveredPlan === plan.id ? 'shadow-2xl scale-[1.02]' : 'shadow-lg'}
                    ${plan.popular ? 'ring-2 ring-purple-200' : ''}
                    ${isCurrentPlan ? 'ring-2 ring-primary-200' : ''}
                    hover:ring-2 hover:ring-${accent}-200
                  `}
                  padding="none"
                >
                  {/* Gradient header */}
                  <div className={`
                    h-2 bg-gradient-to-r ${getPlanGradient(plan.id)}
                  `} />

                  <div className="p-8">
                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </h3>
                      
                      {plan.highlights && (
                        <p className="text-sm text-gray-500 italic">
                          {plan.highlights[0]}
                        </p>
                      )}

                      {/* Price display mejorado */}
                      <div className="mt-6 space-y-1">
                        <div className="flex items-baseline justify-center">
                          <span className="text-5xl font-bold text-gray-900">
                            {formatPrice(plan.price).split('$')[1].split('.')[0]}
                          </span>
                          <span className="text-lg text-gray-500 ml-2">mil</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          por {plan.duration} días
                        </p>
                      </div>

                      {/* Messages badge */}
                      <div className="mt-4 inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-full">
                        <MessageSquare className="w-4 h-4 text-gray-600 mr-2" />
                        <span className="text-sm font-medium text-gray-700">
                          {plan.messages.toLocaleString()} mensajes/mes
                        </span>
                      </div>
                    </div>

                    {/* Features con mejor diseño */}
                    <div className="space-y-4 mb-8">
                      {plan.features.map((feature, fIndex) => (
                        <div 
                          key={fIndex} 
                          className="flex items-start space-x-3 group/item"
                        >
                          <div className={`
                            w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                            bg-${accent}-100 group-hover/item:bg-${accent}-200 transition-colors
                          `}>
                            <Check className={`w-3 h-3 text-${accent}-600`} />
                          </div>
                          <span className="text-sm text-gray-600 leading-relaxed">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button mejorado */}
                    <div className="mt-auto">
                      {isCurrentPlan ? (
                        <div className="w-full py-3 px-4 bg-gray-100 text-gray-600 rounded-xl text-center font-medium">
                          <div className="flex items-center justify-center space-x-2">
                            <Award className="w-4 h-4" />
                            <span>Plan Actual</span>
                          </div>
                        </div>
                      ) : canSelect ? (
                        <Button
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={processingPayment === plan.id}
                          className={`
                            w-full py-6 text-base font-semibold rounded-xl
                            transition-all duration-300 transform
                            ${plan.popular 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl' 
                              : `bg-gradient-to-r ${getPlanGradient(plan.id)} text-white hover:shadow-lg`
                            }
                            hover:scale-[1.02] active:scale-[0.98]
                          `}
                        >
                          {processingPayment === plan.id ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                              Procesando...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span>Elegir este plan</span>
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </div>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Seguridad Garantizada
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Encriptación de extremo a extremo y eliminación automática de datos
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Headphones className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Soporte Dedicado
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Equipo de expertos disponible para ayudarte en cada paso
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Crece Sin Límites
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Actualiza o cambia tu plan en cualquier momento sin penalizaciones
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section mejorada */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">
              Preguntas frecuentes
            </h3>
            <p className="text-gray-600 mt-2">
              Todo lo que necesitas saber sobre nuestros planes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                q: '¿Puedo cambiar de plan después?',
                a: 'Por supuesto. Puedes actualizar o cambiar tu plan en cualquier momento desde tu panel de control. Los cambios se aplican inmediatamente.'
              },
              {
                q: '¿Qué métodos de pago aceptan?',
                a: 'Aceptamos todas las tarjetas de crédito y débito, PSE para transferencias bancarias, y billeteras digitales como Nequi y Daviplata.'
              },
              {
                q: '¿Mis datos están seguros?',
                a: 'Absolutamente. Usamos encriptación de grado bancario y eliminamos automáticamente todos los datos de contactos después de cada envío.'
              },
              {
                q: '¿Hay contratos o permanencia?',
                a: 'No. Todos nuestros planes son mes a mes sin contratos ni cláusulas de permanencia. Cancela cuando quieras.'
              }
            ].map((faq, i) => (
              <div key={i} className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  {faq.q}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed ml-4">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            ¿Necesitas ayuda eligiendo el plan correcto?
          </p>
          <Button
            variant="outline"
            className="border-2 hover:bg-gray-50"
            onClick={() => window.location.href = 'mailto:soporte@safenotify.com'}
          >
            <Headphones className="w-4 h-4 mr-2" />
            Hablar con ventas
          </Button>
        </div>
      </div>
    </div>
  )
}