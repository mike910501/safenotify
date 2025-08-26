'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Shield, Database, Eye, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Política de Privacidad</h1>
            <div className="flex items-center text-sm text-gray-600 mb-6">
              <Clock size={16} className="mr-2" />
              Última actualización: Agosto 2025
            </div>
          </div>

          <div className="prose max-w-none">
            
            {/* Introducción */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="mr-2 text-purple-600" size={20} />
                Introducción
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  En SafeNotify, respetamos su privacidad y estamos comprometidos con la protección de sus datos personales. 
                  Esta política explica qué información recolectamos, cómo la utilizamos y sus derechos respecto a sus datos.
                </p>
                <p>
                  Esta política de privacidad se aplica a todos los usuarios de la plataforma SafeNotify y cumple con la 
                  normativa colombiana de protección de datos personales.
                </p>
              </div>
            </section>

            {/* Responsable del Tratamiento */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Responsable del Tratamiento</h2>
              <div className="space-y-3 text-gray-700">
                <p><strong>Responsable:</strong> SafeNotify</p>
                <p><strong>Correo electrónico:</strong> informacion@safenotify.co</p>
                <p><strong>Domicilio:</strong> Colombia</p>
              </div>
            </section>

            {/* Datos que Recolectamos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="mr-2 text-purple-600" size={20} />
                2. Datos que Recolectamos
              </h2>
              <div className="space-y-4 text-gray-700">
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">2.1 Datos de Cuenta de Usuario</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Correo electrónico:</strong> Para identificación y autenticación</li>
                    <li><strong>Contraseña:</strong> Almacenada de forma cifrada con hash</li>
                    <li><strong>Nombre completo:</strong> Para personalización del servicio</li>
                    <li><strong>Tipo de plan:</strong> Para control de límites y funcionalidades</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">2.2 Datos de Contactos (Temporales)</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Nombres:</strong> De los contactos a los que enviará mensajes</li>
                    <li><strong>Números telefónicos:</strong> Para el envío de mensajes WhatsApp</li>
                    <li><strong>Campos personalizados:</strong> Variables adicionales de sus archivos CSV/Excel</li>
                  </ul>
                  <p className="text-sm text-green-700 mt-2">
                    <strong>Importante:</strong> Estos datos se eliminan automáticamente entre 1-48 horas después del envío.
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">2.3 Datos de Pagos</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Información de transacciones:</strong> Montos, fechas, estado de pagos</li>
                    <li><strong>Referencias de pago:</strong> Identificadores de Wompi</li>
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2">
                    Los datos de tarjetas de crédito son procesados directamente por Wompi, no los almacenamos.
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">2.4 Datos de Campañas</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Nombres de campañas:</strong> Identificadores creados por usted</li>
                    <li><strong>Estado de mensajes:</strong> Enviados, fallidos, entregados</li>
                    <li><strong>Plantillas utilizadas:</strong> Qué plantillas seleccionó para cada campaña</li>
                  </ul>
                </div>

              </div>
            </section>

            {/* Finalidad del Tratamiento */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Finalidad del Tratamiento</h2>
              <div className="space-y-3 text-gray-700">
                <p>Utilizamos sus datos para:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Prestación del servicio:</strong> Procesar y enviar sus mensajes de WhatsApp</li>
                  <li><strong>Autenticación:</strong> Verificar su identidad y mantener la seguridad de su cuenta</li>
                  <li><strong>Gestión de pagos:</strong> Procesar suscripciones y pagos de planes</li>
                  <li><strong>Soporte técnico:</strong> Brindar asistencia y resolver problemas técnicos</li>
                  <li><strong>Mejoras del servicio:</strong> Analizar el uso para mejorar la plataforma</li>
                  <li><strong>Cumplimiento legal:</strong> Cumplir con obligaciones legales aplicables</li>
                </ul>
              </div>
            </section>

            {/* Compartir con Terceros */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Compartir Información con Terceros</h2>
              <div className="space-y-4 text-gray-700">
                <p>Compartimos información únicamente con los siguientes terceros necesarios para el funcionamiento del servicio:</p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Twilio</h3>
                    <p className="text-sm">
                      <strong>Propósito:</strong> Envío de mensajes WhatsApp Business
                    </p>
                    <p className="text-sm">
                      <strong>Datos compartidos:</strong> Números telefónicos y contenido de mensajes
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Wompi</h3>
                    <p className="text-sm">
                      <strong>Propósito:</strong> Procesamiento de pagos
                    </p>
                    <p className="text-sm">
                      <strong>Datos compartidos:</strong> Email, montos, referencias de transacción
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">OpenAI</h3>
                    <p className="text-sm">
                      <strong>Propósito:</strong> Validación de plantillas de mensajes
                    </p>
                    <p className="text-sm">
                      <strong>Datos compartidos:</strong> Contenido de plantillas para validación
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Seguridad */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Medidas de Seguridad</h2>
              <div className="space-y-3 text-gray-700">
                <p>Implementamos las siguientes medidas de seguridad:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Cifrado de contraseñas:</strong> Todas las contraseñas se almacenan con hash seguro</li>
                  <li><strong>Comunicaciones seguras:</strong> Conexiones HTTPS para todas las transacciones</li>
                  <li><strong>Eliminación automática:</strong> Datos de contactos eliminados automáticamente</li>
                  <li><strong>Logs seguros:</strong> Información sensible redactada en registros del sistema</li>
                  <li><strong>Control de acceso:</strong> Autenticación con tokens JWT seguros</li>
                  <li><strong>Monitoreo:</strong> Supervisión continua de actividades sospechosas</li>
                </ul>
              </div>
            </section>

            {/* Retención de Datos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Tiempo de Conservación</h2>
              <div className="space-y-3 text-gray-700">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="list-disc ml-4 space-y-2">
                    <li><strong>Datos de cuenta:</strong> Mientras mantenga su cuenta activa</li>
                    <li><strong>Datos de contactos:</strong> 1-48 horas (configurable por el usuario)</li>
                    <li><strong>Datos de pagos:</strong> 5 años por requisitos fiscales</li>
                    <li><strong>Logs del sistema:</strong> 30 días máximo</li>
                    <li><strong>Datos de campañas:</strong> Mientras mantenga su cuenta para reportes</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Derechos del Usuario */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="mr-2 text-purple-600" size={20} />
                7. Sus Derechos
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>Como titular de datos personales, usted tiene derecho a:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre usted</li>
                  <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
                  <li><strong>Cancelación:</strong> Solicitar la eliminación de sus datos</li>
                  <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos en casos específicos</li>
                  <li><strong>Portabilidad:</strong> Obtener sus datos en formato estructurado</li>
                  <li><strong>Revocación:</strong> Retirar su consentimiento en cualquier momento</li>
                </ul>
                
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <p className="font-semibold">Para ejercer sus derechos:</p>
                  <p>Envíe su solicitud a: <a href="mailto:informacion@safenotify.co" className="text-purple-600 hover:underline">informacion@safenotify.co</a></p>
                  <p className="text-sm text-gray-600 mt-2">Responderemos en máximo 15 días hábiles.</p>
                </div>
              </div>
            </section>

            {/* Cookies y Tecnologías */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies y Tecnologías Similares</h2>
              <div className="space-y-3 text-gray-700">
                <p>Utilizamos las siguientes tecnologías:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Cookies de autenticación:</strong> Para mantener su sesión activa</li>
                  <li><strong>Cookies de funcionalidad:</strong> Para recordar sus preferencias</li>
                  <li><strong>Almacenamiento local:</strong> Para mejorar la experiencia de usuario</li>
                </ul>
                <p>Puede configurar su navegador para rechazar cookies, pero esto puede afectar la funcionalidad del servicio.</p>
              </div>
            </section>

            {/* Menores de Edad */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Menores de Edad</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  SafeNotify está dirigido a usuarios mayores de 18 años. No recolectamos intencionalmente 
                  datos personales de menores de edad sin el consentimiento de sus padres o tutores legales.
                </p>
              </div>
            </section>

            {/* Cambios en la Política */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Cambios en esta Política</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre 
                  cambios significativos por correo electrónico o mediante aviso en nuestra plataforma.
                </p>
              </div>
            </section>

            {/* Contacto */}
            <section className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="mr-2 text-purple-600" size={20} />
                Contacto
              </h2>
              <p className="text-gray-700">
                Para consultas sobre esta política de privacidad o el tratamiento de sus datos personales:
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Email:</strong> 
                <a href="mailto:informacion@safenotify.co" className="text-purple-600 hover:underline ml-1">
                  informacion@safenotify.co
                </a>
              </p>
            </section>

          </div>
        </Card>
      </div>
    </div>
  )
}