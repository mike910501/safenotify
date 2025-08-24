'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Search, Bell, ChevronDown, User, Settings, LogOut, ChevronRight, 
  MessageSquare, CreditCard, CheckCircle, XCircle, AlertTriangle, 
  FileText, DollarSign, Activity
} from 'lucide-react'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface TopHeaderProps {
  userName?: string
}

interface UserData {
  name: string
  email: string
  planType: string
  messagesUsed?: number
  messagesLimit?: number
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'template_approved' | 'template_rejected' | 'template_submitted' | 'payment_success' | 'messages_low' | 'plan_expiring'
  read: boolean
  createdAt: string
}

export function TopHeader({ userName: propUserName }: TopHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Get user data from localStorage or API
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserData(user)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    
    // Load notifications
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      // TODO: Aquí iría la llamada real a la API cuando se implemente
      // const response = await fetch('/api/notifications', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // })
      // const data = await response.json()
      // setNotifications(data.notifications || [])
      
      // Por ahora, no hay notificaciones
      setNotifications([])
    } catch (error) {
      console.error('Error loading notifications:', error)
      setNotifications([])
    }
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    // Aquí iría la llamada a la API para marcar como leídas
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notification.id ? { ...notif, read: true } : notif
        )
      )
    }
    
    // Redirigir según el tipo de notificación
    setShowNotifications(false)
    switch (notification.type) {
      case 'template_approved':
      case 'template_rejected':
      case 'template_submitted':
        router.push('/dashboard/templates')
        break
      case 'payment_success':
        router.push('/dashboard/upgrade')
        break
      case 'messages_low':
        router.push('/dashboard/upgrade')
        break
      default:
        break
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'template_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'template_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'template_submitted':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'payment_success':
        return <DollarSign className="w-4 h-4 text-purple-600" />
      case 'messages_low':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'plan_expiring':
        return <Activity className="w-4 h-4 text-orange-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Hace un momento'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`
    return `Hace ${Math.floor(diffInMinutes / 1440)} días`
  }

  const userName = userData?.name || propUserName || 'Usuario'

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
    return { label, path, isLast: index === pathSegments.length - 1 }
  })

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
              <span
                className={`${
                  crumb.isLast
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700 cursor-pointer transition-colors'
                }`}
                onClick={() => !crumb.isLast && router.push(crumb.path)}
              >
                {crumb.label}
              </span>
            </div>
          ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Messages Counter with Enhanced Alerts */}
          {userData && (
            (() => {
              const messagesUsed = userData.messagesUsed || 0
              const messagesLimit = userData.messagesLimit || 10
              const messagesLeft = messagesLimit - messagesUsed
              const usagePercentage = (messagesUsed / messagesLimit) * 100
              const isAtLimit = messagesUsed >= messagesLimit
              const isNearLimit = usagePercentage >= 80
              
              return (
                <div className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                  isAtLimit ? 'bg-red-100 border-2 border-red-300 animate-pulse' :
                  isNearLimit ? 'bg-yellow-100 border-2 border-yellow-300' :
                  'bg-gray-100'
                }`}>
                  <MessageSquare className={`w-4 h-4 ${
                    isAtLimit ? 'text-red-600' :
                    isNearLimit ? 'text-yellow-600' :
                    'text-gray-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isAtLimit ? 'text-red-700' :
                    isNearLimit ? 'text-yellow-700' :
                    'text-gray-700'
                  }`}>
                    {messagesLeft}
                  </span>
                  <span className={`text-xs ${
                    isAtLimit ? 'text-red-500' :
                    isNearLimit ? 'text-yellow-500' :
                    'text-gray-500'
                  }`}>
                    {isAtLimit ? 'sin mensajes' : 'mensajes'}
                  </span>
                  {isAtLimit && (
                    <button
                      onClick={() => router.push('/dashboard/upgrade')}
                      className="ml-1 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full hover:bg-red-700 transition-colors font-medium animate-bounce"
                    >
                      ¡Comprar Ahora!
                    </button>
                  )}
                  {isNearLimit && !isAtLimit && (
                    <button
                      onClick={() => router.push('/dashboard/upgrade')}
                      className="ml-1 px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full hover:bg-yellow-700 transition-colors font-medium"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              )
            })()
          )}

          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            />
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
              aria-label="Notificaciones"
            >
              <AnimatedIcon
                icon={Bell}
                size={20}
                className="text-gray-600 group-hover:text-gray-900 transition-colors"
              />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-fade-in-down max-h-96 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Notificaciones
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Marcar todo como leído
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                            !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              notification.type === 'template_approved' ? 'bg-green-100' :
                              notification.type === 'template_rejected' ? 'bg-red-100' :
                              notification.type === 'template_submitted' ? 'bg-blue-100' :
                              notification.type === 'payment_success' ? 'bg-purple-100' :
                              notification.type === 'messages_low' ? 'bg-yellow-100' :
                              'bg-gray-100'
                            }`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium mb-1">
                          No tienes notificaciones
                        </p>
                        <p className="text-gray-400 text-sm">
                          Te notificaremos sobre plantillas y campañas aquí
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowNotifications(false)
                          router.push('/dashboard/notifications')
                        }}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Ver todas las notificaciones
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {userName}
              </span>
              <ChevronDown 
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fade-in-down">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{userData?.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500">{userData?.email || 'email@example.com'}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${
                      userData?.planType === 'free' ? 'bg-gray-100 text-gray-700' :
                      userData?.planType === 'basic' ? 'bg-blue-100 text-blue-700' :
                      userData?.planType === 'pro' ? 'bg-purple-100 text-purple-700' :
                      'bg-gold-100 text-gold-700'
                    }`}>
                      Plan {userData?.planType || 'Free'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      router.push('/dashboard/profile')
                      setShowDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Mi Perfil</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/dashboard/settings')
                      setShowDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span>Configuración</span>
                  </button>
                  <div className="border-t border-gray-200 my-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}