const express = require('express');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const openaiService = require('../services/openaiService');
const logger = require('../config/logger');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * 🔄 User CRM WhatsApp Webhook
 * Route: POST /api/webhooks/user-crm
 * Purpose: Handle incoming WhatsApp messages for User CRM system
 * 
 * Routing Logic:
 * 1. Identificar User propietario del número WhatsApp
 * 2. Encontrar/crear CustomerLead para ese User
 * 3. Determinar agente IA del User
 * 4. Generar respuesta con personalidad del User
 * 5. Responder desde número del User
 */
router.post('/user-crm',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      console.log('📞 User CRM Webhook triggered');
      
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
      console.log('📨 Incoming User CRM message:');
      console.log('  From:', From?.substring(0, 12) + '***');
      console.log('  To:', To);
      console.log('  Message:', Body?.substring(0, 50) + '...');
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
        fromUser
      );

      // 5. Generar respuesta con personalidad del User
      const response = await generateUserAgentResponse(
        agent,
        Body,
        customerLead,
        conversation
      );

      // 6. Enviar respuesta desde número del User
      console.log('📤 Response to send:', {
        success: response.success,
        hasMessage: !!response.message,
        messageLength: response.message?.length || 0
      });
      
      if (response.success && response.message) {
        console.log('📱 Sending WhatsApp message to:', fromUser);
        await sendWhatsAppMessage(fromUser, response.message, toWhatsAppNumber);
      } else {
        console.log('⚠️ Not sending WhatsApp - Response:', response);
      }

      // 7. Registrar métricas del User
      await updateUserCRMMetrics(userWhatsApp.userId, {
        messageReceived: true,
        messageSent: response.success,
        agentId: agent.id
      });

      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Error in User CRM webhook:', error);
      res.status(200).send('OK'); // Always respond OK to Twilio
    }
  }
);

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
async function findOrCreateCRMConversation(userId, customerLeadId, agentId, customerPhone) {
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
          whatsappNumberId: userWhatsApp.id, // Conectar con el número WhatsApp del usuario
          status: 'ACTIVE',
          priority: 'NORMAL',
          messageCount: 0,
          messages: [],
          tags: [],
          sessionId: `whatsapp_${Date.now()}_${customerPhone.replace(/[^0-9]/g, '')}`,
          customerPhone: customerPhone
        }
      });

      console.log('✅ New CRM conversation created:', conversation.id);
    }

    return conversation;
  } catch (error) {
    console.error('❌ Error finding/creating CRM conversation:', error);
    throw error;
  }
}

/**
 * 5. Generar respuesta con personalidad del User
 */
async function generateUserAgentResponse(agent, messageText, customerLead, conversation) {
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

    // Preparar contexto COMPLETO de conversación
    const conversationHistory = [
      // Incluir TODOS los mensajes anteriores de la conversación
      ...(conversation.messages || []),
      // Agregar el nuevo mensaje del usuario
      { role: 'user', content: messageText, timestamp: new Date().toISOString() }
    ];

    // Contexto adicional
    const context = {
      leadId: customerLead.id,
      phone: customerLead.phone,
      agentId: agent.id,
      userId: agent.userId
    };

    // ✅ ARREGLADO: Generar respuesta con OpenAI usando configuración del usuario
    const response = await openaiService.generateNaturalResponseWithCustomPrompt(
      conversationHistory,
      systemPrompt,
      context,
      'conversation', // currentIntent
      agent.model || 'gpt-5-mini', // userModel - now defaults to GPT-5 Mini
      agent.temperature !== null ? agent.temperature : 0.7, // userTemperature
      agent.maxTokensPerMessage || 500, // userMaxTokens
      agent.reasoningEffort || 'medium', // userReasoningEffort for GPT-5
      agent.verbosity || 'medium' // userVerbosity for GPT-5
    );

    if (response.success) {
      // Actualizar conversación con mensajes
      const updatedMessages = [
        ...(conversation.messages || []),
        { role: 'user', content: messageText, timestamp: new Date().toISOString() },
        { role: 'assistant', content: response.message, timestamp: new Date().toISOString(), agentId: agent.id }
      ];

      await prisma.cRMConversation.update({
        where: { id: conversation.id },
        data: {
          messages: updatedMessages,
          messageCount: { increment: 2 }, // User + Assistant
          lastActivity: new Date()
        }
      });

      console.log('✅ User agent response generated');
    }

    return response;
  } catch (error) {
    console.error('❌ Error generating user agent response:', error);
    return { success: false, error: error.message };
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
 * 7. Registrar métricas del User
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

    // Actualizar métricas
    const updateData = {};
    if (metrics.messageReceived) updateData.totalMessages = { increment: 1 };
    if (metrics.messageSent) updateData.totalMessages = { increment: 1 };

    if (Object.keys(updateData).length > 0) {
      await prisma.cRMMetrics.update({
        where: { id: crmMetrics.id },
        data: updateData
      });
    }

    console.log('✅ User CRM metrics updated');
  } catch (error) {
    console.error('❌ Error updating User CRM metrics:', error);
  }
}

module.exports = router;