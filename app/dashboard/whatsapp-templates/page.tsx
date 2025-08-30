'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { 
  Plus, MessageSquare, Edit3, Trash2, Eye, 
  CheckCircle, XCircle, Clock, AlertTriangle,
  Send, Settings, Filter, Search, Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface WhatsAppTemplate {
  id: string
  name: string
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
  language: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED'
  headerText?: string
  bodyText: string
  footerText?: string
  variablesCount: number
  variablesMapping?: Record<string, string>
  twilioContentSid?: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    name: string
    email: string
  }
  usageCount: number
}

interface TemplateStats {
  total: number
  pending: number
  approved: number
  rejected: number
  categories: Record<string, number>
}

export default function WhatsAppTemplatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [stats, setStats] = useState<TemplateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [selectedCategory, selectedStatus, searchTerm])

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`${API_URL}/api/whatsapp-templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data.templates)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Error fetching WhatsApp templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este template?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/whatsapp-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTemplates(templates.filter(t => t.id !== templateId))
        await fetchTemplates() // Refresh stats
      } else {
        alert(data.error || 'Error eliminando template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error de conexión')
    }
  }

  const handleTestTemplate = async (template: WhatsAppTemplate) => {
    const phoneNumber = prompt('Ingresa el número de WhatsApp para la prueba (ej: +573001234567):')
    
    if (!phoneNumber) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/whatsapp-templates/${template.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          testVariables: {
            nombre: 'Usuario Test',
            empresa: 'SafeNotify',
            servicio: 'Prueba',
            fecha: new Date().toLocaleDateString(),
            lugar: 'Test Location',
            hora: '10:00 AM'
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Mensaje de prueba enviado exitosamente\\nSID: ${data.data.messageSid}`)
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error testing template:', error)
      alert('Error de conexión')
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Pendiente'
        }
      case 'APPROVED':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Aprobado'
        }
      case 'REJECTED':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Rechazado'
        }
      case 'DISABLED':
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Deshabilitado'
        }
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Desconocido'
        }
    }
  }

  const getCategoryName = (category: string) => {
    const categories: Record<string, string> = {
      'UTILITY': 'Utilidad',
      'MARKETING': 'Marketing',
      'AUTHENTICATION': 'Autenticación'
    }
    return categories[category] || category
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'UTILITY':
        return 'bg-blue-100 text-blue-800'
      case 'MARKETING':
        return 'bg-purple-100 text-purple-800'
      case 'AUTHENTICATION':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-8 h-8 mr-3 text-green-600" />
            WhatsApp Business Templates
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona templates aprobados por Meta para WhatsApp Business
          </p>
        </div>
        
        <div className="flex space-x-3">
          {user?.role === 'admin' && (
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/whatsapp-templates/config')}
              className="flex items-center"
            >
              <Settings size={16} className="mr-2" />
              Configuración
            </Button>
          )}
          <Button
            onClick={() => router.push('/dashboard/whatsapp-templates/create')}
            className="bg-green-600 hover:bg-green-700 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Nuevo Template
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white" padding="lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white" padding="lg">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aprobados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white" padding="lg">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white" padding="lg">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rechazados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todas las categorías</option>
              <option value="UTILITY">Utilidad</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Autenticación</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
              <option value="DISABLED">Deshabilitados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const statusConfig = getStatusConfig(template.status)
            const StatusIcon = statusConfig.icon

            return (
              <Card key={template.id} className="bg-white hover:shadow-lg transition-shadow" padding="lg">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {template.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getCategoryColor(template.category)}`}>
                          {getCategoryName(template.category)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.language.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
                      <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                      <span className={statusConfig.color}>{statusConfig.text}</span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {template.headerText && (
                      <p className="text-xs font-medium text-gray-700 border-b pb-1">
                        {template.headerText}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {template.bodyText}
                    </p>
                    {template.footerText && (
                      <p className="text-xs text-gray-500 border-t pt-1">
                        {template.footerText}
                      </p>
                    )}
                  </div>

                  {/* Variables */}
                  {template.variablesCount > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: template.variablesCount }, (_, i) => i + 1).map((num) => {
                        const mapping = template.variablesMapping?.[num.toString()];
                        return (
                          <span
                            key={num}
                            className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                          >
                            {`{{${num}}}${mapping ? ` → ${mapping}` : ''}`}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Twilio Integration */}
                  {template.twilioContentSid && (
                    <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                      <span className="font-medium">Twilio SID:</span> {template.twilioContentSid}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      {template.usageCount || 0} usos
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/whatsapp-templates/${template.id}`)}
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
                      
                      {template.status === 'APPROVED' && template.twilioContentSid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestTemplate(template)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Send size={14} className="mr-1" />
                          Test
                        </Button>
                      )}

                      {(template.creator?.id === user?.id || user?.role === 'admin') && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/whatsapp-templates/${template.id}/edit`)}
                          >
                            <Edit3 size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tienes templates de WhatsApp Business
          </h3>
          <p className="text-gray-600 mb-6">
            Crea tu primer template aprobado por Meta para usar en campañas
          </p>
          <Button
            onClick={() => router.push('/dashboard/whatsapp-templates/create')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus size={16} className="mr-2" />
            Crear Primer Template
          </Button>
        </div>
      )}
    </div>
  )
}