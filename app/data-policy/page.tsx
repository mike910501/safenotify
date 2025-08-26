'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, FileText, Shield, Users, AlertCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function DataPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft size={20} className="mr-2" />
              Volver al inicio
            </Link>
            <div className="flex items-center">
              <MessageSquare className="text-purple-600 mr-2" size={24} />
              <span className="font-bold text-xl text-gray-900">SafeNotify</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-white shadow-xl" padding="xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Política de Tratamiento de Datos Personales
            </h1>
            <div className="flex items-center text-sm text-gray-600 mb-6">
              <Clock size={16} className="mr-2" />
              Última actualización: Agosto 2025
            </div>
          </div>

          <div className="prose max-w-none">
            
            {/* Marco Legal */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="mr-2 text-purple-600" size={20} />
                Marco Legal
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  Esta Política de Tratamiento de Datos Personales cumple con la normativa colombiana vigente:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Ley 1581 de 2012 - Ley de Protección de Datos Personales</li>
                  <li>Decreto 1377 de 2013 - Decreto Reglamentario</li>
                  <li>Resoluciones de la Superintendencia de Industria y Comercio (SIC)</li>
                </ul>
              </div>
            </section>

            {/* Identificación del Responsable */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Identificación del Responsable</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="space-y-2 text-gray-700">
                  <p><strong>Responsable del Tratamiento:</strong> SafeNotify</p>
                  <p><strong>Correo electrónico:</strong> informacion@safenotify.co</p>
                  <p><strong>Domicilio:</strong> Colombia</p>
                  <p><strong>Actividad principal:</strong> Plataforma de mensajería masiva de WhatsApp Business</p>
                </div>
              </div>
            </section>

            {/* Autorización */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Autorización del Titular</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  Al registrarse y utilizar SafeNotify, usted como titular de los datos personales autoriza 
                  de manera libre, previa, expresa e informada a SafeNotify para:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Recolectar sus datos personales necesarios para la prestación del servicio</li>
                  <li>Almacenar de forma segura sus datos de cuenta</li>
                  <li>Utilizar sus datos para el envío de mensajes WhatsApp Business</li>
                  <li>Procesar sus datos para mejoras del servicio</li>
                  <li>Compartir sus datos únicamente con terceros necesarios (Twilio, Wompi, OpenAI)</li>
                </ul>
              </div>
            </section>

            {/* Tipos de Datos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Tipos de Datos Personales</h2>
              <div className="space-y-4 text-gray-700">
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Users className="mr-2 text-blue-600" size={18} />
                    Datos de Identificación y Contacto
                  </h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Nombre completo</li>
                    <li>Correo electrónico</li>
                    <li>Contraseña (almacenada con cifrado hash)</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Datos de Terceros (Contactos)</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Nombres de contactos</li>
                    <li>Números telefónicos</li>
                    <li>Variables personalizadas (según archivos CSV/Excel cargados)</li>
                  </ul>
                  <div className="bg-yellow-50 p-3 rounded mt-2">
                    <p className="text-sm text-yellow-800">
                      <strong>Importante:</strong> Estos datos se eliminan automáticamente entre 1-48 horas.
                    </p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Datos Financieros</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Información de transacciones</li>
                    <li>Historial de pagos</li>
                    <li>Referencias de Wompi</li>
                  </ul>
                </div>

              </div>
            </section>

            {/* Finalidades */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Finalidades del Tratamiento</h2>
              <div className="space-y-3 text-gray-700">
                <p><strong>Finalidades principales:</strong></p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Prestación del servicio principal:</strong> Envío de mensajes masivos de WhatsApp Business</li>
                  <li><strong>Gestión de usuarios:</strong> Registro, autenticación y administración de cuentas</li>
                  <li><strong>Procesamiento de pagos:</strong> Gestión de suscripciones y transacciones</li>
                  <li><strong>Soporte técnico:</strong> Atención al cliente y resolución de problemas</li>
                  <li><strong>Mejora continua:</strong> Análisis de uso para optimizar la plataforma</li>
                  <li><strong>Comunicaciones del servicio:</strong> Notificaciones importantes sobre su cuenta</li>
                </ul>

                <p className="mt-4"><strong>Finalidades secundarias (con su consentimiento adicional):</strong></p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Comunicaciones comerciales sobre nuevas funcionalidades</li>
                  <li>Estudios de satisfacción y calidad del servicio</li>
                </ul>
              </div>
            </section>

            {/* Derechos ARCO */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Derechos del Titular (ARCO)</h2>
              <div className="space-y-4 text-gray-700">
                <p>Como titular de datos personales, usted tiene los siguientes derechos:</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Derecho de Acceso</h3>
                    <p className="text-sm text-green-700">
                      Conocer, actualizar y rectificar sus datos personales. 
                      Solicitar información sobre el uso dado a sus datos.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Derecho de Rectificación</h3>
                    <p className="text-sm text-blue-700">
                      Corregir, actualizar o complementar sus datos cuando 
                      estén incompletos, inexactos o desactualizados.
                    </p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2">Derecho de Cancelación</h3>
                    <p className="text-sm text-red-700">
                      Solicitar la supresión de sus datos cuando no se 
                      requieran para las finalidades autorizadas.
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">Derecho de Oposición</h3>
                    <p className="text-sm text-purple-700">
                      Manifestar su oposición al tratamiento por motivos 
                      legítimos según la situación particular.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Procedimiento para Ejercer Derechos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Procedimiento para Ejercer sus Derechos</h2>
              <div className="space-y-4 text-gray-700">
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">¿Cómo presentar una consulta o reclamo?</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p class="font-medium">1. Envíe su solicitud por correo electrónico</p>
                      <p class="text-sm">
                        <strong>Email:</strong> 
                        <a href="mailto:informacion@safenotify.co" class="text-purple-600 hover:underline ml-1">
                          informacion@safenotify.co
                        </a>
                      </p>
                    </div>
                    
                    <div>
                      <p class="font-medium">2. Incluya la siguiente información:</p>
                      <ul class="list-disc ml-4 space-y-1 text-sm">
                        <li>Nombre completo y documento de identidad</li>
                        <li>Correo electrónico registrado en SafeNotify</li>
                        <li>Descripción clara de su solicitud</li>
                        <li>Documentos que soporten su solicitud (si aplica)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p class="font-medium">3. Tiempos de respuesta:</p>
                      <ul class="list-disc ml-4 space-y-1 text-sm">
                        <li><strong>Consultas:</strong> Máximo 10 días hábiles</li>
                        <li><strong>Reclamos:</strong> Máximo 15 días hábiles</li>
                        <li>Si requiere investigación adicional, informaremos el plazo extendido</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Medidas de Seguridad */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="mr-2 text-purple-600" size={20} />
                7. Medidas de Seguridad
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify implementa medidas técnicas y administrativas para proteger sus datos:</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Medidas Técnicas:</h3>
                    <ul className="list-disc ml-4 space-y-1 text-sm">
                      <li>Cifrado de contraseñas con hash seguro</li>
                      <li>Comunicaciones HTTPS/SSL</li>
                      <li>Firewalls y sistemas de detección</li>
                      <li>Respaldos seguros de información</li>
                      <li>Control de acceso basado en roles</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Medidas Administrativas:</h3>
                    <ul className="list-disc ml-4 space-y-1 text-sm">
                      <li>Políticas de seguridad documentadas</li>
                      <li>Capacitación del personal</li>
                      <li>Auditorías periódicas</li>
                      <li>Procedimientos de respuesta a incidentes</li>
                      <li>Eliminación segura de datos temporales</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Transferencias */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Transferencias Internacionales</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify realiza las siguientes transferencias necesarias para el funcionamiento del servicio:</p>
                
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <p><strong>Twilio (Estados Unidos)</strong></p>
                    <p className="text-sm">Transferencia de números telefónicos y mensajes para envío via WhatsApp Business API</p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <p><strong>OpenAI (Estados Unidos)</strong></p>
                    <p className="text-sm">Transferencia de plantillas de mensajes para validación automática</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg mt-4">
                  <div className="flex items-start">
                    <AlertCircle className="mr-2 text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-sm text-yellow-800">
                      Estas transferencias son necesarias para la prestación del servicio y cuentan con 
                      medidas de protección adecuadas según los estándares internacionales.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Vigencia */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Vigencia y Modificaciones</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  Esta política tiene vigencia a partir de su publicación y mientras SafeNotify 
                  mantenga operaciones con tratamiento de datos personales.
                </p>
                <p>
                  Las modificaciones serán informadas a través de nuestra plataforma web y 
                  por correo electrónico con al menos 10 días hábiles de anticipación.
                </p>
              </div>
            </section>

            {/* Contacto */}
            <section className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="mr-2 text-purple-600" size={20} />
                Contacto para Asuntos de Datos Personales
              </h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>Área responsable:</strong> Protección de Datos Personales</p>
                <p>
                  <strong>Correo electrónico:</strong> 
                  <a href="mailto:informacion@safenotify.co" className="text-purple-600 hover:underline ml-1">
                    informacion@safenotify.co
                  </a>
                </p>
                <p><strong>Horario de atención:</strong> Lunes a viernes, 8:00 AM - 5:00 PM</p>
              </div>
            </section>

          </div>
        </Card>
      </div>
    </div>
  )
}