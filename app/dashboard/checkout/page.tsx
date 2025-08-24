'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CreditCard, Smartphone, Building2, Shield, 
  ArrowLeft, Check, Lock, AlertTriangle, Info,
  ShieldCheck, Zap, ChevronRight, Package,
  Calendar, MessageSquare, Sparkles, BadgeCheck,
  Globe, Clock, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface Plan {
  name: string
  price: number
  messages: number
  duration: number
}

interface PaymentMethod {
  id: string
  name: string
  icon: any
  description: string
  available: boolean
  badge?: string
}

function CheckoutContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  
  const [plan, setPlan] = useState<Plan | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('CARD')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null)
  
  // Customer data mejorado
  const [customerData, setCustomerData] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    acceptance_token: ''
  })

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'CARD',
      name: 'Tarjeta de Crédito/Débito',
      icon: CreditCard,
      description: 'Visa, Mastercard, American Express, Diners',
      available: true,
      badge: 'Más usado'
    },
    {
      id: 'PSE',
      name: 'Transferencia Bancaria PSE',
      icon: Building2,
      description: 'Pago seguro desde tu banco',
      available: true,
      badge: 'Instantáneo'
    },
    {
      id: 'NEQUI',
      name: 'Nequi',
      icon: Smartphone,
      description: 'Pago rápido con tu celular',
      available: true,
      badge: 'Popular'
    }
  ]

  useEffect(() => {
    if (!planId) {
      router.push('/dashboard/upgrade')
      return
    }

    fetchPlan()
    fetchAcceptanceToken()
  }, [planId])

  const fetchPlan = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3005/api/payments/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success && data.plans[planId as string]) {
        const selectedPlan = data.plans[planId as string]
        setPlan({
          name: getPlanDisplayName(planId as string),
          price: selectedPlan.price,
          messages: selectedPlan.messages,
          duration: selectedPlan.duration
        })
      }
    } catch (error) {
      console.error('Error fetching plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAcceptanceToken = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3005/api/payments/wompi/acceptance-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setCustomerData(prev => ({ ...prev, acceptance_token: data.acceptance_token }))
      }
    } catch (error) {
      console.error('Error fetching acceptance token:', error)
    }
  }

  const getPlanDisplayName = (planId: string) => {
    switch (planId) {
      case 'basic': return 'Plan Básico'
      case 'pro': return 'Plan Profesional'
      case 'enterprise': return 'Plan Empresarial'
      default: return 'Plan'
    }
  }

  const getPlanGradient = (planId: string | null) => {
    switch (planId) {
      case 'basic': return 'from-blue-500 to-cyan-500'
      case 'pro': return 'from-purple-500 to-pink-500'
      case 'enterprise': return 'from-amber-500 to-orange-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const handlePayment = async () => {
    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones para continuar')
      return
    }

    if (!customerData.name || !customerData.phone) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      const payload = {
        planType: planId,
        paymentMethod: 'CHECKOUT',
        customerData: customerData
      }

      const response = await fetch('http://localhost:3005/api/payments/create-transaction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (data.success && data.checkoutUrl) {
        // Redirigir al checkout seguro de Wompi
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || 'Error al procesar el pago')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setProcessing(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-[600px] bg-gray-200 rounded-2xl"></div>
              <div className="h-[600px] bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!plan) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header elegante */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/upgrade')}
            className="mb-4 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Cambiar plan
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Finalizar compra
              </h1>
              <p className="text-gray-600 mt-2">
                Completa tu información para activar tu plan
              </p>
            </div>
            
            {/* Trust badges */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="flex items-center text-sm text-gray-600">
                <ShieldCheck className="w-5 h-5 text-green-500 mr-2" />
                Pago 100% seguro
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Lock className="w-5 h-5 text-blue-500 mr-2" />
                Encriptación SSL
              </div>
            </div>
          </div>
        </div>

        {/* Error Message mejorado */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error en el proceso</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Payment Form - Mejorado */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Información Personal */}
            <Card className="bg-white overflow-hidden" padding="none">
              <div className={`h-1 bg-gradient-to-r ${getPlanGradient(planId)}`} />
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <span className="text-primary-600 font-bold">1</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Información personal
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre completo *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerData.name}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                        placeholder="Juan Pérez"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono móvil *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={customerData.phone}
                        onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                        placeholder="300 123 4567"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={customerData.email}
                        disabled
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <BadgeCheck className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Usaremos este correo para enviarte la confirmación
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Métodos de Pago - Rediseñado */}
            <Card className="bg-white overflow-hidden" padding="none">
              <div className={`h-1 bg-gradient-to-r ${getPlanGradient(planId)}`} />
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <span className="text-primary-600 font-bold">2</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Método de pago
                  </h2>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium mb-1">
                        Pago 100% seguro con Wompi
                      </p>
                      <p className="text-xs text-blue-800">
                        Serás redirigido a la plataforma certificada de Wompi para completar tu pago de forma segura
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`
                        relative rounded-xl border-2 p-4 cursor-pointer transition-all
                        ${selectedPaymentMethod === method.id 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }
                      `}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      onMouseEnter={() => setHoveredMethod(method.id)}
                      onMouseLeave={() => setHoveredMethod(null)}
                    >
                      {method.badge && (
                        <div className="absolute -top-2 -right-2">
                          <span className="px-2 py-1 bg-gradient-to-r from-primary-500 to-purple-500 text-white text-xs rounded-full font-medium">
                            {method.badge}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                          ${selectedPaymentMethod === method.id 
                            ? 'bg-primary-100' 
                            : 'bg-gray-100'
                          }
                        `}>
                          <method.icon className={`
                            w-6 h-6 
                            ${selectedPaymentMethod === method.id 
                              ? 'text-primary-600' 
                              : 'text-gray-600'
                            }
                          `} />
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {method.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {method.description}
                        </p>
                      </div>
                      
                      {selectedPaymentMethod === method.id && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-5 h-5 text-primary-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
                    <img src="/api/placeholder/60/20" alt="Visa" className="h-5" />
                    <img src="/api/placeholder/60/20" alt="Mastercard" className="h-5" />
                    <img src="/api/placeholder/60/20" alt="PSE" className="h-5" />
                    <span className="font-medium">y más...</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Términos y Condiciones - Mejorado */}
            <Card className="bg-white" padding="lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                  Acepto los{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium underline">
                    términos y condiciones
                  </a>{' '}
                  y autorizo el tratamiento de mis datos según la{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium underline">
                    política de privacidad
                  </a>. 
                  Entiendo que mis datos serán eliminados automáticamente después de cada envío de mensajes.
                </label>
              </div>
            </Card>
          </div>

          {/* Order Summary - Completamente rediseñado */}
          <div className="lg:sticky lg:top-8 space-y-6 h-fit">
            <Card className="bg-white overflow-hidden shadow-xl" padding="none">
              <div className={`p-6 bg-gradient-to-r ${getPlanGradient(planId)} text-white`}>
                <h2 className="text-xl font-bold mb-2">
                  Resumen de tu compra
                </h2>
                <p className="text-sm opacity-90">
                  Plan {plan.name.replace('Plan ', '')}
                </p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Plan Features */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Package className="w-4 h-4 mr-2" />
                      Plan seleccionado
                    </div>
                    <span className="font-semibold text-gray-900">{plan.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Mensajes incluidos
                    </div>
                    <span className="font-semibold text-gray-900">
                      {plan.messages.toLocaleString('es-CO')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Vigencia
                    </div>
                    <span className="font-semibold text-gray-900">{plan.duration} días</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      Activación
                    </div>
                    <span className="font-semibold text-green-600">Inmediata</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatPrice(plan.price)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">IVA incluido</span>
                    <span className="text-gray-900">$0</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">Total a pagar</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      *Precio final en pesos colombianos
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handlePayment}
                  disabled={processing || !acceptTerms || !customerData.name || !customerData.phone}
                  className={`
                    w-full py-6 text-base font-semibold rounded-xl
                    bg-gradient-to-r ${getPlanGradient(planId)}
                    hover:shadow-lg transition-all duration-300
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transform hover:scale-[1.02] active:scale-[0.98]
                  `}
                >
                  {processing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                      Procesando...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Lock className="w-5 h-5 mr-2" />
                      Pagar de forma segura
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </div>
                  )}
                </Button>

                {/* Security badges */}
                <div className="flex items-center justify-center space-x-4 pt-4">
                  <div className="flex items-center text-xs text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-green-500 mr-1" />
                    Pago seguro
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Lock className="w-4 h-4 text-blue-500 mr-1" />
                    256-bit SSL
                  </div>
                </div>
              </div>
            </Card>

            {/* Garantías */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" padding="md">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    Garantía de satisfacción
                  </h4>
                  <p className="text-xs text-green-800 leading-relaxed">
                    Si no estás satisfecho con tu plan, puedes cancelar en cualquier momento sin penalizaciones.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-[600px] bg-gray-200 rounded-2xl"></div>
              <div className="h-[600px] bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}