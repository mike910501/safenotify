'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, X, Zap, MessageSquare } from 'lucide-react'

interface LimitExceededModalProps {
  isOpen: boolean
  onClose: () => void
  planType: string
  messagesUsed: number
  messagesLimit: number
  messagesRequired: number
}

export function LimitExceededModal({
  isOpen,
  onClose,
  planType,
  messagesUsed,
  messagesLimit,
  messagesRequired
}: LimitExceededModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const messagesMissing = messagesRequired - (messagesLimit - messagesUsed)

  const handleViewPlans = () => {
    onClose()
    router.push('/dashboard/upgrade')
  }

  const getPlanDisplayName = (plan: string) => {
    const planNames = {
      free: 'Gratuito',
      basic: 'Básico', 
      pro: 'Pro',
      enterprise: 'Enterprise'
    }
    return planNames[plan as keyof typeof planNames] || plan
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ¡Necesitas más mensajes!
              </h2>
              <p className="text-sm text-gray-500">Límite alcanzado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Plan Actual</span>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {getPlanDisplayName(planType)}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mensajes usados</span>
                <span className="font-medium">{messagesUsed}/{messagesLimit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((messagesUsed / messagesLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-red-900">
                  Mensajes requeridos: <span className="text-red-700">{messagesRequired}</span>
                </p>
                <p className="text-sm text-red-700">
                  Te faltan <span className="font-semibold">{messagesMissing} mensajes</span> para enviar esta campaña.
                </p>
              </div>
            </div>
          </div>

          {/* Solution */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Zap className="w-5 h-5" />
              <p className="text-sm">
                Actualiza tu plan para enviar campañas más grandes y desbloquear todas las funcionalidades
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleViewPlans}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <span>Ver Planes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}