'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Check, Zap, Crown, Rocket, CreditCard, 
  Shield, MessageSquare, Clock, ArrowRight
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
  popular?: boolean
  current?: boolean
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
            id: 'free',
            name: 'Plan Gratuito',
            price: 0,
            messages: 10,
            duration: 0,
            features: [
              '10 mensajes por mes',
              'Plantillas básicas',
              'Soporte por email',
              'Eliminación automática de datos'
            ],
            current: user?.planType === 'free'
          },
          {
            id: 'basic',
            name: data.plans.basic.name,
            price: data.plans.basic.price,
            messages: data.plans.basic.messages,
            duration: data.plans.basic.duration,
            features: [
              `${data.plans.basic.messages} mensajes por mes`,
              'Todas las plantillas incluidas',
              'Soporte prioritario',
              'Estadísticas avanzadas',
              'Eliminación automática de datos'
            ],
            current: user?.planType === 'basic'
          },
          {
            id: 'pro',
            name: data.plans.pro.name,
            price: data.plans.pro.price,
            messages: data.plans.pro.messages,
            duration: data.plans.pro.duration,
            features: [
              `${data.plans.pro.messages} mensajes por mes`,
              'Todas las plantillas incluidas',
              'Plantillas personalizadas ilimitadas',
              'Soporte 24/7 por chat',
              'Estadísticas avanzadas',
              'API de integración',
              'Eliminación automática de datos'
            ],
            popular: true,
            current: user?.planType === 'pro'
          },
          {
            id: 'enterprise',
            name: data.plans.enterprise.name,
            price: data.plans.enterprise.price,
            messages: data.plans.enterprise.messages,
            duration: data.plans.enterprise.duration,
            features: [
              `${data.plans.enterprise.messages} mensajes por mes`,
              'Todas las características Pro',
              'Soporte dedicado',
              'Integración personalizada',
              'SLA garantizado',
              'Onboarding personalizado',
              'Eliminación automática de datos'
            ],
            current: user?.planType === 'enterprise'
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
      // Para planes pagos, redirigir a la página de checkout
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

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return Shield
      case 'basic': return MessageSquare
      case 'pro': return Zap
      case 'enterprise': return Crown
      default: return Shield
    }
  }

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return 'text-gray-600'
      case 'basic': return 'text-blue-600'
      case 'pro': return 'text-purple-600'
      case 'enterprise': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getPlanBorder = (planId: string, popular?: boolean) => {
    if (popular) return 'border-purple-300 ring-2 ring-purple-100'
    switch (planId) {
      case 'free': return 'border-gray-200'
      case 'basic': return 'border-blue-200'
      case 'pro': return 'border-purple-200'
      case 'enterprise': return 'border-yellow-200'
      default: return 'border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Elige el plan perfecto para ti
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Aumenta tu capacidad de mensajería con nuestros planes diseñados para crecer contigo. 
          Todos los planes incluyen eliminación automática de datos para máxima privacidad.
        </p>
      </div>

      {/* Current Plan Info */}
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                Plan Actual: {user.planType === 'free' ? 'Gratuito' : 
                user.planType === 'basic' ? 'Básico' : 
                user.planType === 'pro' ? 'Pro' : 'Enterprise'}
              </h3>
              <p className="text-blue-700 text-sm">
                {user.messagesUsed} de {user.messagesLimit} mensajes utilizados
              </p>
            </div>
            <div className="text-right">
              <div className="w-20 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((user.messagesUsed / user.messagesLimit) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.id)
          const isCurrentPlan = plan.current
          const canSelect = !isCurrentPlan && plan.id !== 'free'
          
          return (
            <Card 
              key={plan.id}
              className={`relative bg-white transition-all duration-300 hover:shadow-lg ${getPlanBorder(plan.id, plan.popular)}`}
              padding="none"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Más Popular
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="text-center space-y-4 mb-6">
                  <div className={`w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center ${getPlanColor(plan.id)}`}>
                    <Icon size={24} />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Gratis' : formatPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 text-sm">/{plan.duration} días</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div>
                  {isCurrentPlan ? (
                    <div className="w-full py-2 px-4 bg-gray-100 text-gray-600 rounded-lg text-center font-medium">
                      Plan Actual
                    </div>
                  ) : canSelect ? (
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={processingPayment === plan.id}
                      className={`w-full ${plan.popular 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {processingPayment === plan.id ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </div>
                      ) : (
                        <>
                          Seleccionar Plan
                          <ArrowRight size={16} className="ml-1" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Plan Gratuito
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Preguntas Frecuentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              ¿Puedo cambiar de plan en cualquier momento?
            </h4>
            <p className="text-sm text-gray-600">
              Sí, puedes actualizar tu plan en cualquier momento. Los cambios se aplican inmediatamente.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              ¿Qué métodos de pago aceptan?
            </h4>
            <p className="text-sm text-gray-600">
              Aceptamos tarjetas de crédito/débito, PSE, Nequi, Daviplata y otros métodos locales.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              ¿Los datos se almacenan permanentemente?
            </h4>
            <p className="text-sm text-gray-600">
              No, todos los datos de contactos se eliminan automáticamente después del envío para proteger la privacidad.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              ¿Hay soporte técnico incluido?
            </h4>
            <p className="text-sm text-gray-600">
              Todos los planes incluyen soporte. Los planes superiores tienen soporte prioritario y 24/7.
            </p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900">Privacidad Garantizada</h4>
            <p className="text-sm text-green-800 mt-1">
              SafeNotify elimina automáticamente todos los datos de contactos después de cada envío. 
              No almacenamos información personal de manera permanente, garantizando la máxima privacidad y cumplimiento con GDPR.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}