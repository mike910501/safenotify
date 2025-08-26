'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Scale, Shield, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Términos y Condiciones</h1>
            <div className="flex items-center text-sm text-gray-600 mb-6">
              <Clock size={16} className="mr-2" />
              Última actualización: Agosto 2025
            </div>
          </div>

          <div className="prose max-w-none">
            
            {/* 1. Definiciones */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Scale className="mr-2 text-purple-600" size={20} />
                1. Definiciones
              </h2>
              <div className="space-y-3 text-gray-700">
                <p><strong>SafeNotify:</strong> La plataforma de mensajería masiva de WhatsApp Business.</p>
                <p><strong>Usuario:</strong> Persona que se registra y utiliza los servicios de SafeNotify.</p>
                <p><strong>Servicio:</strong> La plataforma que permite enviar mensajes masivos de WhatsApp Business usando plantillas aprobadas.</p>
                <p><strong>Contactos:</strong> Los números telefónicos y datos asociados que el Usuario carga en la plataforma.</p>
              </div>
            </section>

            {/* 2. Descripción del Servicio */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Descripción del Servicio</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify es una plataforma que permite a los usuarios:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Cargar contactos mediante archivos CSV/Excel</li>
                  <li>Seleccionar plantillas de WhatsApp Business aprobadas</li>
                  <li>Enviar mensajes personalizados masivos a través de WhatsApp Business</li>
                  <li>Monitorear el estado de entrega de los mensajes</li>
                  <li>Gestionar campañas de mensajería</li>
                </ul>
              </div>
            </section>

            {/* 3. Planes y Límites */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Planes y Límites de Servicio</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify ofrece diferentes planes con límites específicos de mensajes:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Plan Gratuito:</strong> Incluye un número limitado de mensajes mensuales</li>
                  <li><strong>Planes Pagos:</strong> Diferentes niveles con mayor cantidad de mensajes y funcionalidades adicionales</li>
                </ul>
                <p>Los límites específicos se detallan en la página de precios y pueden ser modificados con previo aviso.</p>
              </div>
            </section>

            {/* 4. Obligaciones del Usuario */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Obligaciones del Usuario</h2>
              <div className="space-y-3 text-gray-700">
                <p>El Usuario se compromete a:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Utilizar el servicio únicamente para fines legítimos y comerciales apropiados</li>
                  <li>No enviar spam, contenido malicioso o inapropiado</li>
                  <li>Contar con la autorización de todos los contactos para recibir mensajes</li>
                  <li>Cumplir con las políticas de WhatsApp Business y las regulaciones colombianas</li>
                  <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                  <li>Ser responsable por el contenido de los mensajes enviados</li>
                </ul>
              </div>
            </section>

            {/* 5. Servicios de Terceros */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Servicios de Terceros</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify utiliza los siguientes servicios de terceros:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Twilio:</strong> Para el envío de mensajes de WhatsApp Business</li>
                  <li><strong>Wompi:</strong> Para el procesamiento de pagos en pesos colombianos</li>
                  <li><strong>OpenAI:</strong> Para la validación automática de plantillas de mensajes</li>
                </ul>
                <p>El uso de estos servicios está sujeto a sus respectivos términos y condiciones.</p>
              </div>
            </section>

            {/* 6. Tratamiento de Datos */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Tratamiento de Datos</h2>
              <div className="space-y-3 text-gray-700">
                <p>Los datos de contactos cargados por el Usuario:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Se procesan localmente en nuestros servidores</li>
                  <li>Se eliminan automáticamente entre 1-48 horas después del envío</li>
                  <li>Se utilizan únicamente para el envío de los mensajes solicitados</li>
                  <li>No se comparten con terceros excepto para el envío a través de Twilio</li>
                </ul>
                <p>Para más detalles, consulte nuestra <Link href="/privacy" className="text-purple-600 hover:underline">Política de Privacidad</Link>.</p>
              </div>
            </section>

            {/* 7. Limitaciones de Responsabilidad */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitaciones de Responsabilidad</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify no será responsable por:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Fallas en la entrega de mensajes debido a problemas de conectividad o servicios de terceros</li>
                  <li>El contenido de los mensajes enviados por los Usuarios</li>
                  <li>El uso indebido de la plataforma por parte de los Usuarios</li>
                  <li>Daños directos o indirectos derivados del uso del servicio</li>
                </ul>
              </div>
            </section>

            {/* 8. Modificaciones */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Modificaciones del Servicio</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify se reserva el derecho de:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Modificar, suspender o discontinuar el servicio en cualquier momento</li>
                  <li>Actualizar estos términos y condiciones con previo aviso</li>
                  <li>Cambiar los límites y características de los planes disponibles</li>
                </ul>
              </div>
            </section>

            {/* 9. Terminación */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Terminación de la Cuenta</h2>
              <div className="space-y-3 text-gray-700">
                <p>SafeNotify puede suspender o terminar cuentas que:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Violen estos términos y condiciones</li>
                  <li>Utilicen el servicio para actividades ilegales o inapropiadas</li>
                  <li>Generen quejas recurrentes por spam o abuso</li>
                </ul>
              </div>
            </section>

            {/* 10. Jurisdicción */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Ley Aplicable y Jurisdicción</h2>
              <div className="space-y-3 text-gray-700">
                <p>Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será resuelta por los tribunales competentes de Colombia.</p>
              </div>
            </section>

            {/* Contacto */}
            <section className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="mr-2 text-purple-600" size={20} />
                Contacto
              </h2>
              <p className="text-gray-700">
                Para consultas sobre estos términos y condiciones, puede contactarnos en: 
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