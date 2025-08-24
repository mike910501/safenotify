'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { 
  Plus, MessageSquare, Edit3, Trash2, Eye, 
  CheckCircle, XCircle, Clock, AlertTriangle,
  Sparkles, FileText, Users, TrendingUp, Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables: string[]
  status: 'ai_pending' | 'pending' | 'approved' | 'rejected' | 'active'
  isPublic: boolean
  aiApproved: boolean
  aiScore?: number
  twilioTemplateId?: string
  usageCount: number
  createdAt: string
  updatedAt: string
}

interface TemplateStats {
  total: number
  aiPending: number
  pending: number
  approved: number
  rejected: number
  active: number
  public: number
  private: number
  totalUsage: number
  categories: Record<string, number>
}

export default function TemplatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<TemplateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchTemplates()
    fetchStats()
  }, [])

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/templates-ai`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/templates-ai/stats/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/templates-ai/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTemplates(templates.filter(t => t.id !== templateId))
        fetchStats()
      } else {
        alert(data.error || 'Error eliminando plantilla')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error de conexión')
    }
  }

  const getStatusConfig = (template: Template) => {
    switch (template.status) {
      case 'ai_pending':
        return {
          icon: Bot,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          text: 'Validación IA'
        }
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Pendiente Revisión'
        }
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Aprobada'
        }
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Rechazada'
        }
      case 'active':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Activa (Twilio)'
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
      'general': 'General',
      'marketing': 'Marketing',
      'medical': 'Médica',
      'beauty': 'Belleza',
      'service': 'Servicios',
      'promotion': 'Promocional',
      'reminder': 'Recordatorios'
    }
    return categories[category] || category
  }

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
            <MessageSquare className="w-8 h-8 mr-3" />
            Plantillas
          </h1>
          <p className="text-gray-600 mt-2">
            Crea y gestiona plantillas de WhatsApp con validación IA
          </p>
        </div>
        
        <Button
          onClick={() => router.push('/dashboard/templates/create')}
          className="bg-primary-600 hover:bg-primary-700 flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white" padding="lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usos Totales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsage}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        {stats && Object.keys(stats.categories).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getCategoryName(category)} ({stats.categories[category]})
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const statusConfig = getStatusConfig(template)
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
                      <p className="text-sm text-gray-500 mt-1">
                        {getCategoryName(template.category)}
                      </p>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
                      <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                      <span className={statusConfig.color}>{statusConfig.text}</span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {template.content}
                    </p>
                  </div>

                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {template.usageCount || 0} usos
                      </div>
                      {template.isPublic && (
                        <div className="flex items-center text-green-600">
                          <Users className="w-3 h-3 mr-1" />
                          Pública
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/templates/${template.id}`)}
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/templates/${template.id}/edit`)}
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
            {selectedCategory === 'all' ? 'No tienes plantillas' : 'No hay plantillas en esta categoría'}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedCategory === 'all' 
              ? 'Crea tu primera plantilla con validación IA'
              : 'Prueba con otra categoría o crea una nueva plantilla'
            }
          </p>
          <Button
            onClick={() => router.push('/dashboard/templates/create')}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus size={16} className="mr-2" />
            <Sparkles size={16} className="mr-2" />
            Crear Primera Plantilla
          </Button>
        </div>
      )}
    </div>
  )
}