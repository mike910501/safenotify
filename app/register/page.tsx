'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, 
  CheckCircle, User, Sparkles, Shield, MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, register } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return
    
    setLoading(true)

    try {
      const result = await register(formData.name, formData.email, formData.password)
      
      if (result.success) {
        setSuccess(true)
        // Mostrar mensaje de éxito y redirigir
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(result.error || 'Error al registrar usuario')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.')
    } finally {
      setLoading(false)
    }
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
          <p className="text-gray-600 mt-2">Cree su cuenta gratuita</p>
        </div>

        {/* Register Form */}
        <Card className="bg-white shadow-xl" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">¡Registro exitoso!</p>
                  <p className="text-sm">Redirigiendo al dashboard...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="Juan Pérez"
                  required
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="su@email.com"
                  required
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  placeholder="Mínimo 6 caracteres"
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
                  placeholder="Repita la contraseña"
                  required
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

            {/* Terms */}
            <div className="text-xs text-gray-600">
              Al registrarse, acepta nuestros{' '}
              <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                Términos y Condiciones
              </Link>,{' '}
              <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                Política de Privacidad
              </Link>{' '}
              y{' '}
              <Link href="/data-policy" className="text-purple-600 hover:text-purple-700">
                Política de Tratamiento de Datos
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full gradient-primary"
              disabled={loading || success}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creando cuenta...
                </span>
              ) : success ? (
                <span className="flex items-center">
                  <CheckCircle className="mr-2" size={20} />
                  ¡Cuenta creada!
                </span>
              ) : (
                <span className="flex items-center">
                  <UserPlus className="mr-2" size={20} />
                  Crear Cuenta Gratuita
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿Ya tiene cuenta?</span>
              </div>
            </div>

            {/* Login Link */}
            <Link href="/login">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
              >
                Iniciar Sesión
              </Button>
            </Link>
          </form>
        </Card>

        {/* Free Plan Info */}
        <Card className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200" padding="md">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Sparkles className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="font-medium text-purple-900">Plan Gratuito Incluye:</p>
              <p className="text-sm text-purple-700">10 mensajes gratis para probar el servicio</p>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div>
            <Shield className="mx-auto text-gray-400 mb-2" size={20} />
            <p className="text-xs text-gray-600">Datos encriptados</p>
          </div>
          <div>
            <CheckCircle className="mx-auto text-gray-400 mb-2" size={20} />
            <p className="text-xs text-gray-600">Sin tarjeta de crédito</p>
          </div>
        </div>
      </div>
    </div>
  )
}