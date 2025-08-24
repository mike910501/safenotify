'use client'

import { useState, useEffect } from 'react'
import { 
  Send, FileText, Clock, Shield, ArrowRight, Upload, 
  Trash2, CheckCircle, AlertCircle, Bot, TrendingUp,
  User, LogOut, CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UpgradeCta } from '@/components/ui/upgrade-cta'

// Animated counter component
function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number | null = null
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      setCount(Math.floor(progress * end))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [end, duration])
  
  return <span>{count.toLocaleString('es-CO')}</span>
}

// Countdown timer component
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 30
  })
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev
        
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        } else {
          // Reset to 24 hours
          return { hours: 23, minutes: 59, seconds: 59 }
        }
        
        return { hours, minutes, seconds }
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <span className="font-mono">
      {String(timeLeft.hours).padStart(2, '0')}:
      {String(timeLeft.minutes).padStart(2, '0')}:
      {String(timeLeft.seconds).padStart(2, '0')}
    </span>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const { user: userData, loading: isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (userData) {
      fetchStats()
    }
  }, [userData])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) return

      const response = await fetch('http://localhost:3005/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })

      if (!response.ok) return

      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const statsCards = [
    {
      title: 'Mensajes Usados',
      value: userData?.messagesUsed || 0,
      icon: Send,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      description: `de ${userData?.messagesLimit || 10} disponibles`
    },
    {
      title: 'Mensajes Restantes',
      value: stats?.messagesRemaining || 0,
      icon: FileText,
      color: stats?.messagesRemaining > 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats?.messagesRemaining > 0 ? 'bg-green-100' : 'bg-red-100',
      description: `Plan ${userData?.planType || 'free'}`
    },
    {
      title: 'Campañas Creadas',
      value: stats?.totalCampaigns || 0,
      icon: TrendingUp,
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-100',
      description: 'Total histórico'
    },
    {
      title: 'Total Enviados',
      value: stats?.totalMessagesSent || 0,
      icon: Shield,
      color: 'text-dark-600',
      bgColor: 'bg-gray-100',
      description: 'En proceso ahora'
    }
  ]

  // Generate recent activity from user's campaigns
  const recentActivity = userData?.campaigns?.length > 0 
    ? userData.campaigns.map((campaign: any) => {
        const date = new Date(campaign.createdAt)
        const now = new Date()
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
        
        let timeAgo = ''
        if (diffHours < 1) {
          timeAgo = 'Hace menos de 1 hora'
        } else if (diffHours < 24) {
          timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
        } else {
          const diffDays = Math.floor(diffHours / 24)
          timeAgo = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
        }
        
        return {
          icon: campaign.status === 'completed' ? Send : FileText,
          title: campaign.name || 'Campaña sin nombre',
          description: `${campaign.sentCount || 0} enviados, ${campaign.errorCount || 0} errores`,
          time: timeAgo,
          status: campaign.status === 'completed' ? 'success' : 'info'
        }
      })
    : [
        {
          icon: FileText,
          title: 'Sin actividad reciente',
          description: 'Comienza creando tu primera campaña',
          time: 'Ahora',
          status: 'info'
        }
      ]

  // Get current date and time
  const currentDate = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Welcome Section with User Info */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 animate-fade-in-down">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Hola, {userData?.name || 'Usuario'}! Bienvenido a SafeNotify
            </h1>
            <p className="text-gray-600 capitalize">
              {currentDate}
            </p>
            <div className="mt-2 flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                <User className="inline w-4 h-4 mr-1" />
                {userData?.email}
              </span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                userData?.planType === 'free' ? 'bg-gray-100 text-gray-700' :
                userData?.planType === 'basic' ? 'bg-blue-100 text-blue-700' :
                userData?.planType === 'pro' ? 'bg-purple-100 text-purple-700' :
                'bg-gold-100 text-gold-700'
              }`}>
                Plan {userData?.planType || 'free'}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/dashboard/profile')}
            >
              <User size={16} className="mr-1" />
              Perfil
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
            >
              <LogOut size={16} className="mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      {/* Upgrade CTA Banner */}
      {userData && (
        <UpgradeCta
          variant="banner"
          currentPlan={userData.planType}
          messagesUsed={userData.messagesUsed}
          messagesLimit={userData.messagesLimit}
          showProgress={true}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          statsCards.map((stat, index) => (
            <Card
              key={index}
              className="bg-white hover:shadow-xl transition-all duration-300 group hover:scale-105"
              padding="lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <AnimatedIcon
                    icon={stat.icon}
                    size={24}
                    className={stat.color}
                    animation="pulse"
                  />
                </div>
                {index === 2 && (
                  <TrendingUp className="w-5 h-5 text-green-500 animate-bounce" />
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value === 'countdown' ? (
                  <CountdownTimer />
                ) : (
                  <AnimatedCounter end={stat.value as number} />
                )}
              </p>
              <p className="text-xs text-gray-500">
                {stat.description}
              </p>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="gradient-primary cta-glow group"
            onClick={() => router.push('/dashboard/send')}
          >
            <Send className="mr-2 group-hover:rotate-12 transition-transform" size={20} />
            Enviar Nuevo Mensaje
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 hover:scale-105 transition-transform"
            onClick={() => router.push('/dashboard/templates')}
          >
            <FileText className="mr-2" size={20} />
            Ver Plantillas
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-2 hover:scale-105 transition-transform"
            onClick={() => router.push('/dashboard/ai-assistant')}
          >
            <Bot className="mr-2" size={20} />
            Consultar IA
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Actividad Reciente
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/history')}
              className="text-primary-600 hover:text-primary-700"
            >
              Ver todo el historial
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4">
              <Skeleton height={60} />
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' ? 'bg-green-100' : 'bg-blue-100'
                  } group-hover:scale-110 transition-transform duration-200`}>
                    <activity.icon
                      size={20}
                      className={
                        activity.status === 'success' ? 'text-green-600' : 'text-blue-600'
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Privacy Reminder */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-full bg-primary-100">
            <Shield className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Tu privacidad está protegida
            </h3>
            <p className="text-sm text-gray-600">
              Todos los datos se eliminan automáticamente después de cada envío. 
              No almacenamos información personal de manera permanente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}