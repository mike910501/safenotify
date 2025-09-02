const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Dynamic Prompt Service - AI-Generated Prompts per Conversation
 * Implements the user's vision of self-evolving conversation prompts
 */

// Base system prompt for Sofia
const SOFIA_BASE_INFO = `SafeNotify es una empresa que presta servicios de mensajería por WhatsApp. No importa qué negocio tengas, puedes configurar tus plantillas y estas serán activadas en máximo 24 horas.

💻 Página web: www.safenotify.co
📞 Demo personal: 3133592457

💰 Precios:
• Básico: $25.000/mes (100 mensajes)
• Pro: $50.000/mes (500 mensajes) - Más Popular  
• Enterprise: $100.000/mes (2.000 mensajes)

Para recibir más información, necesitamos: correo, nombre y tipo de negocio. Un humano te contactará después.`;

/**
 * Generate initial prompt when conversation starts
 */
async function generateInitialPrompt(leadId, phoneNumber, firstMessage, businessContext = {}) {
  try {
    console.log('🧠 Generating initial prompt for lead:', leadId);

    // Extract business type from first message
    const extractedBusiness = await extractBusinessInfo(firstMessage);
    
    // Merge business context
    const fullBusinessContext = {
      ...businessContext,
      ...extractedBusiness,
      phoneNumber: phoneNumber.substring(0, 8) + '***'
    };

    // Create AI prompt to generate Sofia's system prompt
    const promptGenerationRequest = `Eres un experto creando prompts para Sofia, asistente de ventas de SafeNotify.

INFORMACIÓN DE SAFENOTIFY:
${SOFIA_BASE_INFO}

CONTEXTO DEL CLIENTE:
- Mensaje inicial: "${firstMessage}"
- Tipo de negocio detectado: ${fullBusinessContext.businessType || 'No identificado'}
- Volumen estimado: ${fullBusinessContext.volume || 'Desconocido'}

TAREA: Crea un prompt de sistema completo para Sofia que:
1. Le diga que es la asistente de SafeNotify
2. Le explique el contexto específico de este cliente
3. Le indique que su primera respuesta debe ser la introducción completa de SafeNotify (incluyendo página web www.safenotify.co)
4. Le dé instrucciones claras de cómo calificar este tipo de negocio
5. IMPORTANTE: Su objetivo principal durante TODA la conversación es capturar nombre y correo del cliente
6. Debe ser persistente pero amable pidiendo estos datos para que un humano contacte

El prompt debe estar en tercera persona (instrucciones para Sofia, no como Sofia).

Responde SOLO con el prompt del sistema, sin comentarios adicionales.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: promptGenerationRequest
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    const generatedPrompt = completion.choices[0].message.content.trim();

    // Save to database
    const conversationPrompt = await prisma.conversationPrompt.create({
      data: {
        leadId: leadId,
        currentPrompt: generatedPrompt,
        conversationSummary: `Conversación iniciada por: "${firstMessage.substring(0, 100)}..."`,
        businessContext: fullBusinessContext,
        promptVersion: 1,
        lastMessageCount: 1,
        triggerReason: 'initial',
        tokensUsed: completion.usage.total_tokens
      }
    });

    console.log('✅ Initial prompt generated and saved:', conversationPrompt.id);
    
    return {
      success: true,
      promptId: conversationPrompt.id,
      systemPrompt: generatedPrompt,
      businessContext: fullBusinessContext
    };

  } catch (error) {
    console.error('❌ Error generating initial prompt:', error);
    return {
      success: false,
      error: error.message,
      systemPrompt: getStaticFallbackPrompt(),
      businessContext: {}
    };
  }
}

/**
 * Auto-generate conversation summary and update prompt
 */
async function updatePromptWithSummary(leadId, conversationHistory, newMessage) {
  try {
    console.log('🔄 Updating prompt with conversation summary for lead:', leadId);

    // Get current prompt
    const currentPrompt = await prisma.conversationPrompt.findFirst({
      where: { leadId: leadId },
      orderBy: { createdAt: 'desc' }
    });

    if (!currentPrompt) {
      console.log('⚠️ No current prompt found, generating initial');
      return await generateInitialPrompt(leadId, '', newMessage.content);
    }

    // Build conversation text
    const conversationText = conversationHistory.map(msg => 
      `${msg.role === 'user' ? 'Cliente' : 'Sofia'}: ${msg.content}`
    ).join('\n');

    // Generate new summary and updated prompt
    const summaryRequest = `Eres un experto analizando conversaciones de ventas de SafeNotify.

CONVERSACIÓN COMPLETA:
${conversationText}

INFORMACIÓN DE SAFENOTIFY:
${SOFIA_BASE_INFO}

CONTEXTO PREVIO:
${JSON.stringify(currentPrompt.businessContext, null, 2)}

TAREAS:
1. RESUMEN: Crea un resumen conciso de toda la conversación (máximo 200 palabras)
2. CONTEXTO: Extrae/actualiza información del negocio del cliente
3. PROMPT: Crea un nuevo prompt de sistema para Sofia considerando:
   - Todo lo conversado hasta ahora
   - El estado actual de la calificación
   - Próximos pasos recomendados
   - Información específica del negocio del cliente
   - OBJETIVO PRINCIPAL: Capturar nombre y correo del cliente
   - Debe mencionar página web correcta: www.safenotify.co (NO .com)

Responde en formato JSON:
{
  "summary": "resumen de la conversación",
  "businessContext": {
    "businessType": "tipo de negocio",
    "volume": "volumen estimado", 
    "painPoints": ["punto1", "punto2"],
    "interest": "nivel de interés",
    "stage": "etapa actual"
  },
  "newPrompt": "prompt completo del sistema para Sofia"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: summaryRequest
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const response = JSON.parse(completion.choices[0].message.content);

    // Update database
    const updatedPrompt = await prisma.conversationPrompt.create({
      data: {
        leadId: leadId,
        currentPrompt: response.newPrompt,
        conversationSummary: response.summary,
        businessContext: response.businessContext,
        promptVersion: currentPrompt.promptVersion + 1,
        lastMessageCount: conversationHistory.length,
        triggerReason: 'auto_summary',
        tokensUsed: completion.usage.total_tokens
      }
    });

    console.log('✅ Prompt updated with summary:', updatedPrompt.id);

    return {
      success: true,
      promptId: updatedPrompt.id,
      systemPrompt: response.newPrompt,
      businessContext: response.businessContext,
      summary: response.summary
    };

  } catch (error) {
    console.error('❌ Error updating prompt:', error);
    
    // Return current prompt as fallback
    const fallbackPrompt = await getCurrentPrompt(leadId);
    return {
      success: false,
      error: error.message,
      ...fallbackPrompt
    };
  }
}

/**
 * Get current active prompt for a lead
 */
async function getCurrentPrompt(leadId) {
  try {
    const prompt = await prisma.conversationPrompt.findFirst({
      where: { leadId: leadId },
      orderBy: { createdAt: 'desc' }
    });

    if (!prompt) {
      return {
        systemPrompt: getStaticFallbackPrompt(),
        businessContext: {},
        summary: 'No conversation history'
      };
    }

    return {
      systemPrompt: prompt.currentPrompt,
      businessContext: prompt.businessContext,
      summary: prompt.conversationSummary
    };

  } catch (error) {
    console.error('❌ Error getting current prompt:', error);
    return {
      systemPrompt: getStaticFallbackPrompt(),
      businessContext: {},
      summary: 'Error loading conversation'
    };
  }
}

/**
 * Extract business information from message
 */
async function extractBusinessInfo(message) {
  try {
    const extractionRequest = `Analiza este mensaje y extrae información del negocio:

Mensaje: "${message}"

Responde en JSON:
{
  "businessType": "tipo de negocio detectado o null",
  "volume": "volumen estimado o null",
  "keywords": ["palabras", "clave", "detectadas"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: extractionRequest }],
      max_tokens: 100,
      temperature: 0.1
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ Error extracting business info:', error);
    return {
      businessType: null,
      volume: null,
      keywords: []
    };
  }
}

/**
 * Static fallback prompt if AI generation fails
 */
function getStaticFallbackPrompt() {
  return `Eres Sofia, asistente de ventas de SafeNotify. Tu primera respuesta debe ser:

"¡Hola! 😊 SafeNotify es una empresa que presta servicios de mensajería por WhatsApp. No importa qué negocio tengas, puedes configurar tus plantillas y estas serán activadas en máximo 24 horas 🚀

💻 Página web: www.safenotify.co
📞 Demo personal: 3133592457

💰 Precios:
• Básico: $25.000/mes (100 mensajes)
• Pro: $50.000/mes (500 mensajes) - Más Popular
• Enterprise: $100.000/mes (2.000 mensajes)

📝 Para recibir más información, déjanos tus datos: correo, nombre y tipo de negocio. Un humano te contactará y te dará más información."

Después de esta introducción, tu OBJETIVO PRINCIPAL es capturar nombre y correo del cliente. Sé persistente pero amable pidiendo estos datos para que un humano le contacte. Durante TODA la conversación enfócate en obtener: 1) Nombre completo, 2) Correo electrónico, 3) Tipo de negocio.`;
}

/**
 * Should we update the prompt? (every 3 messages or major context change)
 */
function shouldUpdatePrompt(currentMessageCount, lastUpdateCount) {
  return (currentMessageCount - lastUpdateCount) >= 3;
}

module.exports = {
  generateInitialPrompt,
  updatePromptWithSummary,
  getCurrentPrompt,
  shouldUpdatePrompt
};