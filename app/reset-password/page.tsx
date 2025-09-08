'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getApiUrl } from '@/lib/config'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token no válido')
        setVerifying(false)
        return
      }

      try {
        const response = await fetch(getApiUrl(`/api/auth/reset-password/${token}`))
        const data = await response.json()

        if (data.success) {
          setEmail(data.email)
        } else {
          setError(data.error || 'Token inválido o expirado')
        }
      } catch (err) {
        setError('Error verificando token')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.error || 'Error al cambiar contraseña')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-white shadow-xl" padding="lg">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600">Verificando token...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Success state
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
            <p className="text-gray-600 mt-2">Contraseña actualizada</p>
          </div>

          <Card className="bg-white shadow-xl" padding="lg">
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto text-green-500" size={64} />
              <h2 className="text-xl font-semibold text-gray-900">¡Contraseña actualizada!</h2>
              <p className="text-gray-600">
                Tu contraseña ha sido actualizada exitosamente.
              </p>
              <p className="text-sm text-gray-500">
                Serás redirigido al login en unos segundos...
              </p>
              
              <div className="pt-4">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full gradient-primary"
                  >
                    Ir al login
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Error state (invalid token)
  if (error && !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-white shadow-xl" padding="lg">
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto text-red-500" size={64} />
              <h2 className="text-xl font-semibold text-gray-900">Error</h2>
              <p className="text-gray-600">{error}</p>
              
              <div className="pt-4">
                <Link href="/forgot-password">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    Solicitar nuevo enlace
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Main reset password form
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
          <p className="text-gray-600 mt-2">Nueva contraseña</p>
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
              <h2 className="text-xl font-semibold text-gray-900">Crear nueva contraseña</h2>
              {email && (
                <p className="text-gray-600 text-sm">
                  Para: <span className="font-medium">{email}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>La contraseña debe tener:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li className={formData.password.length >= 6 ? 'text-green-600' : ''}>
                  Al menos 6 caracteres
                </li>
                <li className={formData.password === formData.confirmPassword && formData.password ? 'text-green-600' : ''}>
                  Las contraseñas deben coincidir
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full gradient-primary"
              disabled={loading || formData.password !== formData.confirmPassword || formData.password.length < 6}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Actualizando...
                </span>
              ) : (
                <span className="flex items-center">
                  <Lock className="mr-2" size={20} />
                  Actualizar contraseña
                </span>
              )}
            </Button>

            {/* Back to Login */}
            <div className="text-center">
              <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700">
                Volver al login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-white shadow-xl" padding="lg">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600">Cargando...</p>
            </div>
          </Card>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}