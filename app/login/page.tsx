'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Mail, Lock, Eye, EyeOff, LogIn, AlertCircle,
  Sparkles, Shield, Users, MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  // Password recovery system deployed
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Error al iniciar sesión')
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
          <p className="text-gray-600 mt-2">Inicie sesión en su cuenta</p>
        </div>

        {/* Login Form */}
        <Card className="bg-white shadow-xl" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

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
                  placeholder="••••••••"
                  required
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

            {/* Remember and Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="ml-2 text-sm text-gray-600">Recordarme</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700">
                ¿Olvidó su contraseña?
              </Link>
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
                  Iniciando sesión...
                </span>
              ) : (
                <span className="flex items-center">
                  <LogIn className="mr-2" size={20} />
                  Iniciar Sesión
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿No tiene cuenta?</span>
              </div>
            </div>

            {/* Register Link */}
            <Link href="/register">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
              >
                Crear cuenta nueva
              </Button>
            </Link>
          </form>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <Shield className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-xs text-gray-600">100% Seguro</p>
          </div>
          <div className="text-center">
            <Users className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-xs text-gray-600">+5,000 Usuarios</p>
          </div>
          <div className="text-center">
            <Sparkles className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-xs text-gray-600">IA Integrada</p>
          </div>
        </div>
      </div>
    </div>
  )
}