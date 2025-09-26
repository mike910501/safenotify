const OpenAI = require('openai');
const fallbackService = require('./fallbackResponseService');
const twilioService = require('../config/twilio');
const { selectOptimalModel, getModelConfig, trackModelUsage, trackGPTUsageEnhanced } = require('./ai/modelSelector');
const { SAFENOTIFY_KNOWLEDGE_BASE, getPricingInfo, getCaseStudyForSector } = require('./knowledge/sofiaKnowledgeBase');

/**
 * OpenAI Service - Real AI responses for Sofia
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Sofia's personality and conversation style - REMOVED DUPLICATE KNOWLEDGE BASE
const SOFIA_PERSONALITY = {
  // This data is now imported from sofiaKnowledgeBase.js
  dummy: "placeholder"
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
async function generateNaturalResponseWithCustomPrompt(
  conversationHistory, 
  customPrompt, 
  businessContext, 
  currentIntent,
  // ✅ ARREGLADO: Agregar parámetros del usuario
  userModel = null,
  userTemperature = null,
  userMaxTokens = null,
  userReasoningEffort = null,
  userVerbosity = null
) {
  try {
    console.log('🤖 Generating AI response with custom prompt...');
    console.log('👤 User configuration:', {
      model: userModel,
      temperature: userTemperature,
      maxTokens: userMaxTokens,
      reasoningEffort: userReasoningEffort,
      verbosity: userVerbosity
    });

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

    // ✅ ARREGLADO: Usar configuración del usuario con fallback automático
    const selectedModel = userModel || selectOptimalModel(businessContext, currentIntent);
    const maxTokens = userMaxTokens || 500;
    
    // ✅ GPT-5 TEMPERATURE FIX: Solo gpt-5 completo soporta temperature custom
    let finalTemperature;
    if (selectedModel === 'gpt-5-mini' || selectedModel === 'gpt-5-nano') {
      // GPT-5 nano/mini NO soportan temperature custom (siempre = 1.0 por defecto)
      finalTemperature = undefined; // No enviamos temperature para que use su defecto
      console.log(`🌡️ Model ${selectedModel} uses default temperature (1.0) - custom temperature not supported`);
    } else if (selectedModel === 'gpt-5') {
      // GPT-5 completo SÍ soporta temperature custom
      finalTemperature = userTemperature !== null ? userTemperature : 0.7;
      console.log(`🌡️ Model ${selectedModel} using temperature: ${finalTemperature} (user: ${userTemperature !== null ? userTemperature : 'auto'})`);
    } else {
      // Modelos legacy (gpt-4o-mini, etc.) soportan temperature
      finalTemperature = userTemperature !== null ? userTemperature : 0.7;
      console.log(`🌡️ Legacy model ${selectedModel} using temperature: ${finalTemperature}`);
    }
    
    console.log(`🎯 Using model: ${selectedModel} (user: ${userModel || 'auto'})`);
    console.log(`📏 Using max tokens: ${maxTokens} (user: ${userMaxTokens || 'auto'})`);
    
    // ✅ ARREGLADO: Configuración completa respetando usuario y modelo
    const requestConfig = {
      model: selectedModel,
      messages: messages
    };
    
    // Solo agregar temperature si el modelo lo soporta
    if (finalTemperature !== undefined) {
      requestConfig.temperature = finalTemperature;
    }
    
    // ✅ FIXED: Use correct token parameter based on model
    if (selectedModel.startsWith('gpt-5') || selectedModel.startsWith('o1') || selectedModel.startsWith('o3')) {
      // New models use max_completion_tokens
      requestConfig.max_completion_tokens = maxTokens;
      console.log(`📏 Using max_completion_tokens for ${selectedModel}: ${maxTokens}`);
      
      // Add GPT-5 specific parameters
      if (userReasoningEffort) {
        requestConfig.reasoning_effort = userReasoningEffort;
      }
      if (userVerbosity) {
        requestConfig.verbosity = userVerbosity;
      }
      console.log('🚀 GPT-5 parameters:', {
        reasoning_effort: requestConfig.reasoning_effort,
        verbosity: requestConfig.verbosity,
        max_completion_tokens: requestConfig.max_completion_tokens
      });
    } else {
      // Legacy models use max_tokens
      requestConfig.max_tokens = maxTokens;
      console.log(`📏 Using max_tokens for ${selectedModel}: ${maxTokens}`);
    }

    console.log('🔍 DEBUGGING GPT REQUEST:', {
      model: selectedModel,
      messageCount: messages.length,
      lastUserMessage: messages[messages.length - 1]?.content?.substring(0, 100),
      systemPrompt: messages[0]?.content?.substring(0, 200)
    });
    
    const completion = await openai.chat.completions.create(requestConfig);
    const rawContent = completion.choices[0]?.message?.content;
    
    console.log('🤖 GPT RESPONSE DEBUG:', {
      hasContent: !!rawContent,
      length: rawContent?.length || 0,
      first100: rawContent?.substring(0, 100) || 'EMPTY',
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
    });
    
    let response = rawContent?.trim() || '';
    
    // ❌ CRITICAL ERROR: GPT retorna vacío - INVESTIGAR
    if (!response || response.length < 2) {
      console.error('❌ CRITICAL: GPT-5 returned empty response!');
      console.error('   Message count:', messages.length);
      console.error('   Model:', selectedModel);
      console.error('   Last user message:', messages[messages.length - 1]?.content);
      console.error('   Finish reason:', completion.choices[0]?.finish_reason);
      console.error('   Usage:', completion.usage);
      
      // Fallback temporal para no romper mientras investigamos
      response = '🤔 Disculpa, necesito procesar mejor tu mensaje. ¿Podrías reformularlo o darme más contexto?';
      console.log('⚠️ Using temporary fallback while investigating empty responses');
    }
    
    // Enhanced tracking with database persistence and notifications
    const trackingData = {
      phone: businessContext?.phone || 'unknown',
      leadId: businessContext?.leadId,
      conversationId: businessContext?.conversationId,
      model: selectedModel,
      tokensUsed: completion.usage.total_tokens,
      intent: currentIntent,
      leadScore: businessContext?.qualificationScore || 0,
      responseType: 'custom_prompt',
      success: true,
      leadValueBefore: businessContext?.scoreBefore,
      leadValueAfter: businessContext?.scoreAfter,
      conversionEvent: businessContext?.conversionEvent,
      // ✅ Tracking de parámetros GPT-5
      reasoningEffort: requestConfig.reasoning_effort,
      verbosity: requestConfig.verbosity,
      userConfigured: !!userModel // Flag si el usuario configuró manualmente
    };
    
    await trackGPTUsageEnhanced(trackingData);
    
    console.log('✅ Custom prompt response generated:', response.substring(0, 60) + '...');
    
    return {
      success: true,
      message: response,
      tokens_used: completion.usage.total_tokens,
      model_used: selectedModel,
      customPrompt: true,
      userConfigured: !!userModel
    };

  } catch (error) {
    console.error('❌ Custom prompt OpenAI error:', error.message);
    console.log('🔄 Activating interactive fallback system...');
    
    // Activate interactive fallback system
    const fallbackResponse = fallbackService.getInitialFallbackResponse();
    const formattedResponse = fallbackService.formatResponseForWhatsApp(fallbackResponse);
    
    return {
      success: false,
      message: formattedResponse.text,
      buttons: formattedResponse.buttons,
      error: error.message,
      fallback: true,
      interactive: true
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

    const selectedModel = selectOptimalModel(leadContext, currentIntent);
    const completion = await openai.chat.completions.create({
      ...getModelConfig(selectedModel, 'conversation'),
      messages: messages
    });

    const response = completion.choices[0].message.content.trim();
    
    // Enhanced tracking with database persistence and notifications
    const trackingData = {
      phone: leadContext?.phone || 'unknown',
      leadId: leadContext?.leadId,
      conversationId: leadContext?.conversationId,
      model: selectedModel,
      tokensUsed: completion.usage.total_tokens,
      intent: currentIntent,
      leadScore: leadContext?.qualificationScore || 0,
      responseType: 'conversation',
      success: true,
      leadValueBefore: leadContext?.scoreBefore,
      leadValueAfter: leadContext?.scoreAfter,
      conversionEvent: leadContext?.conversionEvent
    };
    
    await trackGPTUsageEnhanced(trackingData);
    
    console.log('✅ OpenAI response generated:', response.substring(0, 60) + '...');
    
    return {
      success: true,
      message: response,
      tokens_used: completion.usage.total_tokens,
      model_used: selectedModel
    };

  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    
    // Track error for monitoring
    const errorTrackingData = {
      phone: leadContext?.phone || 'error',
      leadId: leadContext?.leadId,
      model: selectedModel || 'unknown',
      tokensUsed: 0,
      intent: currentIntent,
      leadScore: leadContext?.qualificationScore || 0,
      responseType: 'conversation',
      success: false,
      errorMessage: error.message
    };
    
    await trackGPTUsageEnhanced(errorTrackingData);
    
    console.log('🔄 Activating interactive fallback system...');
    
    // Activate interactive fallback system
    const fallbackResponse = fallbackService.getInitialFallbackResponse();
    const formattedResponse = fallbackService.formatResponseForWhatsApp(fallbackResponse);
    
    return {
      success: false,
      message: formattedResponse.text,
      buttons: formattedResponse.buttons,
      error: error.message,
      fallback: true,
      interactive: true
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
    context += `- ${SAFENOTIFY_KNOWLEDGE_BASE.compliance.sic}
- SOLUCIÓN: ${SAFENOTIFY_KNOWLEDGE_BASE.compliance.habeasData}
- ${SAFENOTIFY_KNOWLEDGE_BASE.compliance.autoDelete}\n`;
  }

  if (currentIntent === 'roi_inquiry' || leadContext.monthlyPatients > 50) {
    const estimatedSavings = calculateEstimatedSavings(leadContext.monthlyPatients, leadContext.specialty);
    context += `- ROI ESTIMADO: $${estimatedSavings}M ahorro mensual para este negocio
- REDUCCIÓN NO-SHOWS: Hasta 80% comprobado
- CASO SIMILAR: ${getCaseStudyForSector(leadContext.specialty || leadContext.businessType)}\n`;
  }

  if (currentIntent === 'demo_request' || leadContext.qualificationScore > 40) {
    context += `- DEMO PERSONALIZADA: Configurada específicamente para ${leadContext.specialty || leadContext.businessType || 'tu sector'}
- SETUP: ${SAFENOTIFY_KNOWLEDGE_BASE.product.setup}
- SOPORTE: Equipo especializado incluido\n`;
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

// Case study function removed - now using getCaseStudyForSector from sofiaKnowledgeBase.js

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
    
    const selectedModel = selectOptimalModel({ qualificationScore: 0 }, 'sentiment_analysis');
    const completion = await openai.chat.completions.create({
      ...getModelConfig(selectedModel, 'analysis'),
      messages: [
        {
          role: "system",
          content: "Analiza el sentiment y engagement del prospect en esta conversación de negocios. Responde SOLO con un JSON: {\"sentiment\": \"positive/neutral/negative\", \"engagement\": \"high/medium/low\", \"buying_intent\": \"high/medium/low\", \"objections\": [\"list\"]}"
        },
        {
          role: "user",
          content: lastMessages
        }
      ]
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    // Enhanced tracking for sentiment analysis
    const trackingData = {
      phone: 'sentiment_analysis',
      model: selectedModel,
      tokensUsed: completion.usage.total_tokens,
      intent: 'sentiment_analysis',
      leadScore: 0,
      responseType: 'sentiment_analysis',
      success: true
    };
    
    await trackGPTUsageEnhanced(trackingData);
    
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