'use client'

import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, Crown, TrendingUp } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'

interface UpgradeCtaProps {
  variant?: 'banner' | 'card' | 'inline' | 'sidebar'
  currentPlan?: string
  messagesUsed?: number
  messagesLimit?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  urgent?: boolean
}

export function UpgradeCta({ 
  variant = 'card',
  currentPlan = 'free',
  messagesUsed = 0,
  messagesLimit = 10,
  className = '',
  size = 'md',
  showProgress = false,
  urgent = false
}: UpgradeCtaProps) {
  const router = useRouter()
  
  const usagePercentage = messagesLimit > 0 ? (messagesUsed / messagesLimit) * 100 : 0
  const isNearLimit = usagePercentage >= 80
  const isAtLimit = messagesUsed >= messagesLimit

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Gratuito'
      case 'basic': return 'Básico'
      case 'pro': return 'Pro'
      case 'enterprise': return 'Enterprise'
      default: return 'Gratuito'
    }
  }

  const getNextPlan = (current: string) => {
    switch (current) {
      case 'free': return { name: 'Básico', price: '$25,000' }
      case 'basic': return { name: 'Pro', price: '$50,000' }
      case 'pro': return { name: 'Enterprise', price: '$100,000' }
      default: return { name: 'Básico', price: '$25,000' }
    }
  }

  const nextPlan = getNextPlan(currentPlan)

  // Banner variant (top of pages)
  if (variant === 'banner') {
    return (
      <div className={`${isAtLimit ? 'bg-red-50 border-red-200' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'} border rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isAtLimit ? (
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-red-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h3 className={`font-semibold ${isAtLimit ? 'text-red-900' : 'text-gray-900'}`}>
                {isAtLimit ? '¡Sin mensajes disponibles!' : 
                 isNearLimit ? '¡Quedan pocos mensajes!' : 
                 '¡Potencia tu comunicación!'}
              </h3>
              <p className={`text-sm ${isAtLimit ? 'text-red-700' : 'text-gray-600'}`}>
                {isAtLimit ? `Has usado todos tus ${messagesLimit} mensajes del plan ${getPlanName(currentPlan)}` :
                 isNearLimit ? `Has usado ${messagesUsed} de ${messagesLimit} mensajes` :
                 `Upgrade al plan ${nextPlan.name} y obtén más mensajes`}
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/dashboard/upgrade')}
            className={isAtLimit ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}
            size="sm"
          >
            {isAtLimit ? 'Comprar Plan' : 'Ver Planes'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {showProgress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Mensajes usados</span>
              <span>{messagesUsed}/{messagesLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isAtLimit ? 'bg-red-500' : 
                  isNearLimit ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <div className={`bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-lg p-4 ${className}`}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Mejora tu Plan</h4>
            <p className="text-xs text-purple-100 mt-1">
              Plan {nextPlan.name} desde {nextPlan.price}
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/upgrade')}
            size="sm"
            variant="secondary"
            className="w-full bg-white text-purple-600 hover:bg-gray-100 text-xs py-1.5"
          >
            Ver Planes
          </Button>
        </div>
      </div>
    )
  }

  // Inline variant (small, within content)
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        {isAtLimit && (
          <>
            <span className="text-red-600 text-sm font-medium">Sin mensajes</span>
            <Button
              onClick={() => router.push('/dashboard/upgrade')}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-xs px-3 py-1"
            >
              Comprar Plan
            </Button>
          </>
        )}
        {!isAtLimit && isNearLimit && (
          <>
            <span className="text-yellow-600 text-sm">Pocos mensajes restantes</span>
            <Button
              onClick={() => router.push('/dashboard/upgrade')}
              size="sm"
              variant="outline"
              className="text-xs px-3 py-1"
            >
              Upgrade
            </Button>
          </>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <Card className={`bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 ${className}`} padding="lg">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6 text-white" />
        </div>
        
        <div>
          <h3 className="font-bold text-gray-900 mb-2">
            {isAtLimit ? '¡Sin mensajes disponibles!' : 
             isNearLimit ? 'Quedan pocos mensajes' : 
             'Potencia tu comunicación'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {isAtLimit ? 
              `Actualiza tu plan para continuar enviando mensajes` :
              `Upgrade al plan ${nextPlan.name} y obtén más mensajes por solo ${nextPlan.price}/mes`
            }
          </p>
        </div>

        {showProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Uso actual</span>
              <span>{messagesUsed}/{messagesLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isAtLimit ? 'bg-red-500' : 
                  isNearLimit ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {usagePercentage.toFixed(0)}% utilizado
            </p>
          </div>
        )}

        <Button
          onClick={() => router.push('/dashboard/upgrade')}
          className={`w-full ${isAtLimit ? 
            'bg-red-600 hover:bg-red-700' : 
            'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          }`}
          size={size}
        >
          <Crown className="w-4 h-4 mr-2" />
          {isAtLimit ? 'Comprar Plan Ahora' : 'Ver Todos los Planes'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}