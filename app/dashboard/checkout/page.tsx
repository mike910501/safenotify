'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CreditCard, Smartphone, Building2, Shield, 
  ArrowLeft, Check, Lock, AlertTriangle
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
  
  // Card form data
  const [cardData, setCardData] = useState({
    number: '',
    cvc: '',
    exp_month: '',
    exp_year: '',
    card_holder: ''
  })

  // Customer data
  const [customerData, setCustomerData] = useState({
    name: user?.name || '',
    phone: '',
    acceptance_token: ''
  })

  // PSE data
  const [pseBank, setPseBank] = useState('')

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'CARD',
      name: 'Tarjeta de Crédito/Débito',
      icon: CreditCard,
      description: 'Visa, Mastercard, American Express',
      available: true
    },
    {
      id: 'PSE',
      name: 'PSE',
      icon: Building2,
      description: 'Pago Seguro en Línea',
      available: true
    },
    {
      id: 'NEQUI',
      name: 'Nequi',
      icon: Smartphone,
      description: 'Pago con Nequi',
      available: true
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
      
      if (data.success && data.plans[planId]) {
        setPlan(data.plans[planId])
      } else {
        router.push('/dashboard/upgrade')
      }
    } catch (error) {
      console.error('Error fetching plan:', error)
      router.push('/dashboard/upgrade')
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
        setCustomerData(prev => ({
          ...prev,
          acceptance_token: data.acceptance_token
        }))
      }
    } catch (error) {
      console.error('Error fetching acceptance token:', error)
    }
  }

  const handleCardInputChange = (field: string, value: string) => {
    let formattedValue = value

    if (field === 'number') {
      // Format card number with spaces
      formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
      if (formattedValue.length > 19) return // Max length for formatted card
    } else if (field === 'cvc') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4)
    } else if (field === 'exp_month') {
      formattedValue = value.replace(/\D/g, '').slice(0, 2)
      if (parseInt(formattedValue) > 12) formattedValue = '12'
    } else if (field === 'exp_year') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4)
    }

    setCardData(prev => ({
      ...prev,
      [field]: formattedValue
    }))
  }

  const validateCardData = () => {
    if (!cardData.number || !cardData.cvc || !cardData.exp_month || !cardData.exp_year || !cardData.card_holder) {
      return 'Todos los campos de la tarjeta son requeridos'
    }

    const cleanNumber = cardData.number.replace(/\s/g, '')
    if (cleanNumber.length < 15) {
      return 'Número de tarjeta inválido'
    }

    if (cardData.cvc.length < 3) {
      return 'CVC inválido'
    }

    const expMonth = parseInt(cardData.exp_month)
    if (expMonth < 1 || expMonth > 12) {
      return 'Mes de expiración inválido'
    }

    const expYear = parseInt(cardData.exp_year)
    const currentYear = new Date().getFullYear()
    if (expYear < currentYear || expYear > currentYear + 20) {
      return 'Año de expiración inválido'
    }

    return null
  }

  const handlePayment = async () => {
    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones')
      return
    }

    if (!customerData.name || !customerData.phone) {
      setError('Nombre y teléfono son requeridos')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      const payload = {
        planType: planId,
        paymentMethod: 'CHECKOUT', // Siempre usar el checkout de Wompi
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
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!plan) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/upgrade')}
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver a planes
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form */}
        <Card className="bg-white" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Información de Pago
          </h2>

          <div className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Información Personal</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  placeholder="+57 300 123 4567"
                />
              </div>
            </div>

            {/* Payment Methods Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Métodos de Pago Disponibles</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-3">
                  Serás redirigido a la plataforma segura de Wompi donde podrás pagar con:
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-blue-700">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Tarjetas de crédito/débito (Visa, Mastercard, American Express)
                  </div>
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    PSE - Transferencia bancaria
                  </div>
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Nequi
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                Acepto los{' '}
                <a href="#" className="text-primary-600 hover:underline">
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="#" className="text-primary-600 hover:underline">
                  política de privacidad
                </a>
              </label>
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="bg-white" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Resumen del Pedido
          </h2>

          <div className="space-y-6">
            {/* Plan Details */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan seleccionado</span>
                <span className="font-medium text-gray-900">{plan.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Mensajes incluidos</span>
                <span className="font-medium text-gray-900">{plan.messages.toLocaleString('es-CO')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Duración</span>
                <span className="font-medium text-gray-900">{plan.duration} días</span>
              </div>
              
              <hr className="border-gray-200" />
              
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatPrice(plan.price)}</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Lock className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Pago 100% Seguro</h4>
                  <p className="text-sm text-green-800 mt-1">
                    Procesado por Wompi con encriptación SSL de 256 bits
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={processing || !acceptTerms}
              className="w-full bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              {processing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </div>
              ) : (
                <>
                  <Lock size={16} className="mr-2" />
                  Pagar {formatPrice(plan.price)}
                </>
              )}
            </Button>

          </div>
        </Card>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}