'use client'

import { useState, useEffect } from 'react'
import { API_URL } from '@/lib/config'
import { 
  User, Lock, Mail, Shield, 
  Eye, EyeOff, Save, CheckCircle,
  Database, Trash2, AlertTriangle,
  Key, Download
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UserSettings {
  // Perfil
  name: string
  email: string
  
  // Preferencias básicas  
  language: string
  timezone: string
  dateFormat: string
  
  // Datos y Privacidad
  allowAnalytics: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    name: 'Usuario Ejemplo',
    email: 'usuario@ejemplo.com',
    language: 'es',
    timezone: 'America/Bogota',
    dateFormat: 'DD/MM/YYYY',
    allowAnalytics: true
  })
  
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy'>('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  })

  useEffect(() => {
    // Cargar configuraciones del usuario
    loadUserSettings()
  }, [])

  const loadUserSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      // Llamada real a la API para obtener datos del usuario
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.user) {
        // Cargar datos reales del usuario logueado
        setSettings(prev => ({
          ...prev,
          name: data.user.name || '',
          email: data.user.email || '',
          // Mantener configuraciones por defecto para otras opciones
          language: 'es',
          timezone: 'America/Bogota',
          dateFormat: 'DD/MM/YYYY',
          allowAnalytics: true
        }))
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Llamada real a la API para actualizar perfil
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: settings.name
          // Solo enviar campos que realmente se pueden actualizar
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        throw new Error(data.error || 'Error saving settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error guardando configuraciones: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('Las contraseñas no coinciden')
      return
    }
    if (passwordData.new.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!passwordData.current) {
      alert('Ingresa tu contraseña actual')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Llamada real a la API para cambiar contraseña
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error updating password')
      }

      const data = await response.json()
      
      if (data.success) {
        setPasswordData({ current: '', new: '', confirm: '' })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        alert('Contraseña actualizada exitosamente')
      } else {
        throw new Error(data.error || 'Error updating password')
      }
    } catch (error) {
      console.error('Error updating password:', error)
      alert('Error cambiando contraseña: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_URL}/api/user/export-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error exporting data')
      }

      const data = await response.json()
      
      if (data.success) {
        // Crear archivo JSON para descarga
        const jsonData = JSON.stringify(data.data, null, 2)
        const blob = new Blob([jsonData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        // Crear enlace de descarga
        const a = document.createElement('a')
        a.href = url
        a.download = `safenotify-datos-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        alert('Datos exportados exitosamente')
      } else {
        throw new Error(data.error || 'Error exporting data')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error exportando datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      '⚠️ ATENCIÓN: Esta acción eliminará permanentemente tu cuenta y todos tus datos.\n\n' +
      '• Perfil y configuraciones\n' +
      '• Todas tus plantillas\n' +
      '• Historial de pagos\n' +
      '• Campañas y mensajes\n\n' +
      '¿Estás completamente seguro de que deseas continuar?'
    )

    if (!confirmDelete) return

    const doubleConfirm = window.confirm(
      'Última confirmación: ¿Realmente quieres eliminar tu cuenta para siempre?\n\n' +
      'Escribe "ELIMINAR" en el siguiente prompt para confirmar.'
    )

    if (!doubleConfirm) return

    const confirmText = prompt('Escribe "ELIMINAR" para confirmar la eliminación de tu cuenta:')
    if (confirmText !== 'ELIMINAR') {
      alert('Eliminación cancelada. No se escribió "ELIMINAR" correctamente.')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_URL}/api/user/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error deleting account')
      }

      const data = await response.json()
      
      if (data.success) {
        alert('Cuenta eliminada exitosamente. Serás redirigido al inicio.')
        // Limpiar localStorage y redirigir
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/'
      } else {
        throw new Error(data.error || 'Error deleting account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Error eliminando cuenta: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'privacy', label: 'Privacidad', icon: Shield }
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Configuración
            </h1>
            <p className="text-gray-600">
              Gestiona tu perfil, seguridad y preferencias de la cuenta
            </p>
          </div>
          
          {/* Save Button */}
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {saved && (
              <div className="flex items-center text-green-600 animate-fade-in">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Guardado</span>
              </div>
            )}
            <Button
              onClick={saveSettings}
              disabled={loading}
              className="bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Guardando...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </div>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="bg-white sticky top-8" padding="lg">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium rounded-lg transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mr-3 ${
                        activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card className="bg-white" padding="lg">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Información Personal
                      </h2>
                      <p className="text-gray-600">
                        Actualiza tu información básica y foto de perfil
                      </p>
                    </div>
                  </div>


                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={settings.name}
                        onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={settings.email}
                          onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                        />
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zona horaria
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      >
                        <option value="America/Bogota">Bogotá (GMT-5)</option>
                        <option value="America/Caracas">Caracas (GMT-4)</option>
                        <option value="America/Lima">Lima (GMT-5)</option>
                        <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                      </select>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <Card className="bg-white" padding="lg">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                      <Key className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Cambiar Contraseña
                      </h2>
                      <p className="text-gray-600">
                        Mantén tu cuenta segura con una contraseña fuerte
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña actual
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.current}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.new}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar nueva contraseña
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <Button
                      onClick={updatePassword}
                      disabled={loading || !passwordData.current || !passwordData.new || !passwordData.confirm}
                      className="bg-gradient-to-r from-red-600 to-red-500 hover:shadow-lg"
                    >
                      Actualizar Contraseña
                    </Button>
                  </div>
                </Card>

              </div>
            )}



            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <Card className="bg-white" padding="lg">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Privacidad y Datos
                      </h2>
                      <p className="text-gray-600">
                        Controla cómo manejamos y almacenamos tu información
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Data Retention */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Protección de Datos
                      </h3>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start">
                          <Database className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-green-900 font-medium mb-1">
                              ✅ Eliminación Automática de Datos
                            </p>
                            <p className="text-xs text-green-800">
                              Tus datos de contactos se eliminan automáticamente después de cada campaña. 
                              No almacenamos información personal de tus clientes permanentemente, garantizando máxima privacidad.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Analytics */}
                    <div className="flex items-center justify-between py-4 border-t border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Permitir Analytics
                        </h3>
                        <p className="text-sm text-gray-600">
                          Ayúdanos a mejorar el servicio compartiendo datos de uso anónimos
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.allowAnalytics}
                        onChange={(e) => setSettings(prev => ({ ...prev, allowAnalytics: e.target.checked }))}
                        className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                    </div>

                    {/* Export Data */}
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Exportar Datos
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Descarga una copia de todos tus datos en SafeNotify (perfil, plantillas, pagos)
                      </p>
                      <Button 
                        variant="outline"
                        onClick={handleExportData}
                        disabled={loading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? 'Exportando...' : 'Exportar Datos'}
                      </Button>
                    </div>

                    {/* Delete Account */}
                    <div className="pt-6 border-t border-red-200">
                      <h3 className="text-lg font-medium text-red-600 mb-4">
                        Zona de Peligro
                      </h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-1 mr-3 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-900 mb-1">
                              Eliminar Cuenta
                            </h4>
                            <p className="text-xs text-red-800 mb-3">
                              Esta acción no se puede deshacer. Se eliminarán permanentemente todos tus datos.
                            </p>
                            <Button
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={handleDeleteAccount}
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {loading ? 'Eliminando...' : 'Eliminar Cuenta'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}