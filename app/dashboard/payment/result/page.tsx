'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, 
  ArrowRight, RefreshCw, CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface Payment {
  id: string
  reference: string
  amount: number
  planType: string
  status: string
  createdAt: string
  processedAt?: string
}

interface Transaction {
  id: string
  status: string
  reference: string
  amount_in_cents: number
  currency: string
  created_at: string
  finalized_at?: string
  status_message?: string
}

function PaymentResultContent() {
  const { user, checkAuth } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference')
  
  const [payment, setPayment] = useState<Payment | null>(null)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    if (!reference) {
      router.push('/dashboard')
      return
    }

    checkPaymentStatus()
    
    // Check status every 5 seconds for pending payments
    const interval = setInterval(() => {
      if (payment && ['PENDING', 'IN_PROGRESS'].includes(payment.status)) {
        checkPaymentStatus(false)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [reference])

  const checkPaymentStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    if (!showLoading) setChecking(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3005/api/payments/transaction-status/${reference}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setPayment(data.payment)
        setTransaction(data.transaction)
        setLastChecked(new Date())
        
        // If payment was approved, refresh user data
        if (data.payment.status === 'APPROVED' && user?.planType !== data.payment.planType) {
          await checkAuth()
        }
        
        // Log the response for debugging
        console.log('Payment status response:', {
          status: data.payment.status,
          hasTransaction: !!data.transaction,
          note: data.note,
          wompiError: data.wompiError
        })
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: '¡Pago Exitoso!',
          message: 'Tu plan ha sido actualizado correctamente.'
        }
      case 'DECLINED':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Pago Rechazado',
          message: 'El pago fue rechazado. Por favor intenta con otro método de pago.'
        }
      case 'VOIDED':
        return {
          icon: XCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Pago Anulado',
          message: 'El pago fue anulado.'
        }
      case 'ERROR':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Error en el Pago',
          message: 'Ocurrió un error procesando el pago. Por favor contacta soporte.'
        }
      default:
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Procesando Pago',
          message: 'Tu pago está siendo procesado. Esto puede tomar unos minutos.'
        }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'basic': return 'Plan Básico'
      case 'pro': return 'Plan Pro'
      case 'enterprise': return 'Plan Enterprise'
      default: return planType
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-red-900 mb-2">
            Pago No Encontrado
          </h1>
          <p className="text-red-700">
            No pudimos encontrar información sobre este pago.
          </p>
        </div>
        
        <Button onClick={() => router.push('/dashboard')}>
          Ir al Dashboard
        </Button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(payment.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Status Card */}
      <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border`} padding="lg">
        <div className="text-center space-y-4">
          <StatusIcon className={`w-16 h-16 ${statusConfig.color} mx-auto`} />
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {statusConfig.title}
            </h1>
            <p className="text-gray-700">
              {statusConfig.message}
            </p>
          </div>

          {payment.status === 'PENDING' && (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkPaymentStatus(false)}
                disabled={checking}
                className="hover:bg-blue-50 border-blue-300"
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Consultando Wompi...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Verificar Estado Ahora
                  </>
                )}
              </Button>
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>💡 Este botón consulta directamente el estado en Wompi</p>
                <p>También se verifica automáticamente cada 5 segundos</p>
                {lastChecked && (
                  <p className="text-green-600">
                    ✓ Última verificación: {lastChecked.toLocaleTimeString('es-CO')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Details */}
      <Card className="bg-white" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Detalles del Pago
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Referencia</span>
            <span className="font-mono text-sm text-gray-900">{payment.reference}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Plan</span>
            <span className="font-medium text-gray-900">{getPlanName(payment.planType)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Monto</span>
            <span className="font-bold text-gray-900">{formatPrice(payment.amount)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Estado</span>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
              payment.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
              payment.status === 'DECLINED' ? 'bg-red-100 text-red-800' :
              payment.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {payment.status}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha de creación</span>
            <span className="text-gray-900">{formatDate(payment.createdAt)}</span>
          </div>
          
          {payment.processedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de procesamiento</span>
              <span className="text-gray-900">{formatDate(payment.processedAt)}</span>
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {transaction && (
          <>
            <hr className="my-6 border-gray-200" />
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Detalles de Transacción</h3>
              
              <div className="flex justify-between">
                <span className="text-gray-600">ID de Transacción</span>
                <span className="font-mono text-sm text-gray-900">{transaction.id}</span>
              </div>
              
              {transaction.status_message && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Mensaje</span>
                  <span className="text-gray-900">{transaction.status_message}</span>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {payment.status === 'APPROVED' ? (
          <>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Ir al Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard/send')}
              className="flex-1"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Enviar Mensajes
            </Button>
          </>
        ) : payment.status === 'DECLINED' || payment.status === 'ERROR' ? (
          <>
            <Button 
              onClick={() => router.push('/dashboard/upgrade')}
              className="flex-1"
            >
              Intentar Nuevamente
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Ir al Dashboard
            </Button>
          </>
        ) : (
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="w-full"
          >
            Ir al Dashboard
          </Button>
        )}
      </div>

      {/* Help Section */}
      {payment.status !== 'APPROVED' && (
        <Card className="bg-blue-50 border-blue-200" padding="lg">
          <h3 className="font-medium text-blue-900 mb-2">
            ¿Necesitas Ayuda?
          </h3>
          <p className="text-blue-800 text-sm mb-4">
            Si tienes problemas con tu pago o necesitas asistencia, no dudes en contactarnos.
          </p>
          <Button 
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            Contactar Soporte
          </Button>
        </Card>
      )}
    </div>
  )
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  )
}