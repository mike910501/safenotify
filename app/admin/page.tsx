'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, MessageSquare, CheckCircle, XCircle, Clock, 
  AlertTriangle, FileText, Eye, Bot, Settings,
  ThumbsUp, ThumbsDown, Play, RefreshCw, Search,
  Filter, Calendar, User, Hash, ChevronDown, 
  ChevronUp, ExternalLink, Shield, TrendingUp,
  Sparkles, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { useAuth } from '@/hooks/useAuth'

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables: string[]
  status: 'ai_pending' | 'pending' | 'approved' | 'rejected' | 'active'
  aiApproved: boolean
  aiScore?: number
  aiReasons: string[]
  aiSuggestions: string[]
  twilioTemplateId?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface AdminStats {
  pending: number
  approved: number
  rejected: number
  active: number
  total: number
  recentPending: number
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Verificar permisos de admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTemplates()
      fetchStats()
    }
  }, [user])

  // Actualizar cuando cambien los filtros
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTemplates()
    }
  }, [statusFilter])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Construir parámetros de búsqueda
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      
      const url = `http://localhost:3005/api/admin/templates${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.templates)
        setLastUpdated(new Date())
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
      const response = await fetch('http://localhost:3005/api/admin/templates/stats', {
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

  const handleApproveTemplate = async (templateId: string) => {
    if (!confirm('¿Aprobar esta plantilla?')) return

    setActionLoading(templateId + '-approve')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3005/api/admin/templates/${templateId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Aprobada desde panel admin'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Plantilla aprobada exitosamente')
        fetchTemplates()
        fetchStats()
      } else {
        alert(data.error || 'Error aprobando plantilla')
      }
    } catch (error) {
      console.error('Error approving template:', error)
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectTemplate = async (templateId: string) => {
    const reason = prompt('Razón del rechazo (opcional):') 
    if (!confirm('¿Rechazar esta plantilla?')) return

    setActionLoading(templateId + '-reject')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3005/api/admin/templates/${templateId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: reason || 'No cumple con políticas de WhatsApp'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Plantilla rechazada')
        fetchTemplates()
        fetchStats()
      } else {
        alert(data.error || 'Error rechazando plantilla')
      }
    } catch (error) {
      console.error('Error rejecting template:', error)
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivateTemplate = async (templateId: string) => {
    const twilioId = prompt('Ingresa el Template ID de Twilio/WhatsApp:')
    if (!twilioId) return

    setActionLoading(templateId + '-activate')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3005/api/admin/templates/${templateId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          twilioTemplateId: twilioId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Plantilla activada exitosamente')
        fetchTemplates()
        fetchStats()
      } else {
        alert(data.error || 'Error activando plantilla')
      }
    } catch (error) {
      console.error('Error activating template:', error)
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
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
          icon: Play,
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTemplates()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="text-gray-600">Necesitas permisos de administrador</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-50 via-white to-primary-50/20">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl -z-10" />
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl" padding="lg">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-500/20 blur-lg rounded-full" />
                  <AnimatedIcon
                    icon={Shield}
                    size={48}
                    className="text-primary-600 relative"
                    animation="pulse"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Panel de Administración
                  </h1>
                  <p className="text-dark-500 mt-1 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Gestión de plantillas WhatsApp • Actualizado: {lastUpdated.toLocaleTimeString()}</span>
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={fetchTemplates} 
                className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                size="lg"
              >
                <RefreshCw size={16} className="mr-2" />
                Actualizar
              </Button>
            </div>
          </Card>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <Card className="bg-gradient-to-br from-accent-50 to-accent-100/50 border-accent-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" padding="lg">
              <div className="text-center">
                <AnimatedIcon icon={Clock} size={32} className="text-accent-600 mx-auto mb-3" animation="pulse" />
                <p className="text-3xl font-bold text-accent-900">{stats.pending || 0}</p>
                <p className="text-accent-700 text-sm font-medium">Pendientes</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" padding="lg">
              <div className="text-center">
                <AnimatedIcon icon={CheckCircle} size={32} className="text-primary-600 mx-auto mb-3" animation="pulse" />
                <p className="text-3xl font-bold text-primary-900">{stats.approved || 0}</p>
                <p className="text-primary-700 text-sm font-medium">Aprobadas</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-danger-50 to-danger-100/50 border-danger-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" padding="lg">
              <div className="text-center">
                <AnimatedIcon icon={XCircle} size={32} className="text-danger-600 mx-auto mb-3" animation="pulse" />
                <p className="text-3xl font-bold text-danger-900">{stats.rejected || 0}</p>
                <p className="text-danger-700 text-sm font-medium">Rechazadas</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100/50 border-secondary-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" padding="lg">
              <div className="text-center">
                <AnimatedIcon icon={Play} size={32} className="text-secondary-600 mx-auto mb-3" animation="pulse" />
                <p className="text-3xl font-bold text-secondary-900">{stats.active || 0}</p>
                <p className="text-secondary-700 text-sm font-medium">Activas</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-dark-100 to-dark-200/50 border-dark-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" padding="lg">
              <div className="text-center">
                <AnimatedIcon icon={FileText} size={32} className="text-dark-600 mx-auto mb-3" animation="pulse" />
                <p className="text-3xl font-bold text-dark-900">{stats.total || 0}</p>
                <p className="text-dark-700 text-sm font-medium">Total</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-primary-100 to-secondary-100/50 border-primary-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" padding="lg">
              <div className="text-center">
                <AnimatedIcon icon={Bot} size={32} className="text-primary-700 mx-auto mb-3" animation="pulse" />
                <p className="text-3xl font-bold text-primary-900">{stats.recentPending || 0}</p>
                <p className="text-primary-700 text-sm font-medium">Recientes</p>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" padding="lg">
          <div className="flex flex-col lg:flex-row gap-6">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5 rounded-lg" />
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, contenido, usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-primary-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 text-dark-700 placeholder-dark-400"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </form>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-dark-600">
                <Filter className="w-5 h-5" />
                <span className="font-medium">Filtrar:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white border-2 border-primary-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 text-dark-700 font-medium min-w-[200px]"
              >
                <option value="all">✨ Todos los estados</option>
                <option value="ai_pending">🤖 Validación IA</option>
                <option value="pending">⏳ Pendientes</option>
                <option value="approved">✅ Aprobadas</option>
                <option value="rejected">❌ Rechazadas</option>
                <option value="active">🚀 Activas</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Templates List */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" padding="lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <AnimatedIcon icon={MessageSquare} size={28} className="text-primary-600" animation="pulse" />
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Plantillas ({templates.length})
                </h2>
                {statusFilter !== 'all' && (
                  <p className="text-sm text-dark-500 flex items-center mt-1">
                    <Filter className="w-3 h-3 mr-1" />
                    Filtrado por: <span className="font-medium ml-1">{statusFilter}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse" />
              <span className="text-sm text-dark-500">En vivo</span>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary-500/10 blur-2xl rounded-full" />
                <AnimatedIcon icon={MessageSquare} size={80} className="text-primary-400 mx-auto relative" animation="pulse" />
              </div>
              <h3 className="text-2xl font-bold text-dark-700 mb-2">
                {statusFilter === 'all' ? '🔍 No hay plantillas' : `🔍 No hay plantillas ${statusFilter}`}
              </h3>
              <p className="text-dark-500 max-w-md mx-auto">
                {statusFilter === 'pending' 
                  ? '⏳ Los usuarios aún no han creado plantillas para revisar. ¡Pronto aparecerán aquí!' 
                  : '🔄 Cambia el filtro para ver otras plantillas o crea nuevas plantillas.'}
              </p>
            </div>
          ) : (
          <div className="space-y-4">
            {templates.map((template) => {
              const statusConfig = getStatusConfig(template)
              const isExpanded = expandedTemplate === template.id
              
              return (
                <div key={template.id} className="group bg-white border border-light-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 overflow-hidden">
                  {/* Header */}
                  <div 
                    className={`p-6 cursor-pointer transition-all duration-300 ${statusConfig.bgColor} hover:bg-opacity-80`}
                    onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className={`absolute inset-0 ${statusConfig.color.replace('text-', 'bg-').replace('-600', '-500/20')} blur-md rounded-full`} />
                            <AnimatedIcon icon={statusConfig.icon} size={24} className={`${statusConfig.color} relative`} animation="pulse" />
                          </div>
                          <h3 className="text-lg font-bold text-dark-800 group-hover:text-primary-600 transition-colors duration-300">{template.name}</h3>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor} shadow-sm`}>
                          {statusConfig.text}
                        </div>
                        
                        {template.aiApproved && (
                          <div className="px-3 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-secondary-100 to-secondary-50 text-secondary-800 border border-secondary-200 shadow-sm flex items-center space-x-1">
                            <Bot className="w-4 h-4" />
                            <span>IA: {template.aiScore}/100</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-6">
                        {template.user ? (
                          <div className="text-sm text-dark-600 flex items-center space-x-1 bg-light-100 px-3 py-2 rounded-lg">
                            <User size={16} className="text-primary-500" />
                            <span className="font-medium">{template.user.name}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-dark-600 flex items-center space-x-1 bg-blue-100 px-3 py-2 rounded-lg">
                            <User size={16} className="text-blue-500" />
                            <span className="font-medium">🏢 Plantilla del Sistema</span>
                          </div>
                        )}
                        
                        <div className="text-sm text-dark-500 flex items-center space-x-1">
                          <Calendar size={16} className="text-accent-500" />
                          <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="p-2 rounded-lg hover:bg-white/50 transition-colors duration-200">
                          {isExpanded ? 
                            <ChevronUp size={24} className="text-primary-600" /> : 
                            <ChevronDown size={24} className="text-dark-400 group-hover:text-primary-600 transition-colors duration-300" />
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-light-200 bg-gradient-to-br from-white to-light-50/50 p-8 animate-slide-down">
                      <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <Card className="bg-white/80 backdrop-blur-sm border-light-200 shadow-sm" padding="lg">
                          <div className="flex items-center space-x-2 mb-4">
                            <User className="w-5 h-5 text-primary-600" />
                            <h4 className="text-lg font-bold text-dark-800">Información</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600">Usuario:</span>
                              <span className="text-dark-800 font-semibold">{template.user.name}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600">Email:</span>
                              <span className="text-sm text-dark-700">{template.user.email}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600">Categoría:</span>
                              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm font-medium">{template.category}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600">Variables:</span>
                              <span className="text-sm text-dark-700 max-w-48 truncate">{template.variables.length > 0 ? template.variables.join(', ') : '❌ Ninguna'}</span>
                            </div>
                            <div className="p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600 block mb-2">ID:</span>
                              <code className="bg-dark-100 px-3 py-2 rounded-md text-xs font-mono text-dark-700 block break-all">{template.id}</code>
                            </div>
                            {template.twilioTemplateId && (
                              <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                                <span className="font-medium text-primary-700 block mb-2">Twilio ID:</span>
                                <code className="bg-primary-100 px-3 py-2 rounded-md text-xs font-mono text-primary-800 block break-all">{template.twilioTemplateId}</code>
                              </div>
                            )}
                          </div>
                        </Card>
                        
                        <Card className="bg-white/80 backdrop-blur-sm border-light-200 shadow-sm" padding="lg">
                          <div className="flex items-center space-x-2 mb-4">
                            <Bot className="w-5 h-5 text-secondary-600" />
                            <h4 className="text-lg font-bold text-dark-800">Análisis IA</h4>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600">Estado IA:</span>
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${template.aiApproved ? 'bg-secondary-100 text-secondary-800' : 'bg-danger-100 text-danger-800'}`}>
                                {template.aiApproved ? '✅ Aprobado' : '❌ Rechazado'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-light-50 rounded-lg">
                              <span className="font-medium text-dark-600">Score:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-dark-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      (template.aiScore || 0) >= 80 ? 'bg-secondary-500' :
                                      (template.aiScore || 0) >= 60 ? 'bg-accent-500' : 'bg-danger-500'
                                    }`}
                                    style={{ width: `${template.aiScore || 0}%` }}
                                  />
                                </div>
                                <span className="font-bold text-dark-800">{template.aiScore || 0}/100</span>
                              </div>
                            </div>
                            {template.aiReasons.length > 0 && (
                              <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                                <h5 className="font-semibold text-primary-800 mb-2 flex items-center">
                                  <AlertTriangle className="w-4 h-4 mr-1" />
                                  Razones:
                                </h5>
                                <ul className="space-y-1">
                                  {template.aiReasons.map((reason, i) => (
                                    <li key={i} className="text-sm text-primary-700 flex items-start space-x-2">
                                      <span className="text-primary-500 mt-1">•</span>
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>

                      {/* Contenido del mensaje */}
                      <Card className="bg-gradient-to-br from-light-50 to-white border-light-200 shadow-sm mb-8" padding="lg">
                        <div className="flex items-center space-x-2 mb-4">
                          <MessageSquare className="w-5 h-5 text-accent-600" />
                          <h4 className="text-lg font-bold text-dark-800">Contenido del Mensaje</h4>
                        </div>
                        <div className="bg-white border-2 border-light-200 rounded-xl p-6 shadow-inner">
                          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 w-12 h-1 rounded-full mb-4" />
                          <p className="text-dark-700 whitespace-pre-wrap leading-relaxed font-medium">{template.content}</p>
                          <div className="flex justify-end mt-4">
                            <div className="text-xs text-dark-400 bg-light-100 px-2 py-1 rounded">
                              {template.content.length} caracteres
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Sugerencias IA */}
                      {template.aiSuggestions.length > 0 && (
                        <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100/50 border-secondary-200 shadow-sm mb-8" padding="lg">
                          <div className="flex items-center space-x-2 mb-4">
                            <Sparkles className="w-5 h-5 text-secondary-600" />
                            <h4 className="text-lg font-bold text-secondary-800">Sugerencia de IA</h4>
                          </div>
                          <div className="bg-white/90 border border-secondary-200 rounded-xl p-6">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <Bot className="w-8 h-8 text-secondary-600 bg-secondary-100 p-2 rounded-lg" />
                              </div>
                              <div className="flex-1">
                                <p className="text-secondary-800 whitespace-pre-wrap leading-relaxed font-medium">{template.aiSuggestions[0]}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-4 pt-6 border-t-2 border-light-200">
                        {template.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApproveTemplate(template.id)}
                              disabled={actionLoading === template.id + '-approve'}
                              className="bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ThumbsUp size={18} className="mr-2" />
                              {actionLoading === template.id + '-approve' ? '⏳ Aprobando...' : '✅ Aprobar'}
                            </Button>

                            <Button
                              onClick={() => handleRejectTemplate(template.id)}
                              disabled={actionLoading === template.id + '-reject'}
                              className="bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ThumbsDown size={18} className="mr-2" />
                              {actionLoading === template.id + '-reject' ? '⏳ Rechazando...' : '❌ Rechazar'}
                            </Button>
                          </>
                        )}

                        {template.status === 'approved' && (
                          <Button
                            onClick={() => handleActivateTemplate(template.id)}
                            disabled={actionLoading === template.id + '-activate'}
                            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Play size={18} className="mr-2" />
                            {actionLoading === template.id + '-activate' ? '⏳ Activando...' : '🚀 Activar con Twilio'}
                          </Button>
                        )}

                        {template.status === 'active' && (
                          <div className="flex items-center space-x-3 bg-gradient-to-r from-secondary-100 to-secondary-50 text-secondary-800 px-6 py-3 rounded-xl border border-secondary-200 shadow-sm">
                            <AnimatedIcon icon={CheckCircle} size={20} className="text-secondary-600" animation="pulse" />
                            <span className="font-bold">🎉 Plantilla activa y lista para usar</span>
                          </div>
                        )}

                        {template.status === 'rejected' && (
                          <div className="flex items-center space-x-3 bg-gradient-to-r from-danger-100 to-danger-50 text-danger-800 px-6 py-3 rounded-xl border border-danger-200 shadow-sm">
                            <XCircle size={20} className="text-danger-600" />
                            <span className="font-bold">💔 Plantilla rechazada</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
      </div>
    </div>
  )
}