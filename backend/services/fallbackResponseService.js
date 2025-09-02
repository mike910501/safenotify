/**
 * Fallback Response Service - Sistema de respuestas predefinidas con botones
 * Se activa cuando OpenAI falla por falta de créditos o errores
 */

// Botones principales que aparecen en TODAS las respuestas
const MAIN_BUTTONS = [
  {
    id: 'about_safenotify',
    title: '🏢 Acerca SafeNotify',
    emoji: '🏢'
  },
  {
    id: 'templates_methodology', 
    title: '📋 Plantillas',
    emoji: '📋'
  },
  {
    id: 'plans_pricing',
    title: '💰 Planes',
    emoji: '💰'
  },
  {
    id: 'contact_advisor',
    title: '👨‍💼 Contactar',
    emoji: '👨‍💼'
  },
  {
    id: 'demo_request',
    title: '🖥️ Demo Gratis',
    emoji: '🖥️'
  }
];

// Respuestas predefinidas completas
const FALLBACK_RESPONSES = {
  // Respuesta inicial/general
  greeting: {
    text: `¡Hola! 👋 Soy Sofia de SafeNotify

SafeNotify es la plataforma de mensajería WhatsApp Business #1 en Colombia para CUALQUIER negocio.

🚀 Configuración en 5 minutos
✅ Templates aprobados en 24 horas 
📱 100% compliance Habeas Data
💻 Página web: www.safenotify.co

¿En qué te puedo ayudar hoy?`,
    buttons: MAIN_BUTTONS
  },

  // Acerca de SafeNotify
  about_safenotify: {
    text: `🏢 ACERCA DE SAFENOTIFY

SafeNotify revoluciona la comunicación automatizada para TODOS los negocios en Colombia:

✨ MISIÓN: Eliminar el 80% de no-shows con mensajería inteligente
🛡️ COMPLIANCE: 100% Habeas Data + eliminación automática de datos  
🌍 ALCANCE: +500 negocios confían en nosotros
⚡ VELOCIDAD: Setup en 5 minutos, templates en 24h
💻 WEB: www.safenotify.co

🏥 Clínicas • 💇‍♀️ Salones • 🍽️ Restaurantes • 🔧 Talleres • 🏫 Colegios • Y MUCHOS MÁS

¿Qué más te interesa saber?`,
    buttons: MAIN_BUTTONS
  },

  // Plantillas y metodología  
  templates_methodology: {
    text: `📋 PLANTILLAS SAFENOTIFY - Metodología Probada

🎯 TIPOS DE PLANTILLAS:
• Confirmación de citas/reservas ✅
• Recordatorios automáticos ⏰  
• Seguimiento post-servicio 📝
• Promociones personalizadas 🎁

💡 EJEMPLOS POR INDUSTRIA:

🏥 CLÍNICA: "Dr. Martinez, su cita de {{servicio}} es mañana {{fecha}} a las {{hora}}. Confirme escribiendo SI."

💇‍♀️ SALÓN: "{{nombre}}, su cita para {{servicio}} es el {{fecha}} a las {{hora}} con {{estilista}}."

🍽️ RESTAURANTE: "{{nombre}}, su reserva para {{personas}} personas es hoy {{fecha}} a las {{hora}}."

🔧 TALLER: "Su {{vehiculo}} está listo para recoger. Horario: {{horario}}. Valor: {{valor}}"

¿Te interesa algún sector específico?`,
    buttons: MAIN_BUTTONS
  },

  // Planes y precios
  plans_pricing: {
    text: `💰 PLANES SAFENOTIFY - Febrero 2024

📦 PLAN BÁSICO - $25.000/mes
• 100 mensajes incluidos
• 1 plantilla personalizada  
• Soporte por WhatsApp
• Ideal: pequeños negocios

🚀 PLAN PRO - $50.000/mes ⭐ MÁS POPULAR
• 500 mensajes incluidos
• 3 plantillas personalizadas
• Soporte prioritario + llamadas
• Analytics básicos
• Ideal: negocios medianos

💎 PLAN ENTERPRISE - $100.000/mes  
• 2.000 mensajes incluidos
• Plantillas ilimitadas
• Soporte 24/7 + account manager
• Analytics avanzados + API
• Ideal: grandes empresas

🎁 BONOS: Setup GRATIS + 1er mes 50% OFF

¿Cuál se adapta mejor a tu negocio?`,
    buttons: MAIN_BUTTONS
  },

  // Contactar asesor
  contact_advisor: {
    text: `👨‍💼 CONTACTAR ASESOR ESPECIALIZADO

Para una atención personalizada, contáctanos:

📞 LLAMADA/WHATSAPP DIRECTO:
3133592457

📧 EMAIL COMERCIAL:
ventas@safenotify.co

⏰ HORARIOS DE ATENCIÓN:
Lunes a Viernes: 8AM - 6PM
Sábados: 8AM - 12PM

🚀 RESPUESTA GARANTIZADA:
• WhatsApp: Inmediata
• Llamada: En 5 minutos  
• Email: Máximo 2 horas

Un asesor especializado en tu sector te dará una propuesta personalizada con descuentos exclusivos.

¿Prefieres que te llamemos ahora?`,
    buttons: MAIN_BUTTONS
  },

  // Solicitar demo
  demo_request: {
    text: `🖥️ DEMO PERSONALIZADA SAFENOTIFY

Agenda tu demo GRATIS de 15 minutos:

✅ QUÉ VERÁS:
• Tu negocio configurado en vivo
• Plantillas personalizadas para tu sector  
• Casos de éxito similares al tuyo
• ROI proyectado específico

📅 DISPONIBILIDAD:
• Lunes a Viernes: 9AM - 5PM
• Modalidad: Google Meet o presencial
• Duración: 15 minutos

🎁 BONUS DEMO:
• Configuración GRATIS incluida
• 1 plantilla personalizada de regalo
• Descuento especial del 30%

📞 AGENDA AHORA: 3133592457
📧 O escríbenos: demo@safenotify.co

¿En qué horario te conviene más?`,
    buttons: MAIN_BUTTONS
  },

  // Respuesta por defecto cuando no se entiende
  default: {
    text: `🤔 No entiendo exactamente qué necesitas, pero estoy aquí para ayudarte con SafeNotify.

SafeNotify es la plataforma de mensajería WhatsApp Business que necesita tu negocio:

• ✅ Reduce no-shows hasta 80%
• 📱 Plantillas para cualquier sector  
• 🛡️ 100% compliance legal
• ⚡ Setup en 5 minutos

Usa los botones para obtener información específica o contáctanos al 3133592457

¿Qué te interesa saber?`,
    buttons: MAIN_BUTTONS
  },

  // Respuesta cuando piden información que no tenemos
  unknown_request: {
    text: `📝 Para información específica sobre tu consulta, es mejor que hables directamente con nuestro equipo especializado.

Ellos pueden darte:
• Respuestas técnicas detalladas
• Propuestas personalizadas  
• Demostraciones en vivo
• Precios especiales

📞 Contáctalos ahora: 3133592457

Mientras tanto, ¿te interesa conocer más sobre SafeNotify?`,
    buttons: MAIN_BUTTONS
  }
};

/**
 * Get fallback response based on context or button pressed
 */
function getFallbackResponse(buttonPressed = null, context = 'default') {
  if (buttonPressed && FALLBACK_RESPONSES[buttonPressed]) {
    return FALLBACK_RESPONSES[buttonPressed];
  }

  if (FALLBACK_RESPONSES[context]) {
    return FALLBACK_RESPONSES[context];
  }

  return FALLBACK_RESPONSES.default;
}

/**
 * Handle button press and return appropriate response
 */
function handleButtonPress(buttonId, userContext = {}) {
  console.log('🔘 Button pressed:', buttonId);

  const response = getFallbackResponse(buttonId);
  
  // Log analytics
  console.log('📊 Fallback response analytics:', {
    buttonPressed: buttonId,
    responseType: buttonId,
    userPhone: userContext.phone?.substring(0, 8) + '***',
    timestamp: new Date().toISOString()
  });

  return response;
}

/**
 * Get initial fallback response (when OpenAI fails first time)
 */
function getInitialFallbackResponse() {
  return FALLBACK_RESPONSES.greeting;
}

/**
 * Format response for WhatsApp
 */
function formatResponseForWhatsApp(response) {
  return {
    text: response.text,
    buttons: response.buttons.map(btn => ({
      id: btn.id,
      title: btn.title
    }))
  };
}

module.exports = {
  getFallbackResponse,
  handleButtonPress,
  getInitialFallbackResponse,
  formatResponseForWhatsApp,
  MAIN_BUTTONS,
  FALLBACK_RESPONSES
};