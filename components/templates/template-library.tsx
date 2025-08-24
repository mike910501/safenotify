'use client'

import { useState, useEffect } from 'react'
import { 
  Search, Filter, Star, CheckCircle, AlertTriangle, X,
  Users, Clock, MessageSquare, Smartphone, Brain, Plus,
  ArrowRight, TrendingUp, Target, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface Template {
  id: string
  name: string
  category: string
  preview: string
  requiredVariables: string[]
  optionalVariables?: string[]
  usageCount: number
  compatibility?: number
  description: string
  twilioSid?: string
}

interface ColumnInfo {
  original: string
  mapped: string
  type: 'text' | 'number' | 'date' | 'time' | 'phone'
  completeness: number
  required: boolean
}

interface TemplateLibraryProps {
  availableColumns: ColumnInfo[]
  onTemplateSelect: (template: Template) => void
  selectedTemplate?: Template | null
}

const TEMPLATE_CATEGORIES = [
  { id: 'citas', name: 'Citas y Recordatorios', icon: Clock },
  { id: 'todos', name: 'Ver Todas', icon: Plus }
]

const TEMPLATE_DATABASE: Template[] = [
  // Plantillas Aprobadas
  {
    id: 'confirmacion-cita',
    name: 'Confirmación de Citas',
    category: 'citas',
    preview: '✅ Hola {nombre}, {negocio} confirma su cita para {servicio} el {fecha} a las {hora} en {ubicacion}. ¡Gracias por confiar en nosotros! 🙏',
    requiredVariables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
    optionalVariables: [],
    usageCount: 2450,
    description: 'Para confirmar citas de cualquier tipo de negocio',
    twilioSid: 'HX7438a469268dd438c00bd5fe0e74bd00'
  },
  {
    id: 'recordatorio-cita',
    name: 'Recordatorio de Citas',
    category: 'citas',
    preview: '⏰ {nombre}, {negocio} le recuerda su cita de {servicio} mañana {fecha} a las {hora}. Lo esperamos en {ubicacion} 📍',
    requiredVariables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
    optionalVariables: [],
    usageCount: 3120,
    description: 'Para recordar citas programadas de cualquier tipo de negocio',
    twilioSid: 'HX75c882c4b3bc3b2b4874cb137b733010'
  }
]

export function TemplateLibrary({ 
  availableColumns, 
  onTemplateSelect, 
  selectedTemplate 
}: TemplateLibraryProps) {
  const [activeCategory, setActiveCategory] = useState('citas')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('compatible')
  const [showCompatibleOnly, setShowCompatibleOnly] = useState(false)

  // Calculate template compatibility
  const calculateCompatibility = (template: Template): number => {
    const availableVariables = availableColumns.map(col => col.mapped)
    const requiredMatches = template.requiredVariables.filter(variable => 
      availableVariables.includes(variable)
    ).length
    const requiredTotal = template.requiredVariables.length
    
    return Math.round((requiredMatches / requiredTotal) * 100)
  }

  // Get templates with compatibility scores
  const templatesWithCompatibility = TEMPLATE_DATABASE.map(template => ({
    ...template,
    compatibility: calculateCompatibility(template)
  }))

  // Filter templates
  const filteredTemplates = templatesWithCompatibility.filter(template => {
    const matchesCategory = template.category === activeCategory
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCompatibility = showCompatibleOnly ? template.compatibility >= 100 : true
    
    return matchesCategory && matchesSearch && matchesCompatibility
  })

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'compatible':
        return (b.compatibility || 0) - (a.compatibility || 0)
      case 'popular':
        return b.usageCount - a.usageCount
      case 'alphabetical':
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  const compatibleCount = templatesWithCompatibility.filter(t => 
    t.category === activeCategory && t.compatibility >= 100
  ).length

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Plantillas</h2>
            <p className="text-gray-600">
              Plantillas compatibles con sus datos ({compatibleCount} encontradas)
            </p>
          </div>
          
          {/* Search and filters */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar plantilla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="compatible">Compatibles primero</option>
              <option value="popular">Más usadas</option>
              <option value="alphabetical">Alfabético</option>
            </select>
            
            <Button
              variant={showCompatibleOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCompatibleOnly(!showCompatibleOnly)}
              className="flex items-center space-x-2"
            >
              <Filter size={16} />
              <span>Solo compatibles</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {TEMPLATE_CATEGORIES.map((category) => {
            const categoryTemplates = templatesWithCompatibility.filter(t => t.category === category.id)
            const compatibleInCategory = categoryTemplates.filter(t => t.compatibility >= 100).length
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 ${
                  activeCategory === category.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <category.icon size={16} />
                <span>{category.name}</span>
                {compatibleInCategory > 0 && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    {compatibleInCategory}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate?.id === template.id}
            onSelect={() => onTemplateSelect(template)}
            availableColumns={availableColumns}
          />
        ))}
      </div>

      {sortedTemplates.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay plantillas</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron plantillas con esos términos' : 'No hay plantillas en esta categoría'}
          </p>
        </div>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: Template & { compatibility: number }
  isSelected: boolean
  onSelect: () => void
  availableColumns: ColumnInfo[]
}

function TemplateCard({ template, isSelected, onSelect, availableColumns }: TemplateCardProps) {
  const availableVariables = availableColumns.map(col => col.mapped)
  const missingVariables = template.requiredVariables.filter(variable => 
    !availableVariables.includes(variable)
  )

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCompatibilityBg = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200'
    if (score >= 70) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'border-2 border-primary-500 bg-primary-50' : 'border border-gray-200'
      }`}
      padding="lg"
      onClick={onSelect}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          </div>
          
          {isSelected && (
            <CheckCircle className="text-primary-600" size={20} />
          )}
        </div>

        {/* Preview text */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            {template.preview.split(/(\{[^}]+\})/).map((part, index) => 
              part.startsWith('{') && part.endsWith('}') ? (
                <span key={index} className="text-primary-600 font-medium bg-primary-100 px-1 rounded">
                  {part}
                </span>
              ) : part
            )}
          </p>
        </div>

        {/* Compatibility indicator */}
        <div className={`p-3 rounded-lg border ${getCompatibilityBg(template.compatibility)}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              Compatibilidad: 
              <span className={`ml-1 ${getCompatibilityColor(template.compatibility)}`}>
                {template.compatibility}%
              </span>
            </span>
            
            {template.compatibility >= 90 ? (
              <CheckCircle className="text-green-600" size={16} />
            ) : template.compatibility >= 70 ? (
              <AlertTriangle className="text-yellow-600" size={16} />
            ) : (
              <X className="text-red-600" size={16} />
            )}
          </div>

          {missingVariables.length > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Faltan datos: {missingVariables.map(v => `{${v}}`).join(', ')}
            </p>
          )}
        </div>

        {/* Variables required */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Target size={12} />
            <span>Requiere: {template.requiredVariables.map(v => `{${v}}`).join(', ')}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <TrendingUp size={12} />
              <span>Usada {template.usageCount.toLocaleString()} veces</span>
            </div>
            
            <Button
              variant="ghost" 
              size="sm"
              className="text-primary-600 hover:text-primary-700 p-1 h-auto"
            >
              Ver plantilla
              <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}