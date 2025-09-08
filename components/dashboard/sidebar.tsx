'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Send, FileText, Clock, Bot, Settings, HelpCircle, 
  ChevronLeft, ChevronRight, Shield, User, LogOut, CreditCard, UserCog, MessageSquare,
  BarChart3
} from 'lucide-react'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { UpgradeCta } from '@/components/ui/upgrade-cta'

interface SidebarProps {
  userName?: string
  userEmail?: string
  user?: any
}

export function Sidebar({ userName = 'Usuario', userEmail = 'usuario@empresa.com', user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Enviar Mensajes', href: '/dashboard/send', icon: Send },
    { name: 'Template Studio', href: '/dashboard/templates', icon: FileText, isTemplateStudio: true },
    { name: 'CRM WhatsApp', href: '/dashboard/crm', icon: MessageSquare, isCRM: true },
    { name: 'CRM Analytics', href: '/dashboard/crm/analytics', icon: BarChart3, isCRMAnalytics: true },
    { name: 'Historial', href: '/dashboard/history', icon: Clock },
    { name: 'Planes y Precios', href: '/dashboard/upgrade', icon: CreditCard },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
    { name: 'Ayuda', href: '/dashboard/help', icon: HelpCircle },
  ]

  // Agregar panel de admin si el usuario es admin
  const navigation = user?.role === 'admin' 
    ? [
        ...baseNavigation.slice(0, 3), // Dashboard, Enviar, Plantillas
        { name: 'Panel Admin', href: '/admin', icon: UserCog },
        ...baseNavigation.slice(3) // Resto de opciones
      ]
    : baseNavigation

  const isActive = (href: string) => pathname === href

  return (
    <aside 
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-dark-800 text-gray-300 min-h-screen flex flex-col transition-all duration-300 ease-in-out`}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <AnimatedIcon
              icon={Shield}
              animation="pulse"
              className="text-primary-400"
              size={32}
            />
            {!isCollapsed && (
              <span className="text-xl font-bold text-white animate-fade-in">
                SafeNotify
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 group"
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isUpgradeLink = item.href === '/dashboard/upgrade'
          const isAdminLink = item.href === '/admin'
          const isTemplateStudio = (item as any).isTemplateStudio
          const isCRM = (item as any).isCRM
          const isAnalytics = (item as any).isAnalytics
          const isCRMAnalytics = (item as any).isCRMAnalytics
          const hasBadge = (item as any).badge
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                isActive(item.href)
                  ? 'bg-primary-600 text-white shadow-lg'
                  : isAdminLink
                  ? 'hover:bg-gradient-to-r hover:from-red-600 hover:to-orange-600 hover:text-white bg-gradient-to-r from-red-50 to-orange-50 text-red-700'
                  : isUpgradeLink
                  ? 'hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700'
                  : 'hover:bg-gray-700 hover:text-white'
              }`}
            >
              <AnimatedIcon
                icon={item.icon}
                size={20}
                className={`${
                  isActive(item.href) ? 'text-white' : 
                  isAdminLink ? 'text-red-600 group-hover:text-white' :
                  isUpgradeLink ? 'text-purple-600 group-hover:text-white' :
                  isTemplateStudio ? 'text-purple-500 group-hover:text-white' :
                  isCRM ? 'text-green-500 group-hover:text-white' :
                  isAnalytics ? 'text-blue-500 group-hover:text-white' :
                  isCRMAnalytics ? 'text-cyan-500 group-hover:text-white' :
                  'text-gray-400 group-hover:text-white'
                } transition-colors duration-200 flex-shrink-0`}
                animation={isActive(item.href) ? 'pulse' : undefined}
              />
              {!isCollapsed && (
                <span className="ml-3 animate-fade-in">
                  {isTemplateStudio ? (
                    <span className="bg-gradient-to-r from-purple-500 via-pink-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent font-semibold bg-[length:300%_100%] animate-gradient-x">
                      {item.name}
                    </span>
                  ) : isCRM ? (
                    <span className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 bg-clip-text text-transparent font-semibold bg-[length:300%_100%] animate-gradient-x">
                      {item.name}
                    </span>
                  ) : isAnalytics ? (
                    <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent font-semibold bg-[length:300%_100%] animate-gradient-x">
                      {item.name}
                    </span>
                  ) : isCRMAnalytics ? (
                    <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent font-semibold bg-[length:300%_100%] animate-gradient-x">
                      {item.name}
                    </span>
                  ) : (
                    item.name
                  )}
                  {isUpgradeLink && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full group-hover:bg-white group-hover:text-purple-700">
                      💎
                    </span>
                  )}
                </span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
              {isActive(item.href) && (
                <div className="absolute left-0 w-1 h-8 bg-primary-400 rounded-r-full animate-pulse-slow" />
              )}
            </Link>
          )
        })}
        
        {/* Upgrade CTA */}
        {!isCollapsed && (
          <div className="px-3 pb-4">
            <UpgradeCta variant="sidebar" />
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-700 p-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark-800 rounded-full" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 animate-fade-in">
              <p className="text-sm font-medium text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {userEmail}
              </p>
            </div>
          )}
        </div>
        
        {/* Logout Button */}
        <button
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }}
          className={`mt-4 w-full flex items-center justify-center px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200 group ${
            isCollapsed ? 'px-2' : ''
          }`}
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
          {!isCollapsed && (
            <span className="ml-2 text-sm text-gray-300 group-hover:text-white animate-fade-in">
              Cerrar Sesión
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}