// ============================================================================
// 🚀 MCP Integration Service - Orquesta Function Calling con el sistema existente
// ============================================================================

const functionCallingService = require('./mcp/functionCallingService');
const openaiService = require('./integrations/openaiService');
const industryPrompts = require('../templates/industryPrompts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MCPIntegrationService {
  constructor() {
    console.log('🔧 MCP Integration Service initialized');
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Generar respuesta con MCP Function Calling
   * 
   * Este método reemplaza/complementa el openaiService.generateNaturalResponseWithCustomPrompt()
   * pero mantiene compatibilidad completa con el sistema existente
   */
  async generateResponseWithMCP(
    conversationHistory,
    customPrompt,
    businessContext,
    currentIntent,
    agent,
    customerLead,
    conversation
  ) {
    try {
      console.log('🚀 Generating MCP response for agent:', agent.name);
      
      // 1. Verificar si el usuario tiene MCP habilitado
      const mcpConfig = await this.getMCPConfiguration(agent.userId);
      
      if (!mcpConfig.mcpEnabled) {
        console.log('🔄 MCP disabled, falling back to standard OpenAI');
        return await openaiService.generateNaturalResponseWithCustomPrompt(
          conversationHistory,
          customPrompt,
          businessContext,
          currentIntent,
          agent.model,
          agent.temperature,
          agent.maxTokensPerMessage,
          agent.reasoningEffort,
          agent.verbosity
        );
      }

      // 2. Preparar contexto completo para Function Calling
      const functionContext = {
        userId: agent.userId,
        agentId: agent.id,
        conversationId: conversation.id,
        customerLeadId: customerLead.id,
        customerPhone: customerLead.phone,
        whatsappNumber: businessContext.whatsappNumber || conversation.userWhatsAppNumber?.phoneNumber,
        currentTags: customerLead.tags || [],
        conversationMetadata: conversation.metadata || {}
      };

      // 3. Detectar industria y usar prompt especializado
      const detectedIndustry = this.detectUserIndustry(
        agent,
        customerLead,
        conversationHistory
      );
      
      // 4. Generar prompt contextualizado por industria
      const industryPrompt = industryPrompts.generateContextualPrompt(
        detectedIndustry,
        {
          businessName: agent.businessName || 'SafeNotify',
          agentName: agent.name,
          userIndustry: agent.industry || detectedIndustry,
          currentDate: new Date().toISOString().split('T')[0],
          currentTime: new Date().toTimeString().split(' ')[0].substring(0, 5)
        }
      );
      
      // 5. Preparar mensajes con prompt enriquecido para Function Calling
      const enhancedPrompt = this.buildEnhancedPromptForFunctions(
        industryPrompt.systemPrompt,
        businessContext,
        mcpConfig,
        industryPrompt.tools
      );

      const messages = [
        {
          role: "system",
          content: enhancedPrompt
        },
        ...conversationHistory
      ];

      console.log('🛠️ Using Function Calling with', functionContext);

      // 4. Ejecutar Function Calling
      const mcpResponse = await functionCallingService.generateWithFunctions(
        messages,
        functionContext,
        {
          model: agent.model || 'gpt-5-mini',
          temperature: agent.temperature,
          maxTokensPerMessage: agent.maxTokensPerMessage,
          reasoningEffort: agent.reasoningEffort,
          verbosity: agent.verbosity
        }
      );

      // 5. Log function calls para debugging
      if (mcpResponse.toolsUsed && mcpResponse.toolsUsed.length > 0) {
        await this.logFunctionCalls(
          conversation.id,
          agent.userId,
          agent.id,
          mcpResponse.toolsUsed,
          customerLead.phone,
          conversationHistory[conversationHistory.length - 1]?.content
        );
      }

      // 6. Retornar en formato compatible con sistema existente
      return {
        success: mcpResponse.success,
        message: mcpResponse.message,
        tokens_used: 0, // TODO: Implementar tracking de tokens para function calling
        model_used: agent.model || 'gpt-5-mini',
        customPrompt: true,
        userConfigured: true,
        // ✅ NUEVO: Datos MCP
        mcpEnabled: true,
        toolsUsed: mcpResponse.toolsUsed || [],
        functionCalls: mcpResponse.functionCalls || 0,
        functionResults: mcpResponse.functionResults || [],
        industryDetected: detectedIndustry,
        industryPromptUsed: true
      };

    } catch (error) {
      console.error('❌ MCP Integration error:', error);
      
      // Fallback a OpenAI estándar en caso de error
      console.log('🔄 Falling back to standard OpenAI due to MCP error');
      
      return await openaiService.generateNaturalResponseWithCustomPrompt(
        conversationHistory,
        customPrompt,
        businessContext,
        currentIntent,
        agent.model,
        agent.temperature,
        agent.maxTokensPerMessage,
        agent.reasoningEffort,
        agent.verbosity
      );
    }
  }

  /**
   * Detectar industria del usuario para prompts especializados
   */
  detectUserIndustry(agent, customerLead, conversationHistory) {
    // 1. Verificar si el agente tiene industria definida
    if (agent.industry && industryPrompts.getTemplate(agent.industry)) {
      console.log('🎯 Using agent defined industry:', agent.industry);
      return agent.industry;
    }
    
    // 2. Verificar tags del cliente
    const leadTags = customerLead.tags || [];
    for (const tag of leadTags) {
      const detectedFromTag = industryPrompts.detectIndustry('', [tag]);
      if (detectedFromTag !== 'ecommerce') {
        console.log('🏷️ Industry detected from customer tags:', detectedFromTag);
        return detectedFromTag;
      }
    }
    
    // 3. Analizar mensaje más reciente
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage && lastMessage.content) {
      const detectedFromMessage = industryPrompts.detectIndustry(lastMessage.content);
      if (detectedFromMessage !== 'ecommerce') {
        console.log('💬 Industry detected from message:', detectedFromMessage);
        return detectedFromMessage;
      }
    }
    
    // 4. Analizar historial completo para patrones
    const allMessages = conversationHistory
      .map(m => m.content)
      .join(' ')
      .toLowerCase();
    
    const detectedFromHistory = industryPrompts.detectIndustry(allMessages);
    console.log('📚 Industry detected from conversation history:', detectedFromHistory);
    
    return detectedFromHistory;
  }
  
  /**
   * Construir prompt enriquecido que instruye al modelo sobre las funciones disponibles
   */
  buildEnhancedPromptForFunctions(originalPrompt, businessContext, mcpConfig, industryTools = []) {
    const functionsGuide = `
🛠️ HERRAMIENTAS DISPONIBLES:
Tienes acceso a las siguientes herramientas para ayudar al cliente:

${mcpConfig.sendMultimedia ? `
📎 send_multimedia: Envía archivos multimedia (menús, catálogos, documentos)
- Usa cuando el cliente solicite ver menús, precios, catálogos, etc.
- Tipos disponibles: menu, catalogue, document, image, price_list, location
` : ''}

${mcpConfig.saveData ? `
💾 save_conversation_data: Guarda información importante de la conversación
- Usa para guardar pedidos, citas, quejas, datos de contacto
- Tipos: order, appointment, inquiry, lead, complaint, feedback
` : ''}

${mcpConfig.analyzeIntent ? `
🧠 analyze_customer_intent: Analiza la intención del cliente y actualiza su perfil
- Usa para calificar leads y entender mejor las necesidades del cliente
- Actualiza scores de calificación y tags automáticamente
` : ''}

${mcpConfig.scheduleFollowUp ? `
⏰ schedule_follow_up: Programa seguimientos automáticos
- Usa para recordatorios, confirmaciones, ofertas especiales
- Tipos: reminder, check_in, offer, survey, appointment_confirm
` : ''}

INSTRUCCIONES PARA USO DE HERRAMIENTAS:
1. Usa las herramientas de forma proactiva cuando sea apropiado
2. No preguntes al usuario si puede usar herramientas, úsalas cuando sea necesario
3. Si usas una herramienta, explica brevemente qué hiciste
4. Siempre mantén el tono conversacional y natural

`;

    return `${originalPrompt}

${functionsGuide}

Continúa la conversación de forma natural, usando las herramientas cuando sea apropiado para brindar el mejor servicio al cliente.`;
  }

  /**
   * Obtener configuración MCP del usuario
   */
  async getMCPConfiguration(userId) {
    try {
      let config = await prisma.mCPConfiguration.findUnique({
        where: { userId }
      });

      // Crear configuración por defecto si no existe
      if (!config) {
        config = await prisma.mCPConfiguration.create({
          data: {
            userId,
            mcpEnabled: true, // ✅ Habilitado por defecto para nuevos usuarios
            provider: 'openai_functions',
            sendMultimedia: true,
            saveData: true,
            analyzeIntent: true,
            scheduleFollowUp: true
          }
        });
        console.log('✅ Created default MCP configuration for user:', userId);
      }

      return config;
    } catch (error) {
      console.error('❌ Error getting MCP configuration:', error);
      // Fallback configuration
      return {
        mcpEnabled: false,
        provider: 'openai_functions',
        sendMultimedia: false,
        saveData: false,
        analyzeIntent: false,
        scheduleFollowUp: false
      };
    }
  }

  /**
   * Log function calls para debugging y analytics
   */
  async logFunctionCalls(conversationId, userId, agentId, toolsUsed, customerPhone, triggerMessage) {
    try {
      for (const toolName of toolsUsed) {
        await prisma.functionCallLog.create({
          data: {
            conversationId,
            userId,
            agentId,
            functionName: toolName,
            functionArgs: {}, // TODO: Capturar args reales
            functionResult: {}, // TODO: Capturar resultados reales
            success: true,
            customerPhone,
            triggerMessage: triggerMessage?.substring(0, 500) // Truncar mensaje largo
          }
        });
      }
      
      console.log('📊 Logged', toolsUsed.length, 'function calls');
    } catch (error) {
      console.error('❌ Error logging function calls:', error);
      // No fallar por esto, es solo logging
    }
  }

  /**
   * ✅ MÉTODO DE MIGRACIÓN: Habilitar MCP para usuarios existentes
   */
  async enableMCPForExistingUsers() {
    try {
      console.log('🔄 Enabling MCP for existing users...');
      
      const usersWithoutMCP = await prisma.user.findMany({
        where: {
          mcpConfiguration: null,
          crmEnabled: true // Solo usuarios con CRM habilitado
        },
        select: { id: true, email: true }
      });

      console.log(`Found ${usersWithoutMCP.length} users without MCP configuration`);

      for (const user of usersWithoutMCP) {
        await prisma.mCPConfiguration.create({
          data: {
            userId: user.id,
            mcpEnabled: true,
            provider: 'openai_functions',
            sendMultimedia: true,
            saveData: true,
            analyzeIntent: true,
            scheduleFollowUp: true
          }
        });
        
        console.log(`✅ MCP enabled for user: ${user.email}`);
      }

      return {
        success: true,
        usersEnabled: usersWithoutMCP.length
      };
    } catch (error) {
      console.error('❌ Error enabling MCP for existing users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MCPIntegrationService();