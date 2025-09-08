'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getApiUrl } from '@/lib/config'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setMessage(data.message)
      } else {
        setError(data.error || 'Error al solicitar restablecimiento de contraseña')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <MessageSquare className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">SafeNotify</h1>
            <p className="text-gray-600 mt-2">Email enviado</p>
          </div>

          <Card className="bg-white shadow-xl" padding="lg">
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto text-green-500" size={64} />
              <h2 className="text-xl font-semibold text-gray-900">¡Revisa tu email!</h2>
              <p className="text-gray-600">
                {message}
              </p>
              <p className="text-sm text-gray-500">
                Si no recibes el email en unos minutos, revisa tu carpeta de spam.
              </p>
              
              <div className="pt-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2" size={20} />
                    Volver al login
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <MessageSquare className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SafeNotify</h1>
          <p className="text-gray-600 mt-2">Recuperar contraseña</p>
        </div>

        <Card className="bg-white shadow-xl" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="text-center space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">¿Olvidaste tu contraseña?</h2>
              <p className="text-gray-600 text-sm">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="su@email.com"
                  required
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full gradient-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center">
                  <Mail className="mr-2" size={20} />
                  Enviar enlace de recuperación
                </span>
              )}
            </Button>

            {/* Back to Login */}
            <div className="text-center">
              <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 flex items-center justify-center">
                <ArrowLeft className="mr-1" size={16} />
                Volver al login
              </Link>
            </div>
          </form>
        </Card>

        {/* Security Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-blue-800">
              <p><strong>Seguridad:</strong> El enlace de recuperación expirará en 1 hora por motivos de seguridad.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}