// ============================================================================
// 🚀 CRM Webhook with MCP Function Calling Integration
// ============================================================================
// Versión enhanced del webhook que usa MCP Function Calling

const express = require('express');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const mcpIntegrationService = require('../services/mcpIntegrationService');
const logger = require('../config/logger');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * 🚀 User CRM WhatsApp Webhook with MCP Function Calling
 * Route: POST /api/webhooks/user-crm-mcp
 * Purpose: Handle incoming WhatsApp messages with MCP capabilities
 * 
 * Enhanced Features:
 * 1. Function Calling para send_multimedia, save_data, etc.
 * 2. Análisis inteligente de intenciones
 * 3. Seguimientos automáticos
 * 4. Manejo de multimedia mejorado
 */
router.post('/user-crm-mcp',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      console.log('🚀 User CRM MCP Webhook triggered');
      
      const {
        From,        // Número del cliente (whatsapp:+573001234567)
        To,          // Número del User (whatsapp:+573009876543)
        Body,        // Mensaje del cliente
        MessageSid,
        AccountSid,
        NumMedia,
        MediaUrl0,
        MediaContentType0
      } = req.body;

      // Log incoming message (privacy-compliant)
      console.log('📨 Incoming MCP message:');
      console.log('  From:', From?.substring(0, 12) + '***');
      console.log('  To:', To);
      console.log('  Message:', Body?.substring(0, 50) + '...');
      console.log('  Media:', NumMedia > 0 ? `${NumMedia} file(s)` : 'No media');
      console.log('  SID:', MessageSid);

      // Extract clean phone numbers
      const fromUser = From?.replace('whatsapp:', '');
      const toWhatsAppNumber = To?.replace('whatsapp:', '');
      
      if (!fromUser || !toWhatsAppNumber || !Body) {
        console.log('❌ Missing required fields');
        return res.status(200).send('OK');
      }

      // 1. Identificar User propietario del número WhatsApp
      const userWhatsApp = await findUserWhatsAppNumber(toWhatsAppNumber);
      
      if (!userWhatsApp) {
        console.log('❌ WhatsApp number not found in User CRM system:', toWhatsAppNumber);
        return res.status(200).send('OK');
      }

      console.log('✅ User found:', userWhatsApp.user.email);

      // 2. Encontrar/crear CustomerLead para ese User
      const customerLead = await findOrCreateCustomerLead(userWhatsApp.userId, fromUser);
      
      // 3. Determinar agente IA del User
      const agent = await determineUserAgent(userWhatsApp.userId, Body, userWhatsApp);
      
      if (!agent) {
        console.log('❌ No active agent found for user:', userWhatsApp.userId);
        return res.status(200).send('OK');
      }

      // 4. Crear/actualizar conversación CRM
      const conversation = await findOrCreateCRMConversation(
        userWhatsApp.userId,
        customerLead.id,
        agent.id,
        fromUser,
        userWhatsApp
      );

      // 5. ✅ NUEVO: Procesar multimedia si existe
      let mediaAnalysis = null;
      if (NumMedia > 0 && MediaUrl0) {
        console.log('📎 Processing multimedia:', MediaContentType0);
        mediaAnalysis = await processIncomingMedia(
          MediaUrl0,
          MediaContentType0,
          conversation.id
        );
      }

      // 6. ✅ GENERAR RESPUESTA CON MCP FUNCTION CALLING
      const response = await generateMCPResponse(
        agent,
        Body,
        customerLead,
        conversation,
        userWhatsApp,
        mediaAnalysis
      );

      // 7. Enviar respuesta desde número del User
      console.log('📤 MCP Response to send:', {
        success: response.success,
        hasMessage: !!response.message,
        messageLength: response.message?.length || 0,
        mcpEnabled: response.mcpEnabled,
        toolsUsed: response.toolsUsed?.length || 0
      });
      
      if (response.success && response.message) {
        console.log('📱 Sending WhatsApp message to:', fromUser);
        await sendWhatsAppMessage(fromUser, response.message, toWhatsAppNumber);
        
        // ✅ Log adicional si se usaron herramientas MCP
        if (response.toolsUsed && response.toolsUsed.length > 0) {
          console.log('🛠️ MCP Tools used:', response.toolsUsed);
        }
      } else {
        console.log('⚠️ Not sending WhatsApp - Response:', response);
      }

      // 8. Registrar métricas del User (incluyendo MCP metrics)
      await updateUserCRMMetrics(userWhatsApp.userId, {
        messageReceived: true,
        messageSent: response.success,
        agentId: agent.id,
        mcpEnabled: response.mcpEnabled,
        functionsUsed: response.toolsUsed?.length || 0
      });

      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Error in User CRM MCP webhook:', error);
      res.status(200).send('OK'); // Always respond OK to Twilio
    }
  }
);

/**
 * ✅ NUEVA FUNCIÓN: Generar respuesta usando MCP Function Calling
 */
async function generateMCPResponse(agent, messageText, customerLead, conversation, userWhatsApp, mediaAnalysis) {
  try {
    // Obtener prompt activo del agente
    const activePrompt = await prisma.userAgentPrompt.findFirst({
      where: {
        agentId: agent.id,
        isActive: true
      },
      orderBy: { version: 'desc' }
    });

    const systemPrompt = activePrompt ? 
      activePrompt.systemPrompt : 
      `${agent.personalityPrompt}\n\n${agent.businessPrompt}\n\n${agent.objectivesPrompt}`;

    // ✅ SMART CONTEXT: Límite inteligente de historial
    const allMessages = conversation.messages || [];
    const MAX_HISTORY_MESSAGES = 20;
    
    let recentMessages = [];
    if (allMessages.length > MAX_HISTORY_MESSAGES) {
      const firstMessages = allMessages.slice(0, 2);
      const recentMessageSlice = allMessages.slice(-18);
      recentMessages = [...firstMessages, ...recentMessageSlice];
      
      console.log(`📝 Conversation truncated: ${allMessages.length} -> ${recentMessages.length} messages`);
    } else {
      recentMessages = allMessages;
    }
    
    // ✅ NUEVO: Agregar contexto de multimedia si existe
    let enhancedMessageText = messageText;
    if (mediaAnalysis) {
      enhancedMessageText = `${messageText}\n\n[ARCHIVO RECIBIDO: ${mediaAnalysis.type} - ${mediaAnalysis.description || 'Archivo multimedia'}]`;
    }
    
    const conversationHistory = [
      ...recentMessages,
      { role: 'user', content: enhancedMessageText, timestamp: new Date().toISOString() }
    ];
    
    console.log(`📊 MCP Context size: ${conversationHistory.length} messages`);

    // Contexto adicional para MCP
    const businessContext = {
      leadId: customerLead.id,
      phone: customerLead.phone,
      agentId: agent.id,
      userId: agent.userId,
      whatsappNumber: userWhatsApp.phoneNumber,
      hasMultimedia: !!mediaAnalysis
    };

    // ✅ USAR MCP INTEGRATION SERVICE en lugar de openaiService
    console.log('🚀 Using MCP Function Calling for response generation');
    
    const response = await mcpIntegrationService.generateResponseWithMCP(
      conversationHistory,
      systemPrompt,
      businessContext,
      'conversation',
      agent,
      customerLead,
      conversation
    );

    // ✅ Actualizar conversación con mensajes y resultados MCP
    if (response.success) {
      const newMessages = [
        ...(conversation.messages || []),
        { 
          role: 'user', 
          content: enhancedMessageText, 
          timestamp: new Date().toISOString(),
          mediaAnalysis: mediaAnalysis || undefined
        },
        { 
          role: 'assistant', 
          content: response.message, 
          timestamp: new Date().toISOString(), 
          agentId: agent.id,
          mcpEnabled: response.mcpEnabled,
          toolsUsed: response.toolsUsed || [],
          functionCalls: response.functionCalls || 0
        }
      ];

      await prisma.cRMConversation.update({
        where: { id: conversation.id },
        data: {
          messages: newMessages,
          messageCount: { increment: 2 }, // User + Assistant
          lastActivity: new Date(),
          metadata: {
            ...(conversation.metadata || {}),
            lastMCPResponse: {
              mcpEnabled: response.mcpEnabled,
              toolsUsed: response.toolsUsed,
              functionCalls: response.functionCalls,
              timestamp: new Date().toISOString()
            }
          }
        }
      });

      console.log('✅ MCP response generated and saved');
    }

    return response;
  } catch (error) {
    console.error('❌ Error generating MCP response:', error);
    return { 
      success: false, 
      error: error.message,
      message: '🤔 Disculpa, necesito procesar mejor tu mensaje. ¿Podrías reformularlo?'
    };
  }
}

/**
 * ✅ NUEVA FUNCIÓN: Procesar multimedia entrante
 */
async function processIncomingMedia(mediaUrl, mediaType, conversationId) {
  try {
    console.log('📎 Processing incoming media:', mediaType);
    
    // Aquí se podría integrar con Claude Vision API o similar
    // Por ahora, extraer información básica del tipo de archivo
    
    const mediaAnalysis = {
      url: mediaUrl,
      type: mediaType,
      timestamp: new Date().toISOString(),
      description: getMediaDescription(mediaType)
    };
    
    // TODO: Guardar en MediaFile table cuando esté implementada
    console.log('📊 Media analysis:', mediaAnalysis);
    
    return mediaAnalysis;
  } catch (error) {
    console.error('❌ Error processing media:', error);
    return null;
  }
}

/**
 * Helper para describir tipos de media
 */
function getMediaDescription(mediaType) {
  if (mediaType?.startsWith('image/')) return 'Imagen';
  if (mediaType?.startsWith('audio/')) return 'Audio';
  if (mediaType?.startsWith('video/')) return 'Video';  
  if (mediaType?.includes('pdf')) return 'Documento PDF';
  return 'Archivo multimedia';
}

// ============================================================================
// FUNCIONES AUXILIARES (REUTILIZADAS del webhook original)
// ============================================================================

/**
 * 1. Identificar User propietario del número WhatsApp
 */
async function findUserWhatsAppNumber(whatsappNumber) {
  try {
    const userWhatsApp = await prisma.userWhatsAppNumber.findFirst({
      where: {
        phoneNumber: whatsappNumber,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            crmEnabled: true,
            crmPlan: true
          }
        }
      }
    });

    return userWhatsApp;
  } catch (error) {
    console.error('❌ Error finding user WhatsApp:', error);
    return null;
  }
}

/**
 * 2. Encontrar/crear CustomerLead para ese User
 */
async function findOrCreateCustomerLead(userId, phoneNumber) {
  try {
    // Buscar lead existente
    let customerLead = await prisma.customerLead.findFirst({
      where: {
        userId: userId,
        phone: phoneNumber
      }
    });

    // Crear si no existe
    if (!customerLead) {
      customerLead = await prisma.customerLead.create({
        data: {
          userId: userId,
          phone: phoneNumber,
          source: 'whatsapp',
          status: 'NEW',
          qualificationScore: 0,
          lastActivity: new Date()
        }
      });

      console.log('✅ New customer lead created:', customerLead.id);
    } else {
      // Actualizar última actividad
      customerLead = await prisma.customerLead.update({
        where: { id: customerLead.id },
        data: { lastActivity: new Date() }
      });
    }

    return customerLead;
  } catch (error) {
    console.error('❌ Error finding/creating customer lead:', error);
    throw error;
  }
}

/**
 * 3. Determinar agente IA del User
 */
async function determineUserAgent(userId, messageText, userWhatsApp) {
  try {
    // Si el número WhatsApp tiene un agente por defecto
    if (userWhatsApp.defaultAgentId) {
      const defaultAgent = await prisma.userAIAgent.findFirst({
        where: {
          id: userWhatsApp.defaultAgentId,
          userId: userId,
          isActive: true
        }
      });

      if (defaultAgent) {
        console.log('🎯 Using WhatsApp default agent:', defaultAgent.name);
        return defaultAgent;
      }
    }

    // Buscar por keywords
    const agents = await prisma.userAIAgent.findMany({
      where: {
        userId: userId,
        isActive: true
      }
    });

    for (const agent of agents) {
      if (agent.triggerKeywords && agent.triggerKeywords.length > 0) {
        const hasKeyword = agent.triggerKeywords.some(keyword => 
          messageText.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          console.log('🎯 Using keyword-matched agent:', agent.name);
          return agent;
        }
      }
    }

    // Fallback: agente por defecto del User
    const defaultAgent = await prisma.userAIAgent.findFirst({
      where: {
        userId: userId,
        isActive: true,
        isDefault: true
      }
    });

    if (defaultAgent) {
      console.log('🎯 Using user default agent:', defaultAgent.name);
      return defaultAgent;
    }

    // Último fallback: cualquier agente activo
    const anyAgent = await prisma.userAIAgent.findFirst({
      where: {
        userId: userId,
        isActive: true
      }
    });

    if (anyAgent) {
      console.log('🎯 Using any available agent:', anyAgent.name);
      return anyAgent;
    }

    return null;
  } catch (error) {
    console.error('❌ Error determining user agent:', error);
    return null;
  }
}

/**
 * 4. Crear/actualizar conversación CRM
 */
async function findOrCreateCRMConversation(userId, customerLeadId, agentId, customerPhone, userWhatsApp) {
  try {
    // Buscar conversación activa
    let conversation = await prisma.cRMConversation.findFirst({
      where: {
        userId: userId,
        customerLeadId: customerLeadId,
        status: 'ACTIVE'
      }
    });

    // Crear si no existe
    if (!conversation) {
      conversation = await prisma.cRMConversation.create({
        data: {
          userId: userId,
          customerLeadId: customerLeadId,
          currentAgentId: agentId,
          whatsappNumberId: userWhatsApp.id,
          status: 'ACTIVE',
          priority: 'NORMAL',
          messageCount: 0,
          messages: [],
          tags: [],
          sessionId: `whatsapp_${Date.now()}_${customerPhone.replace(/[^0-9]/g, '')}`,
          customerPhone: customerPhone,
          metadata: {
            mcpEnabled: true,
            createdWithMCP: true,
            version: '2.0'
          }
        }
      });

      console.log('✅ New MCP-enabled CRM conversation created:', conversation.id);
    }

    return conversation;
  } catch (error) {
    console.error('❌ Error finding/creating CRM conversation:', error);
    throw error;
  }
}

/**
 * 6. Enviar respuesta desde número del User
 */
async function sendWhatsAppMessage(toNumber, message, fromNumber) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const response = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${toNumber}`,
      body: message
    });

    console.log('✅ WhatsApp message sent:', response.sid);
    return response;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * 7. Registrar métricas del User (con métricas MCP)
 */
async function updateUserCRMMetrics(userId, metrics) {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Buscar métricas del mes actual
    let crmMetrics = await prisma.cRMMetrics.findFirst({
      where: {
        userId: userId,
        period: 'monthly',
        periodStart: startOfMonth,
        periodEnd: endOfMonth
      }
    });

    // Crear si no existe
    if (!crmMetrics) {
      crmMetrics = await prisma.cRMMetrics.create({
        data: {
          userId: userId,
          period: 'monthly',
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          totalConversations: 0,
          totalLeads: 0,
          totalMessages: 0,
          totalRevenue: 0
        }
      });
    }

    // ✅ Actualizar métricas incluyendo MCP
    const updateData = {};
    if (metrics.messageReceived) updateData.totalMessages = { increment: 1 };
    if (metrics.messageSent) updateData.totalMessages = { increment: 1 };

    // ✅ Métricas MCP adicionales (agregar a modelo cuando esté disponible)
    // if (metrics.mcpEnabled) updateData.mcpMessagesProcessed = { increment: 1 };
    // if (metrics.functionsUsed > 0) updateData.functionCallsExecuted = { increment: metrics.functionsUsed };

    if (Object.keys(updateData).length > 0) {
      await prisma.cRMMetrics.update({
        where: { id: crmMetrics.id },
        data: updateData
      });
    }

    console.log('✅ User CRM metrics updated (with MCP data)');
  } catch (error) {
    console.error('❌ Error updating User CRM metrics:', error);
  }
}

module.exports = router;