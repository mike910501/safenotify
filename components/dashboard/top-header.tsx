'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Bell, ChevronDown, User, Settings, LogOut, ChevronRight, MessageSquare, CreditCard } from 'lucide-react'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface TopHeaderProps {
  userName?: string
}

interface UserData {
  name: string
  email: string
  planType: string
}

export function TopHeader({ userName: propUserName }: TopHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [hasNotifications, setHasNotifications] = useState(true)
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
  }, [])

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
          <button
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group"
            aria-label="Notificaciones"
          >
            <AnimatedIcon
              icon={Bell}
              size={20}
              className="text-gray-600 group-hover:text-gray-900 transition-colors"
            />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

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