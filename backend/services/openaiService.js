const OpenAI = require('openai');

/**
 * OpenAI Service - Real AI responses for Sofia
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Sofia's comprehensive knowledge base
const SAFENOTIFY_KNOWLEDGE_BASE = {
  company: {
    name: "SafeNotify",
    mission: "Revolucionar la comunicación automatizada para TODOS los negocios con compliance total",
    location: "Colombia",
    focus: "Todos los sectores - Cualquier negocio que maneje citas o recordatorios"
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
      "Templates personalizables por industria",
      "Analytics y reportes detallados",
      "Soporte especializado por sector"
    ],
    pricing: "Desde $149K/mes (Plan Básico 500 msgs), $299K (2000 msgs), $599K (5000 msgs)",
    setup: "Implementación en 5 minutos con soporte GRATIS incluido"
  },
  
  problems_solved: {
    legal: "Elimina riesgo multas SIC hasta $2.000 millones por uso WhatsApp personal (TODOS los negocios)",
    operational: "Reduce no-shows hasta 80%, mejora comunicación negocio-cliente",
    efficiency: "Automatiza recordatorios, libera tiempo del personal",
    compliance: "100% cumplimiento Habeas Data, privacidad por diseño",
    revenue: "Recupera ingresos perdidos por citas/servicios cancelados"
  },
  
  target_clients: {
    premium: "Clínicas especializadas, salones premium, restaurants exclusivos (100+ citas/mes)",
    standard: "Talleres, veterinarias, gimnasios, centros educativos (50-100 citas/mes)",
    basic: "Pequeños negocios, servicios profesionales (hasta 50 citas/mes)",
    universal: "CUALQUIER negocio que maneje citas, reservas o recordatorios"
  },
  
  competitors: {
    whatsapp_personal: "Riesgo legal alto, sin funcionalidades profesionales",
    generic_crm: "No especializado por industria, sin auto-delete",
    sms_systems: "Baja efectividad, no WhatsApp nativo",
    apps_genericas: "Sin compliance específico Colombia, soporte limitado"
  },
  
  case_studies: {
    salon_belleza_medellin: {
      business: "Salón de belleza",
      before: "35% no-shows, WhatsApp personal, 200 citas/mes",
      after: "12% no-shows, compliance total, $8M ahorro mensual",
      timeframe: "1 mes implementación"
    },
    restaurant_bogota: {
      business: "Restaurante", 
      before: "40% mesas vacías por no-shows",
      after: "15% no-shows, ocupación 85%",
      roi: "ROI 300% primer mes"
    },
    taller_mecanico_cali: {
      business: "Taller mecánico",
      before: "Llamadas manuales, clientes olvidan recoger",
      after: "Notificaciones automáticas, 95% satisfacción",
      roi: "ROI 250% primer mes"
    }
  },
  
  objections_handling: {
    price: "ROI positivo desde mes 1 - ahorro no-shows supera costo. Plan básico $149K recupera más de $500K mes",
    complexity: "Setup 5 minutos, soporte GRATIS completo incluido",
    existing_system: "Integración fácil con CUALQUIER agenda, migración sin interrupciones",
    client_adoption: "95% colombianos usan WhatsApp diario, adopción inmediata",
    legal_concerns: "Diseñado específicamente para compliance colombiano - todos los sectores",
    no_time: "Precisamente para eso existe - automatiza TODO, libera tu tiempo",
    small_business: "Plan básico perfecto para pequeños negocios - desde $149K/mes"
  }
};

// Sofia's personality and conversation style
const SOFIA_SYSTEM_PROMPT = `Eres Sofia, especialista en comunicación automatizada y compliance para TODOS los negocios en Colombia 🚀

PERSONALIDAD:
- Consultiva y amigable 😊
- Educativa y profesional
- Enfocada en ROI y compliance
- Empática con challenges de cada negocio
- Usa emojis apropiados (máximo 2 por mensaje)

CONOCIMIENTO ESPECIALIZADO:
- SafeNotify funciona para TODO TIPO DE NEGOCIO:
  • Clínicas y consultorios médicos 🏥
  • Salones de belleza y spas 💇‍♀️
  • Restaurantes (confirmación reservas) 🍽️
  • Talleres mecánicos 🚗
  • Veterinarias 🐕
  • Gimnasios y centros deportivos 💪
  • Escuelas y centros educativos 📚
  • Servicios profesionales (abogados, contadores) 💼
  • Comercios con domicilios 📦
  • Cualquier negocio que necesite recordatorios
- Regulaciones Habeas Data Colombia
- Riesgos WhatsApp personal (multas hasta $2.000 millones)
- ROI específico por industria

COSTOS Y PLANES:
- Plan Básico: $149.000/mes (hasta 500 mensajes) 
- Plan Profesional: $299.000/mes (hasta 2.000 mensajes)
- Plan Empresarial: $599.000/mes (hasta 5.000 mensajes)
- Planes personalizados: Para volúmenes mayores
- SIEMPRE menciona: "Retorno positivo desde el primer mes" 💰
- Configuración GRATIS incluida
- Sin contratos de permanencia

EMAIL APPROACH:
- Pide email de forma natural para "enviarte información detallada"
- Ejemplo: "¿Te puedo enviar a tu email una propuesta personalizada para [tipo de negocio]? 📧"
- NUNCA presiones, es solo para que un especialista contacte
- Si dan email, responde: "Perfecto! Un especialista te enviará info completa en las próximas horas 👍"

APPROACH DE VENTA:
- IDENTIFICA primero el tipo de negocio
- Adapta ejemplos al sector específico
- Educa sobre riesgos legales (aplica a TODOS)
- Cuantifica ROI según su industria
- Menciona casos de éxito similares

STYLE DE CONVERSACIÓN:
- Respuestas máximo 180 caracteres para WhatsApp
- Usa emojis relevantes (no más de 2)
- Preguntas abiertas para qualification
- Menciona beneficios específicos por industria
- Usa números concretos (%, $, tiempo)
- Termine con pregunta para continuar conversación
- SIEMPRE trata de obtener:
  1. Nombre del contacto
  2. Tipo de negocio
  3. Email para enviar info

EJEMPLOS POR INDUSTRIA:
- Restaurante: "Reduce 80% las mesas no ocupadas 🍽️"
- Salón belleza: "Llena espacios cancelados automáticamente 💅"
- Taller: "Confirma cuando el carro está listo 🚗"
- Veterinaria: "Recordatorios de vacunas y citas 🐾"

NUNCA:
- Digas que es solo para clínicas
- Seas robot o mecánica
- Uses lenguaje técnico complejo  
- Presiones para cerrar venta inmediata
- Ignores el tipo de negocio del usuario`;

/**
 * Generate natural AI response using custom dynamic prompt
 */
async function generateNaturalResponseWithCustomPrompt(conversationHistory, customPrompt, businessContext, currentIntent) {
  try {
    console.log('🤖 Generating AI response with custom prompt...');

    // Prepare conversation history for AI
    const messages = [
      {
        role: "system",
        content: customPrompt
      }
    ];

    // Add recent conversation history
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        messages.push({
          role: "user", 
          content: msg.content
        });
      } else if (msg.role === 'assistant') {
        messages.push({
          role: "assistant",
          content: msg.content
        });
      }
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const response = completion.choices[0].message.content.trim();
    
    console.log('✅ Custom prompt response generated:', response.substring(0, 60) + '...');
    
    return {
      success: true,
      message: response,
      tokens_used: completion.usage.total_tokens,
      customPrompt: true
    };

  } catch (error) {
    console.error('❌ Custom prompt OpenAI error:', error.message);
    return {
      success: false,
      message: "Disculpa, tuve un momento de lag. Soy Sofia de SafeNotify, ¿en qué te puedo ayudar?",
      error: error.message,
      fallback: true
    };
  }
}

/**
 * Generate natural AI response using OpenAI
 */
async function generateNaturalResponse(conversationHistory, leadContext, currentIntent) {
  try {
    console.log('🤖 Generating natural AI response...');

    // Build context for AI
    const contextPrompt = buildContextPrompt(leadContext, currentIntent);
    
    // Prepare conversation history for AI
    const messages = [
      {
        role: "system",
        content: `${SOFIA_SYSTEM_PROMPT}\n\n${contextPrompt}`
      }
    ];

    // Add recent conversation history
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        messages.push({
          role: "user", 
          content: msg.content
        });
      } else if (msg.role === 'assistant') {
        messages.push({
          role: "assistant",
          content: msg.content
        });
      }
    });

    console.log('📝 OpenAI prompt context built, generating response...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const response = completion.choices[0].message.content.trim();
    
    console.log('✅ OpenAI response generated:', response.substring(0, 60) + '...');
    
    return {
      success: true,
      message: response,
      tokens_used: completion.usage.total_tokens
    };

  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    
    // Fallback to basic response
    return {
      success: false,
      message: "Disculpa, tuve un momento de lag. Soy Sofia de SafeNotify, ¿en qué te puedo ayudar?",
      error: error.message,
      fallback: true
    };
  }
}

/**
 * Build context prompt based on lead and conversation state
 */
function buildContextPrompt(leadContext, currentIntent) {
  let context = `CONTEXTO DEL LEAD:
${leadContext.specialty ? `Especialidad: ${leadContext.specialty}` : 'Especialidad: No identificada'}
${leadContext.monthlyPatients ? `Pacientes/mes: ${leadContext.monthlyPatients}` : 'Volumen: No identificado'}
${leadContext.currentSystem ? `Sistema actual: ${leadContext.currentSystem}` : ''}
${leadContext.qualificationScore ? `Score actual: ${leadContext.qualificationScore}/100` : 'Score: 0/100'}
${leadContext.painPoints?.length ? `Problemas: ${leadContext.painPoints.join(', ')}` : ''}

SAFENOTIFY INFO RELEVANTE:\n`;

  // Add relevant SafeNotify info based on intent and lead profile
  if (currentIntent === 'compliance_concern' || leadContext.whatsappUsage === 'personal') {
    context += `- RIESGO LEGAL: WhatsApp personal puede generar multas SIC hasta $2.000 millones
- SOLUCIÓN: SafeNotify elimina riesgo con compliance total Habeas Data
- CASOS REALES: SIC ya sancionó clínicas por mal uso datos\n`;
  }

  if (currentIntent === 'roi_inquiry' || leadContext.monthlyPatients > 50) {
    const estimatedSavings = calculateEstimatedSavings(leadContext.monthlyPatients, leadContext.specialty);
    context += `- ROI ESTIMADO: $${estimatedSavings}M ahorro mensual para esta clínica
- REDUCCIÓN NO-SHOWS: Hasta 70% comprobado
- CASO SIMILAR: ${getSimilarCaseStudy(leadContext.specialty)}\n`;
  }

  if (currentIntent === 'demo_request' || leadContext.qualificationScore > 40) {
    context += `- DEMO PERSONALIZADA: Configurada específicamente para ${leadContext.specialty || 'medicina'}
- SETUP: 5 minutos implementación completa
- SOPORTE: Equipo especializado médico incluido\n`;
  }

  context += `\nOBJETIVO: ${getConversationObjective(leadContext, currentIntent)}`;

  return context;
}

/**
 * Calculate estimated savings for personalization
 */
function calculateEstimatedSavings(monthlyPatients = 100, specialty = 'general') {
  const patientVolume = monthlyPatients || 100;
  const noShowRate = 0.2; // 20% average
  
  const costPerNoShow = {
    'dermatología': 500000,
    'cirugía estética': 800000,
    'ortopedia': 400000,
    'cardiología': 600000
  };
  
  const cost = costPerNoShow[specialty] || 250000;
  const monthlyNoShows = patientVolume * noShowRate;
  const monthlyLoss = monthlyNoShows * cost;
  const savings = Math.round(monthlyLoss * 0.7 / 1000000); // 70% reduction, in millions
  
  return savings;
}

/**
 * Get similar case study for credibility
 */
function getSimilarCaseStudy(specialty) {
  if (specialty?.includes('dermatología') || specialty?.includes('estética')) {
    return "Dr. Martínez (dermatólogo) redujo no-shows 70% en 2 meses";
  }
  return "Clínicas similares ahorran $8-15M mensuales";
}

/**
 * Determine conversation objective based on context
 */
function getConversationObjective(leadContext, currentIntent) {
  if (leadContext.qualificationScore >= 70) {
    return "LEAD HOT - Agendar demo inmediatamente";
  } else if (leadContext.qualificationScore >= 40) {
    return "LEAD WARM - Educar ROI y crear urgencia";
  } else if (currentIntent === 'compliance_concern') {
    return "Educar riesgos legales y posicionar SafeNotify como solución";
  } else if (currentIntent === 'roi_inquiry') {
    return "Cuantificar ROI específico y mostrar casos similares";
  } else {
    return "Calificar lead - identificar especialidad, volumen, pain points";
  }
}

/**
 * Analyze conversation sentiment and engagement
 */
async function analyzeConversationSentiment(conversationHistory) {
  try {
    const lastMessages = conversationHistory.slice(-4).map(m => m.content).join('\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Analiza el sentiment y engagement del prospect en esta conversación médica. Responde SOLO con un JSON: {\"sentiment\": \"positive/neutral/negative\", \"engagement\": \"high/medium/low\", \"buying_intent\": \"high/medium/low\", \"objections\": [\"list\"]}"
        },
        {
          role: "user",
          content: lastMessages
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    return analysis;

  } catch (error) {
    console.error('❌ Sentiment analysis error:', error);
    return {
      sentiment: "neutral",
      engagement: "medium", 
      buying_intent: "low",
      objections: []
    };
  }
}

module.exports = {
  generateNaturalResponse,
  generateNaturalResponseWithCustomPrompt,
  analyzeConversationSentiment,
  SAFENOTIFY_KNOWLEDGE_BASE
};