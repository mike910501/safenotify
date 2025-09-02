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
    mission: "Proteger clínicas médicas con comunicación segura y compliance total",
    location: "Colombia",
    focus: "Sector salud - Clínicas y consultorios médicos"
  },
  
  product: {
    description: "Sistema de notificaciones WhatsApp Business para clínicas con eliminación automática de datos",
    keyFeatures: [
      "Recordatorios automáticos de citas",
      "Confirmaciones WhatsApp",
      "Eliminación automática de datos (auto-delete)",
      "Compliance total Habeas Data",
      "Reducción no-shows hasta 70%",
      "Integración con agendas médicas",
      "Templates personalizables",
      "Analytics y reportes",
      "Soporte especializado médico"
    ],
    pricing: "Desde $250K/mes dependiendo volumen",
    setup: "Implementación en 5 minutos con soporte incluido"
  },
  
  problems_solved: {
    legal: "Elimina riesgo multas SIC hasta $2.000 millones por uso WhatsApp personal",
    operational: "Reduce no-shows 70%, mejora comunicación paciente-médico",
    efficiency: "Automatiza recordatorios, libera tiempo staff médico",
    compliance: "100% cumplimiento Habeas Data, privacidad por diseño"
  },
  
  target_clients: {
    primary: "Clínicas especializadas con 100+ pacientes/mes",
    premium: "Dermatología, cirugía estética, ortopedia, cardiología",
    standard: "Medicina interna, pediatría, ginecología",
    basic: "Medicina general, consulta externa"
  },
  
  competitors: {
    whatsapp_personal: "Riesgo legal alto, sin funcionalidades médicas",
    generic_crm: "No especializado medicina, sin auto-delete",
    sms_systems: "Baja efectividad, no WhatsApp nativo"
  },
  
  case_studies: {
    dr_martinez_dermatology: {
      specialty: "Dermatología",
      before: "25% no-shows, WhatsApp personal, 180 pacientes/mes",
      after: "8% no-shows, compliance total, $12M ahorro mensual",
      timeframe: "2 meses implementación"
    },
    clinica_estetica_bogota: {
      specialty: "Cirugía estética", 
      before: "30% no-shows, llamadas manuales",
      after: "12% no-shows, automatización completa",
      roi: "ROI 400% primer mes"
    }
  },
  
  objections_handling: {
    price: "ROI positivo desde día 1 - ahorro no-shows supera costo",
    complexity: "Setup 5 minutos, soporte completo incluido",
    existing_system: "Integración fácil, migración sin interrupciones",
    patient_adoption: "92% colombianos usan WhatsApp, adopción inmediata",
    legal_concerns: "Diseñado específicamente para compliance colombiano"
  }
};

// Sofia's personality and conversation style
const SOFIA_SYSTEM_PROMPT = `Eres Sofia, especialista en comunicación médica y compliance para clínicas en Colombia.

PERSONALIDAD:
- Consultiva, no agresiva
- Educativa y profesional
- Enfocada en ROI y compliance
- Empática con challenges médicos
- Conversacional y natural

CONOCIMIENTO ESPECIALIZADO:
- Regulaciones Habeas Data Colombia
- Riesgos WhatsApp personal en medicina
- ROI y optimización clínicas
- Diferentes especialidades médicas
- Costos operativos sector salud

APPROACH DE VENTA:
- Educa primero sobre riesgos
- Cuantifica ROI específico
- Usa casos reales similares
- Crea urgencia con compliance
- Califica antes de vender

STYLE DE CONVERSACIÓN:
- Respuestas máximo 180 caracteres para WhatsApp
- Preguntas abiertas para qualification
- Menciona beneficios específicos por especialidad
- Usa números concretos (%, $, tiempo)
- Termine con pregunta para continuar conversación
- SIEMPRE trata de obtener nombre y email del contacto de forma natural
- Si no tienes nombre, pregunta "¿Con quién tengo el gusto?" o similar
- Si no tienes email, pregunta "¿Te puedo enviar info por email?" o similar

NUNCA:
- Seas robot o mecánica
- Uses lenguaje técnico complejo  
- Presiones agresivamente
- Ignores el contexto del usuario
- Repitas información ya dada`;

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
  analyzeConversationSentiment,
  SAFENOTIFY_KNOWLEDGE_BASE
};