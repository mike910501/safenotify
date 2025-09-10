import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel MCP | SafeNotify CRM',
  description: 'Panel de control del sistema MCP (Model Context Protocol) con herramientas avanzadas'
}

export default function MCPControlPanel() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Control MCP</h1>
              <p className="text-gray-600 mt-1">Model Context Protocol - Sistema Avanzado v1.0.0</p>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Estado del Sistema MCP</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-700">Sistema Activo</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">8 Herramientas MCP</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Calendario Funcional</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Botones WhatsApp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Herramientas MCP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Herramientas MCP Activas
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { name: 'send_multimedia', description: 'Envío de imágenes y videos', status: 'active' },
                  { name: 'save_conversation_data', description: 'Guardar datos del cliente', status: 'active' },
                  { name: 'analyze_customer_intent', description: 'Analizar intención del cliente', status: 'active' },
                  { name: 'schedule_follow_up', description: 'Programar seguimientos', status: 'active' },
                  { name: 'check_availability', description: 'Verificar disponibilidad', status: 'active' },
                  { name: 'book_appointment', description: 'Agendar citas', status: 'active' },
                  { name: 'send_interactive_message', description: 'Mensajes con botones', status: 'active' },
                  { name: 'get_upcoming_appointments', description: 'Obtener próximas citas', status: 'active' }
                ].map((tool, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                      <p className="text-xs text-gray-600">{tool.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">Activa</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Templates de Industria */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Templates de Industria
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { name: 'Healthcare', description: 'Servicios médicos y citas', icon: '🏥', triggers: ['doctor', 'medico', 'cita', 'consulta'] },
                  { name: 'Legal', description: 'Servicios legales y jurídicos', icon: '⚖️', triggers: ['abogado', 'legal', 'caso', 'demanda'] },
                  { name: 'Restaurant', description: 'Servicios gastronómicos', icon: '🍽️', triggers: ['reserva', 'mesa', 'comida', 'menu'] },
                  { name: 'Beauty', description: 'Servicios de belleza y spa', icon: '💅', triggers: ['belleza', 'spa', 'masaje', 'facial'] },
                  { name: 'E-commerce', description: 'Comercio electrónico (por defecto)', icon: '🛍️', triggers: ['compra', 'producto', 'tienda', 'envio'] }
                ].map((template, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.triggers.map((trigger, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas y Monitoreo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Estadísticas MCP
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">8</div>
                <div className="text-sm text-gray-600 mt-1">Herramientas Activas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">5</div>
                <div className="text-sm text-gray-600 mt-1">Templates Industria</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600 mt-1">Sistema Operativo</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">v1.0</div>
                <div className="text-sm text-gray-600 mt-1">Versión MCP</div>
              </div>
            </div>

            <div className="mt-8 flex justify-center space-x-4">
              <a 
                href="/MANUAL_TESTING_MCP.md" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                📋 Manual de Testing
              </a>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                🔧 Configurar MCP
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                📊 Ver Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}