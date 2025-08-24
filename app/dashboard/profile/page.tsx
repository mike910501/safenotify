'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, Calendar, Shield, Edit3, Save, X, 
  Key, Trash2, AlertTriangle, CheckCircle, Eye, EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface UserProfile {
  id: string
  name: string
  email: string
  planType: string
  messagesUsed: number
  messagesLimit: number
  createdAt: string
  planExpiry?: string
}

interface UserStats {
  totalCampaigns: number
  totalMessagesSent: number
  messagesRemaining: number
  percentageUsed: number
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('http://localhost:3005/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Error al obtener perfil')
      }

      const data = await response.json()
      
      if (data.success) {
        setUserProfile(data.user)
        setUserStats(data.stats)
        setFormData({ ...formData, name: data.user.name })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setError('')
    setSuccess('')
    setSaveLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No token found')

      const updateData: any = {}
      
      if (formData.name !== userProfile?.name) {
        updateData.name = formData.name
      }

      if (formData.currentPassword && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Las nuevas contraseñas no coinciden')
          return
        }
        if (formData.newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres')
          return
        }
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      const response = await fetch('http://localhost:3005/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (data.success) {
        setUserProfile({ ...userProfile!, ...data.user })
        setSuccess('Perfil actualizado exitosamente')
        setIsEditing(false)
        setShowPasswordSection(false)
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setError(data.error || 'Error al actualizar perfil')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Error al actualizar perfil')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    // Placeholder for account deletion logic
    alert('Funcionalidad de eliminación de cuenta pendiente de implementación')
    setShowDeleteConfirmation(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'free': return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'basic': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'pro': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gold-100 text-gold-700 border-gold-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
        <p className="text-gray-600">
          Gestiona tu información personal y configuración de cuenta
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card className="bg-white" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Información Personal
              </h2>
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 size={16} className="mr-1" />
                  Editar
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={saveLoading}
                  >
                    <Save size={16} className="mr-1" />
                    {saveLoading ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setShowPasswordSection(false)
                      setFormData({ ...formData, name: userProfile?.name || '' })
                      setError('')
                      setSuccess('')
                    }}
                  >
                    <X size={16} className="mr-1" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                  {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {userProfile?.name || 'Usuario'}
                  </h3>
                  <p className="text-gray-600">{userProfile?.email}</p>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="Ingresa tu nombre completo"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {userProfile?.name || 'No especificado'}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{userProfile?.email}</span>
                  <span className="ml-2 text-xs text-gray-500">(No editable)</span>
                </div>
              </div>

              {/* Password Section */}
              {isEditing && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Cambiar contraseña
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPasswordSection(!showPasswordSection)}
                    >
                      <Key size={16} className="mr-1" />
                      {showPasswordSection ? 'Ocultar' : 'Cambiar contraseña'}
                    </Button>
                  </div>

                  {showPasswordSection && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Contraseña actual
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 pr-10"
                            placeholder="Contraseña actual"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Nueva contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 pr-10"
                            placeholder="Nueva contraseña (min 6 caracteres)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Confirmar nueva contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 pr-10"
                            placeholder="Confirmar nueva contraseña"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card className="bg-white" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información de Cuenta
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Plan actual</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPlanColor(userProfile?.planType || 'free')}`}>
                  {userProfile?.planType || 'Free'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mensajes usados</span>
                <span className="text-sm font-medium text-gray-900">
                  {userProfile?.messagesUsed || 0} / {userProfile?.messagesLimit || 10}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mensajes restantes</span>
                <span className="text-sm font-medium text-gray-900">
                  {(userProfile?.messagesLimit || 10) - (userProfile?.messagesUsed || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Miembro desde</span>
                <span className="text-sm font-medium text-gray-900">
                  {userProfile?.createdAt ? formatDate(userProfile.createdAt) : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          {userStats && (
            <Card className="bg-white" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Estadísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Campañas totales</span>
                  <span className="text-sm font-bold text-primary-600">
                    {userStats.totalCampaigns}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mensajes enviados</span>
                  <span className="text-sm font-bold text-green-600">
                    {userStats.totalMessagesSent}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uso actual</span>
                  <span className="text-sm font-bold text-gray-900">
                    {userStats.percentageUsed}%
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="bg-red-50 border-red-200" padding="lg">
            <h3 className="text-lg font-semibold text-red-900 mb-4">
              Zona de Peligro
            </h3>
            <p className="text-sm text-red-700 mb-4">
              Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten cuidado.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => setShowDeleteConfirmation(true)}
            >
              <Trash2 size={16} className="mr-1" />
              Eliminar Cuenta
            </Button>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar eliminación
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer 
              y perderás todos tus datos permanentemente.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Sí, eliminar cuenta
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirmation(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}