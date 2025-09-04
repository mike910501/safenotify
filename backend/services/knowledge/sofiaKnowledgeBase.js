/**
 * Sofia Knowledge Base
 * Centralizes all SafeNotify business knowledge
 * Separated from OpenAI integration for maintainability
 */

const SAFENOTIFY_KNOWLEDGE_BASE = {
  company: {
    name: "SafeNotify",
    mission: "Revolucionar la comunicación automatizada para TODOS los negocios con compliance total",
    location: "Colombia",
    focus: "Todos los sectores - Cualquier negocio que maneje citas o recordatorios",
    website: "www.safenotify.co"
  },
  
  product: {
    description: "Sistema de notificaciones WhatsApp Business para CUALQUIER negocio con eliminación automática de datos",
    keyFeatures: [
      "Recordatorios automáticos de citas/servicios",
      "Confirmaciones WhatsApp",
      "Eliminación automática de datos (auto-delete)",
      "Compliance total Habeas Data",
      "Reducción no-shows hasta 80%",
      "Integración con agendas/sistemas",
      "Plantillas personalizables",
      "Reportes y analytics",
      "Soporte especializado por sector"
    ],
    setup: "Implementación en 5 minutos con soporte GRATIS incluido"
  },

  pricing: {
    basic: {
      name: "Básico",
      price: "$25.000/mes",
      messages: 100,
      features: ["Recordatorios básicos", "Soporte email"]
    },
    pro: {
      name: "Pro",
      price: "$50.000/mes",
      messages: 500,
      features: ["Confirmaciones", "Analytics", "Soporte prioritario"],
      popular: true
    },
    enterprise: {
      name: "Enterprise",
      price: "$100.000/mes",
      messages: 2000,
      features: ["Todo incluido", "API access", "Soporte dedicado"]
    }
  },

  objectionHandling: {
    price: "Ahorramos hasta $8-15M mensuales solo en reducción de no-shows. ROI en 2 semanas.",
    complexity: "Setup en 5 minutos. Nosotros hacemos TODO. Solo das click y listo.",
    whatsappPersonal: "Usar WhatsApp personal es RIESGO LEGAL. Multas SIC hasta $2,000 millones. SafeNotify te protege.",
    integration: "Integramos con cualquier sistema. Si no hay integración, igual funciona con Excel/CSV.",
    volume: "Manejamos desde 50 hasta 50,000 mensajes mensuales. Escalamos contigo."
  },

  sectors: {
    premium: ["medicina", "odontología", "estética", "educación", "restaurantes", "hoteles"],
    standard: ["servicios profesionales", "comercio", "consultoría", "tecnología"],
    basic: ["comercio general", "servicios básicos", "ventas"]
  },

  compliance: {
    habeasData: "Cumplimiento 100% regulación colombiana de protección de datos",
    autoDelete: "Eliminación automática de datos después de cada campaña",
    whatsappBusiness: "Uso de WhatsApp Business API oficial",
    sic: "Evita multas de la Superintendencia de Industria y Comercio"
  },

  caseStudies: {
    medical: "Dr. Martínez (dermatólogo) redujo no-shows 70% en 2 meses. Ahorro: $12M/mes",
    restaurant: "Restaurante La Parrilla aumentó reservas 40% con confirmaciones automáticas",
    education: "Instituto TechEdu mejoró asistencia a clases 85% con recordatorios"
  },

  contacts: {
    demo: "3133592457",
    email: "informacion@safenotify.co",
    website: "www.safenotify.co"
  }
};

/**
 * Get pricing information formatted for response
 */
function getPricingInfo() {
  return `💰 Precios:
• ${SAFENOTIFY_KNOWLEDGE_BASE.pricing.basic.name}: ${SAFENOTIFY_KNOWLEDGE_BASE.pricing.basic.price} (${SAFENOTIFY_KNOWLEDGE_BASE.pricing.basic.messages} mensajes)
• ${SAFENOTIFY_KNOWLEDGE_BASE.pricing.pro.name}: ${SAFENOTIFY_KNOWLEDGE_BASE.pricing.pro.price} (${SAFENOTIFY_KNOWLEDGE_BASE.pricing.pro.messages} mensajes) - Más Popular
• ${SAFENOTIFY_KNOWLEDGE_BASE.pricing.enterprise.name}: ${SAFENOTIFY_KNOWLEDGE_BASE.pricing.enterprise.price} (${SAFENOTIFY_KNOWLEDGE_BASE.pricing.enterprise.messages} mensajes)`;
}

/**
 * Get relevant case study for sector
 */
function getCaseStudyForSector(sector) {
  if (sector?.includes('medicina') || sector?.includes('salud')) return SAFENOTIFY_KNOWLEDGE_BASE.caseStudies.medical;
  if (sector?.includes('restauran') || sector?.includes('comida')) return SAFENOTIFY_KNOWLEDGE_BASE.caseStudies.restaurant;
  if (sector?.includes('educac') || sector?.includes('capacita')) return SAFENOTIFY_KNOWLEDGE_BASE.caseStudies.education;
  return "Clientes similares ahorran $8-15M mensuales";
}

/**
 * Get objection response
 */
function handleObjection(objectionType) {
  return SAFENOTIFY_KNOWLEDGE_BASE.objectionHandling[objectionType] || 
         "SafeNotify es la solución ideal para tu negocio. ¿Te gustaría ver una demo?";
}

module.exports = {
  SAFENOTIFY_KNOWLEDGE_BASE,
  getPricingInfo,
  getCaseStudyForSector,
  handleObjection
};