/**
 * 🚀 PHASE 5.1: Human Takeover Service
 * Manages AI-to-Human handoff for CRM conversations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Initiate human takeover of conversation
 */
async function initiateHumanTakeover(conversationId, takingOverUserId, reason, customerMessage = null) {
  console.log(`🙋‍♂️ Initiating human takeover for conversation: ${conversationId}`);
  
  try {
    // Get current conversation state
    const conversation = await prisma.cRMConversation.findUnique({
      where: { id: conversationId },
      include: { 
        currentAgent: true,
        user: true,
        takeoverLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if user has permission to take over this conversation
    if (conversation.userId !== takingOverUserId && conversation.assignedToUserId !== takingOverUserId) {
      throw new Error('User not authorized to take over this conversation');
    }

    const previousMode = conversation.collaborationMode || 'ai_only';
    const newMode = 'human_only';

    // Update conversation with takeover details
    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: {
        humanTakeover: true,
        takingOverUserId: takingOverUserId,
        takeoverAt: new Date(),
        takeoverReason: reason,
        collaborationMode: newMode,
        lastHumanResponse: new Date(),
        escalationLevel: reason.includes('urgent') ? 2 : reason.includes('escalate') ? 1 : 0
      }
    });

    // Log the takeover event
    const takeoverLog = await prisma.conversationTakeoverLog.create({
      data: {
        conversationId: conversationId,
        userId: takingOverUserId,
        eventType: 'takeover_started',
        fromMode: previousMode,
        toMode: newMode,
        reason: reason,
        customerMessage: customerMessage,
        metadata: {
          previousAgentId: conversation.currentAgentId,
          previousAgentName: conversation.currentAgent?.name,
          takeoverInitiatedBy: 'user'
        }
      }
    });

    console.log('✅ Human takeover initiated successfully');

    return {
      success: true,
      conversation: updatedConversation,
      takeoverLog: takeoverLog,
      message: `Human takeover initiated. Conversation switched from ${previousMode} to ${newMode}`
    };

  } catch (error) {
    console.error('❌ Error initiating human takeover:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * End human takeover and return to AI
 */
async function endHumanTakeover(conversationId, endingUserId, returnToMode = 'ai_only') {
  console.log(`🤖 Ending human takeover for conversation: ${conversationId}`);
  
  try {
    const conversation = await prisma.cRMConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.humanTakeover) {
      throw new Error('No active human takeover to end');
    }

    // Check authorization
    if (conversation.takingOverUserId !== endingUserId && conversation.userId !== endingUserId) {
      throw new Error('User not authorized to end this takeover');
    }

    const previousMode = conversation.collaborationMode;

    // Update conversation
    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: {
        humanTakeover: false,
        collaborationMode: returnToMode,
        escalationLevel: 0 // Reset escalation
      }
    });

    // Log the event
    await prisma.conversationTakeoverLog.create({
      data: {
        conversationId: conversationId,
        userId: endingUserId,
        eventType: 'takeover_ended',
        fromMode: previousMode,
        toMode: returnToMode,
        reason: 'Human ended takeover',
        metadata: {
          takeoverDuration: conversation.takeoverAt ? 
            Math.floor((new Date() - conversation.takeoverAt) / 1000) : null
        }
      }
    });

    console.log('✅ Human takeover ended successfully');

    return {
      success: true,
      conversation: updatedConversation,
      message: `Takeover ended. Conversation returned to ${returnToMode}`
    };

  } catch (error) {
    console.error('❌ Error ending human takeover:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate AI suggestions for human agent
 */
async function generateAISuggestions(conversationId, currentMessage, userId) {
  console.log(`🧠 Generating AI suggestions for conversation: ${conversationId}`);
  
  try {
    const conversation = await prisma.cRMConversation.findUnique({
      where: { id: conversationId },
      include: {
        currentAgent: true,
        customerLead: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get recent messages for context
    const recentMessages = conversation.messages.slice(-5);
    const messageContext = recentMessages.map(msg => 
      `${msg.role === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n');

    // Generate different types of suggestions
    const suggestions = [
      {
        type: 'response',
        title: 'Suggested Response',
        content: await generateResponseSuggestion(messageContext, currentMessage, conversation.currentAgent),
        confidence: 85
      },
      {
        type: 'action',
        title: 'Recommended Action',
        content: await generateActionSuggestion(currentMessage, conversation),
        confidence: 90
      },
      {
        type: 'escalation',
        title: 'Escalation Options',
        content: await generateEscalationSuggestion(conversation),
        confidence: 75
      }
    ];

    // Update conversation with latest AI suggestion timestamp
    await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: {
        lastAiSuggestion: new Date(),
        aiSuggestions: [...conversation.aiSuggestions, {
          timestamp: new Date().toISOString(),
          suggestions: suggestions,
          triggeredBy: currentMessage.substring(0, 100)
        }]
      }
    });

    // Log AI suggestion event
    await prisma.conversationTakeoverLog.create({
      data: {
        conversationId: conversationId,
        userId: userId,
        eventType: 'ai_suggestion',
        fromMode: conversation.collaborationMode,
        toMode: conversation.collaborationMode,
        reason: 'AI assistance requested',
        customerMessage: currentMessage,
        aiSuggestion: { suggestions: suggestions },
        metadata: {
          suggestionCount: suggestions.length,
          avgConfidence: suggestions.reduce((acc, s) => acc + s.confidence, 0) / suggestions.length
        }
      }
    });

    console.log('✅ AI suggestions generated successfully');

    return {
      success: true,
      suggestions: suggestions,
      conversationContext: {
        customerName: conversation.customerLead?.name,
        businessType: conversation.customerLead?.businessType,
        status: conversation.status,
        priority: conversation.priority
      }
    };

  } catch (error) {
    console.error('❌ Error generating AI suggestions:', error);
    return {
      success: false,
      error: error.message,
      suggestions: []
    };
  }
}

/**
 * Get takeover status and history for conversation
 */
async function getTakeoverStatus(conversationId) {
  try {
    const conversation = await prisma.cRMConversation.findUnique({
      where: { id: conversationId },
      include: {
        takeoverLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { name: true, email: true } } }
        },
        user: { select: { name: true, email: true } }
      }
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    return {
      success: true,
      status: {
        isHumanTakeover: conversation.humanTakeover,
        collaborationMode: conversation.collaborationMode,
        takeoverAt: conversation.takeoverAt,
        takeoverReason: conversation.takeoverReason,
        escalationLevel: conversation.escalationLevel,
        lastAiSuggestion: conversation.lastAiSuggestion,
        aiSuggestionsCount: conversation.aiSuggestions.length
      },
      history: conversation.takeoverLogs,
      owner: conversation.user
    };

  } catch (error) {
    console.error('❌ Error getting takeover status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Request human takeover (triggered by customer or system)
 */
async function requestHumanTakeover(conversationId, requestReason, requestedBy = 'customer') {
  console.log(`📞 Human takeover requested for conversation: ${conversationId}`);
  
  try {
    const conversation = await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: {
        takeoverRequested: true,
        escalationLevel: requestReason.includes('urgent') ? 2 : 1
      }
    });

    // Log the request
    await prisma.conversationTakeoverLog.create({
      data: {
        conversationId: conversationId,
        userId: conversation.userId, // Default to conversation owner
        eventType: 'takeover_requested',
        fromMode: conversation.collaborationMode,
        toMode: conversation.collaborationMode,
        reason: requestReason,
        metadata: {
          requestedBy: requestedBy,
          autoEscalated: requestReason.includes('urgent')
        }
      }
    });

    console.log('✅ Human takeover requested successfully');

    return {
      success: true,
      conversation: conversation,
      message: `Human takeover requested: ${requestReason}`
    };

  } catch (error) {
    console.error('❌ Error requesting human takeover:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper functions for AI suggestions

async function generateResponseSuggestion(messageContext, currentMessage, agent) {
  // Mock implementation - in real system would use OpenAI API
  const suggestions = [
    "I understand your concern. Let me help you with that right away.",
    "Thank you for bringing this to my attention. Here's what I can do for you:",
    "I appreciate your patience. Let me check this for you and provide a solution."
  ];
  
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

async function generateActionSuggestion(currentMessage, conversation) {
  const actions = [
    "Escalate to supervisor",
    "Offer discount/compensation",
    "Schedule follow-up call",
    "Send detailed documentation",
    "Transfer to technical support"
  ];
  
  return actions[Math.floor(Math.random() * actions.length)];
}

async function generateEscalationSuggestion(conversation) {
  const escalations = [
    "Consider transferring to senior agent",
    "Offer phone call for better resolution",
    "Escalate to manager if issue persists",
    "Provide direct contact for urgent matters"
  ];
  
  return escalations[Math.floor(Math.random() * escalations.length)];
}

module.exports = {
  initiateHumanTakeover,
  endHumanTakeover,
  generateAISuggestions,
  getTakeoverStatus,
  requestHumanTakeover
};