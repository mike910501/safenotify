const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * SafeNotify Content Service - Multimedia content management for Sofia AI
 * Handles video, PDF, infographic, and calculator content delivery
 */

// Content library mapping
const CONTENT_LIBRARY = {
  // Compliance & Risk Content
  compliance_risk_video: {
    type: 'video',
    category: 'compliance',
    title: 'El Riesgo Oculto del WhatsApp Personal',
    description: 'Video de 2 minutos explicando riesgos legales Habeas Data',
    fileUrl: process.env.CONTENT_BASE_URL + '/videos/whatsapp-risk.mp4',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/whatsapp-risk.jpg',
    duration: 120,
    specialty: ['all'],
    conversationStage: ['risk_education'],
    fallbackText: 'El uso de WhatsApp personal para pacientes puede generar multas hasta $2.000 millones. La SIC ya ha sancionado clínicas. Te enviaré más info por email.'
  },
  
  compliance_infographic: {
    type: 'infographic',
    category: 'compliance',
    title: 'WhatsApp Personal vs SafeNotify - Comparativo',
    description: 'Infografía comparando riesgos y beneficios',
    fileUrl: process.env.CONTENT_BASE_URL + '/infographics/whatsapp-vs-safenotify.pdf',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/comparison.jpg',
    specialty: ['all'],
    conversationStage: ['risk_education', 'objection_handling']
  },
  
  // ROI & Calculator Content
  roi_calculator: {
    type: 'calculator',
    category: 'roi',
    title: 'Calculadora ROI SafeNotify',
    description: 'Calcula el ahorro específico para tu clínica',
    fileUrl: process.env.CONTENT_BASE_URL + '/tools/roi-calculator.pdf',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/calculator.jpg',
    specialty: ['all'],
    conversationStage: ['roi_calculation'],
    interactive: true,
    fallbackText: 'Una clínica con 150 pacientes/mes y 20% no-shows ahorra $8M mensuales con SafeNotify. ¿Cuál es tu volumen?'
  },
  
  // Case Studies
  case_study_medical: {
    type: 'pdf',
    category: 'cases',
    title: 'Caso de Éxito: Dr. Martínez - 70% Menos No-Shows',
    description: 'Caso real de implementación en clínica dermatológica',
    fileUrl: process.env.CONTENT_BASE_URL + '/cases/dr-martinez-case.pdf',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/case-study.jpg',
    specialty: ['dermatología', 'all'],
    conversationStage: ['case_studies', 'demo_interest']
  },
  
  case_study_dermatology: {
    type: 'video',
    category: 'cases',
    title: 'Testimonio: Clínica Dermatológica',
    description: 'Video testimonial de dermatólogo usando SafeNotify',
    fileUrl: process.env.CONTENT_BASE_URL + '/videos/dermatology-testimonial.mp4',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/dermatology.jpg',
    duration: 180,
    specialty: ['dermatología', 'cirugía estética'],
    conversationStage: ['case_studies']
  },
  
  // Product Demo Content
  product_demo_video: {
    type: 'video',
    category: 'product_demo',
    title: 'SafeNotify en 60 segundos',
    description: 'Demo rápida de las funcionalidades principales',
    fileUrl: process.env.CONTENT_BASE_URL + '/videos/safenotify-demo-60s.mp4',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/demo.jpg',
    duration: 60,
    specialty: ['all'],
    conversationStage: ['demo_interest', 'qualification_basic']
  },
  
  // Objection Handling
  objection_pricing: {
    type: 'infographic',
    category: 'objection_handling',
    title: 'SafeNotify vs Costos de No-Shows',
    description: 'Comparativo de costos real vs inversión SafeNotify',
    fileUrl: process.env.CONTENT_BASE_URL + '/infographics/pricing-comparison.pdf',
    thumbnailUrl: process.env.CONTENT_BASE_URL + '/thumbnails/pricing.jpg',
    specialty: ['all'],
    conversationStage: ['objection_handling']
  }
};

/**
 * Send multimedia content to prospect
 */
async function sendContent(phoneNumber, contentType, conversationStep) {
  try {
    console.log('📎 Sending content:', contentType, 'to:', phoneNumber.substring(0, 8) + '***');

    // Get content configuration
    const content = CONTENT_LIBRARY[contentType];
    if (!content) {
      console.log('❌ Content type not found:', contentType);
      return await sendFallbackText(phoneNumber, contentType);
    }

    // Check if content is appropriate for conversation step
    if (!content.conversationStage.includes(conversationStep) && !content.conversationStage.includes('all')) {
      console.log('⚠️ Content not appropriate for stage:', conversationStep);
      return await sendFallbackText(phoneNumber, contentType);
    }

    // Send content via WhatsApp
    const result = await sendWhatsAppContent(phoneNumber, content);
    
    if (result.success) {
      // Track content delivery
      await trackContentDelivery(phoneNumber, contentType, result.messageSid);
      
      // Update usage count in database
      await updateContentUsage(contentType);
    }

    return result;

  } catch (error) {
    console.error('❌ Content service error:', error);
    return await sendFallbackText(phoneNumber, contentType);
  }
}

/**
 * Send WhatsApp content (video, image, PDF)
 */
async function sendWhatsAppContent(phoneNumber, content) {
  try {
    const salesNumber = process.env.SOFIA_SALES_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
    
    let messageData = {
      from: `whatsapp:${salesNumber}`,
      to: `whatsapp:${phoneNumber}`
    };

    // Handle different content types
    switch (content.type) {
      case 'video':
        messageData.body = `🎥 ${content.title}\n\n${content.description}`;
        if (content.fileUrl && content.fileUrl !== (process.env.CONTENT_BASE_URL + '/videos/placeholder.mp4')) {
          messageData.mediaUrl = [content.fileUrl];
        } else {
          // Fallback if video not available
          messageData.body += `\n\n${content.fallbackText || 'Video disponible en: safenotify.co/demo'}`;
        }
        break;

      case 'pdf':
      case 'infographic':
        messageData.body = `📄 ${content.title}\n\n${content.description}`;
        if (content.fileUrl && content.fileUrl !== (process.env.CONTENT_BASE_URL + '/docs/placeholder.pdf')) {
          messageData.mediaUrl = [content.fileUrl];
        } else {
          // Fallback if PDF not available
          messageData.body += `\n\nTe enviaré el documento por email.`;
        }
        break;

      case 'calculator':
        messageData.body = `🧮 ${content.title}\n\n${content.description}\n\n`;
        if (content.interactive && content.fallbackText) {
          messageData.body += content.fallbackText;
        } else {
          messageData.body += 'Accede a la calculadora en: safenotify.co/roi-calculator';
        }
        break;

      default:
        messageData.body = `${content.title}\n\n${content.description}`;
    }

    // Send message
    const twilioMessage = await client.messages.create(messageData);

    console.log('✅ Content sent via WhatsApp:', twilioMessage.sid);

    return {
      success: true,
      messageSid: twilioMessage.sid,
      contentType: content.type,
      contentTitle: content.title
    };

  } catch (error) {
    console.error('❌ Error sending WhatsApp content:', error);
    
    // Try sending text-only fallback
    return await sendFallbackText(phoneNumber, content.title);
  }
}

/**
 * Send fallback text when media fails
 */
async function sendFallbackText(phoneNumber, contentType) {
  try {
    const salesNumber = process.env.SOFIA_SALES_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
    
    const fallbackMessages = {
      compliance_risk_video: "⚠️ IMPORTANTE: Usar WhatsApp personal con pacientes puede generar multas hasta $2.000 millones por Habeas Data. La SIC ya sancionó clínicas. SafeNotify te protege 100%. ¿Conocías este riesgo?",
      roi_calculator: "💰 ROI SafeNotify: Una clínica promedio ahorra $8-15M mensuales solo reduciendo no-shows. Con 150 pacientes/mes y 20% no-shows = $8M ahorro mensual. ¿Cuál es tu volumen de pacientes?",
      case_study_medical: "📋 CASO REAL: Dr. Martínez (dermatólogo) redujo no-shows 70% en 2 meses con SafeNotify. De 25% no-shows pasó a 8%. Ahorro: $12M mensuales. ¿Te gustaría ver los números completos?",
      product_demo_video: "🎯 SafeNotify en resumen: Recordatorios automáticos, confirmaciones WhatsApp, compliance Habeas Data, reducción no-shows 70%, implementación 5 minutos. ¿Te interesa verlo funcionando?",
      default: "Te enviaré la información por email. Mientras, ¿tienes alguna pregunta específica sobre SafeNotify?"
    };

    const message = fallbackMessages[contentType] || fallbackMessages.default;

    const twilioMessage = await client.messages.create({
      from: `whatsapp:${salesNumber}`,
      to: `whatsapp:${phoneNumber}`,
      body: message
    });

    return {
      success: true,
      messageSid: twilioMessage.sid,
      fallback: true,
      contentType: 'text'
    };

  } catch (error) {
    console.error('❌ Error sending fallback text:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Track content delivery for analytics
 */
async function trackContentDelivery(phoneNumber, contentType, messageSid) {
  try {
    // Find the lead
    const lead = await prisma.safeNotifyLead.findUnique({
      where: { phone: phoneNumber },
      include: {
        conversations: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!lead || !lead.conversations[0]) {
      console.log('⚠️ No active conversation found for content tracking');
      return;
    }

    // Update conversation with content sent
    await prisma.safeNotifyConversation.update({
      where: { id: lead.conversations[0].id },
      data: {
        contentSent: {
          push: contentType
        }
      }
    });

    console.log('✅ Content delivery tracked for lead:', lead.id);

  } catch (error) {
    console.error('❌ Error tracking content delivery:', error);
    // Don't throw - tracking failures shouldn't break content delivery
  }
}

/**
 * Update content usage statistics
 */
async function updateContentUsage(contentType) {
  try {
    const content = CONTENT_LIBRARY[contentType];
    if (!content) return;

    // Try to find existing content record
    let contentRecord = await prisma.safeNotifyContent.findFirst({
      where: {
        title: content.title,
        type: content.type
      }
    });

    if (contentRecord) {
      // Update usage count
      await prisma.safeNotifyContent.update({
        where: { id: contentRecord.id },
        data: {
          usageCount: { increment: 1 },
          updatedAt: new Date()
        }
      });
    } else {
      // Create new content record
      await prisma.safeNotifyContent.create({
        data: {
          type: content.type,
          category: content.category,
          title: content.title,
          description: content.description,
          fileUrl: content.fileUrl,
          thumbnailUrl: content.thumbnailUrl,
          duration: content.duration,
          specialty: content.specialty,
          conversationStage: content.conversationStage,
          usageCount: 1
        }
      });
    }

    console.log('✅ Content usage updated for:', contentType);

  } catch (error) {
    console.error('❌ Error updating content usage:', error);
    // Don't throw - usage tracking failures shouldn't break flow
  }
}

/**
 * Get content recommendations based on lead profile
 */
async function getContentRecommendations(leadId, conversationStep) {
  try {
    const lead = await prisma.safeNotifyLead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return [];

    const recommendations = [];

    // Get appropriate content for conversation stage
    for (const [contentType, content] of Object.entries(CONTENT_LIBRARY)) {
      if (content.conversationStage.includes(conversationStep) || content.conversationStage.includes('all')) {
        
        // Check specialty match
        if (content.specialty.includes('all') || 
            (lead.specialty && content.specialty.some(s => lead.specialty.includes(s)))) {
          
          recommendations.push({
            contentType,
            title: content.title,
            description: content.description,
            type: content.type,
            category: content.category,
            priority: calculateContentPriority(content, lead, conversationStep)
          });
        }
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations;

  } catch (error) {
    console.error('❌ Error getting content recommendations:', error);
    return [];
  }
}

/**
 * Calculate content priority for personalization
 */
function calculateContentPriority(content, lead, conversationStep) {
  let priority = 0;

  // Stage relevance
  if (content.conversationStage.includes(conversationStep)) priority += 10;

  // Specialty match
  if (lead.specialty && content.specialty.includes(lead.specialty)) priority += 8;

  // Lead score influence
  if (lead.qualificationScore >= 70) {
    // High-value leads get premium content
    if (content.category === 'cases' || content.category === 'product_demo') priority += 5;
  } else {
    // Lower-value leads get education content
    if (content.category === 'compliance' || content.category === 'roi') priority += 5;
  }

  // Content type preferences
  if (content.type === 'video') priority += 3; // Videos generally perform better
  if (content.type === 'calculator') priority += 2; // Interactive content

  return priority;
}

/**
 * Generate ROI calculation personalized for lead
 */
async function generatePersonalizedROI(leadId) {
  try {
    const lead = await prisma.safeNotifyLead.findUnique({
      where: { id: leadId }
    });

    if (!lead) return null;

    const monthlyPatients = lead.monthlyPatients || 100;
    const noShowRate = parseFloat(lead.noShowRate) || 20; // Default 20%
    const specialty = lead.specialty || 'medicina general';

    // Cost per no-show by specialty
    const costPerNoShow = {
      'dermatología': 500000,
      'cirugía estética': 800000,
      'ortopedia': 400000,
      'cardiología': 600000,
      'medicina general': 200000
    };

    const cost = costPerNoShow[specialty] || costPerNoShow['medicina general'];
    const monthlyNoShows = Math.round((monthlyPatients * noShowRate) / 100);
    const monthlyLoss = monthlyNoShows * cost;
    
    // SafeNotify reduces no-shows by 70%
    const monthlySavings = Math.round(monthlyLoss * 0.7);
    const annualSavings = monthlySavings * 12;
    const safenotifyCost = 250000; // Monthly cost
    const roi = Math.round(((monthlySavings - safenotifyCost) / safenotifyCost) * 100);

    return {
      monthlyPatients,
      noShowRate,
      monthlyNoShows,
      monthlyLoss: Math.round(monthlyLoss / 1000000), // In millions
      monthlySavings: Math.round(monthlySavings / 1000000), // In millions
      annualSavings: Math.round(annualSavings / 1000000), // In millions
      roi,
      paybackDays: Math.ceil(safenotifyCost / (monthlySavings / 30))
    };

  } catch (error) {
    console.error('❌ Error generating personalized ROI:', error);
    return null;
  }
}

module.exports = {
  sendContent,
  getContentRecommendations,
  generatePersonalizedROI,
  CONTENT_LIBRARY
};