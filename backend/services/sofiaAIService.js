const { PrismaClient } = require('@prisma/client');
const safenotifyDemoService = require('./safenotifyDemoService');
const openaiService = require('./openaiService');
const dynamicPromptService = require('./dynamicPromptService');
const fallbackService = require('./fallbackResponseService');
const twilioService = require('../config/twilio');
const prisma = new PrismaClient();

/**
 * Sofia AI Service - Especialista en vender SafeNotify a cualquier tipo de negocio
 * Personalidad: Consultiva, educativa, enfocada en compliance y ROI
 * AHORA COMPATIBLE CON SISTEMA MULTI-AGENTE CRM
 */

// Sofia's personality configuration
const SOFIA_PERSONALITY = {
  name: "Sofia",
  role: "Especialista en Comunicación Automatizada y Compliance",
  expertise: ["Compliance Habeas Data", "Riesgos WhatsApp personal", "ROI negocios", "No-shows reduction", "Automatización"],
  tone: "consultiva_amigable",
  language: "es_CO",
  maxResponseLength: 180,
  greeting: "¡Hola! 😊 SafeNotify es una empresa que presta servicios de mensajería por WhatsApp. No importa qué negocio tengas, puedes configurar tus plantillas y estas serán activadas en máximo 24 horas 🚀\n\n💻 Página web: www.safenotify.co\n📞 Demo personal: 3133592457\n\n💰 Precios:\n• Básico: $25.000/mes (100 mensajes)\n• Pro: $50.000/mes (500 mensajes) - Más Popular\n• Enterprise: $100.000/mes (2.000 mensajes)\n\n📝 Para recibir más información, déjanos tus datos: correo, nombre y tipo de negocio. Un humano te contactará y te dará más información.",
  handoffMessage: "¡Perfecto! 👍 Te voy a conectar con nuestro especialista para una asesoría personalizada según tu sector."
};

// Conversation states específicos para SafeNotify sales
const CONVERSATION_STATES = {
  GREETING_CLINIC: 'greeting_clinic',
  QUALIFICATION_BASIC: 'qualification_basic',
  RISK_EDUCATION: 'risk_education',
  ROI_CALCULATION: 'roi_calculation',
  CASE_STUDIES: 'case_studies',
  DEMO_INTEREST: 'demo_interest',
  OBJECTION_HANDLING: 'objection_handling',
  SCHEDULING_DEMO: 'scheduling_demo',
  FOLLOW_UP: 'follow_up',
  HANDOFF_SALES: 'handoff_sales'
};

// Qualifying questions adaptables por sector
const QUALIFYING_QUESTIONS = {
  VOLUME: {
    question: "¿Aproximadamente cuántos clientes/usuarios atienden al mes?",
    followUp: "Perfecto, con ese volumen SafeNotify puede generar un impacto significativo.",
    scoring: {
      "200+": 30,
      "100-200": 20,
      "50-100": 10,
      "<50": 5
    }
  },
  CURRENT_SYSTEM: {
    question: "¿Cómo manejan actualmente la comunicación con clientes? ¿Usan WhatsApp personal?",
    followUp: "Entiendo. Ese es exactamente el tipo de situación donde SafeNotify marca la diferencia.",
    riskTriggers: ["whatsapp personal", "celular personal", "número personal"]
  },
  BUSINESS_TYPE: {
    question: "¿Cuál es el sector o tipo de negocio de su empresa?",
    premiumSectors: ["medicina", "dermatología", "cirugía estética", "educación", "restaurantes"],
    basicSectors: ["comercio general", "servicios básicos"]
  },
  COMPLIANCE_KNOWLEDGE: {
    question: "¿Conocen las regulaciones actuales de Habeas Data para empresas en Colombia?",
    followUp: "Muchas empresas no saben que usar WhatsApp personal puede generar multas hasta $2.000 millones."
  },
  PAIN_POINTS: {
    question: "¿Cuál dirían que es su mayor problema: falta de clientes, confirmaciones tardías, o comunicación con usuarios?",
    painPoints: ["no-shows", "confirmaciones", "comunicación", "recordatorios"]
  }
};

// Business sector scoring
const BUSINESS_SECTOR_SCORING = {
  premium: {
    sectors: ["dermatología", "cirugía estética", "medicina", "educación", "capacitación", "restaurantes", "odontología"],
    multiplier: 2.0,
    reasoning: "Sectores con alto valor por cliente y necesidad de comunicación profesional"
  },
  standard: {
    sectors: ["servicios profesionales", "comercio", "consultoría", "tecnología", "inmobiliaria"],
    multiplier: 1.5,
    reasoning: "Sectores con seguimiento regular de clientes"
  },
  basic: {
    sectors: ["comercio general", "servicios básicos", "ventas"],
    multiplier: 1.0,
    reasoning: "Sectores básicos con menor valor por transacción"
  }
};

/**
 * Create or find SafeNotify lead
 */
async function createOrFindLead(phoneNumber, initialData = {}) {
  try {
    console.log('🔍 Sofia AI - Creating/finding lead for:', phoneNumber.substring(0, 8) + '***');

    // Try to find existing lead
    let lead = await prisma.safeNotifyLead.findUnique({
      where: { phone: phoneNumber },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (lead) {
      console.log('✅ Found existing SafeNotify lead:', lead.id);
      
      // Update last activity
      lead = await prisma.safeNotifyLead.update({
        where: { id: lead.id },
        data: { 
          lastActivity: new Date(),
          isActive: true
        },
        include: {
          conversations: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      return lead;
    }

    // Create new lead
    lead = await prisma.safeNotifyLead.create({
      data: {
        phone: phoneNumber,
        source: 'whatsapp',
        conversationState: CONVERSATION_STATES.GREETING_CLINIC,
        status: 'new',
        grade: 'C',
        qualificationScore: 0,
        isActive: true,
        lastActivity: new Date(),
        ...initialData
      },
      include: {
        conversations: true
      }
    });

    console.log('✅ Created new SafeNotify lead:', lead.id);
    return lead;

  } catch (error) {
    console.error('❌ Error creating/finding SafeNotify lead:', error);
    throw new Error('Failed to create/find lead');
  }
}

/**
 * Process incoming message from prospect
 */
async function processProspectMessage(phoneNumber, messageText, messageSid = null, agentId = null) {
  try {
    console.log('🎯 Sofia AI - Processing message from:', phoneNumber.substring(0, 8) + '***');
    console.log('📝 Message content:', messageText.substring(0, 50) + '...');

    // Check if message is a button press (interactive message response)
    if (isButtonPress(messageText)) {
      return await handleButtonPress(phoneNumber, messageText, messageSid);
    }

    // Find or create lead
    const lead = await createOrFindLead(phoneNumber);

    // Find or create active conversation
    let conversation = await findOrCreateConversation(lead.id, phoneNumber);

    // Add incoming message to conversation
    const newMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      messageSid: messageSid
    };

    const updatedMessages = [...(conversation.messages || []), newMessage];

    // Extract personal information from message
    const personalInfo = extractPersonalInfo(messageText);
    console.log('👤 Extracted personal info:', personalInfo);

    // Analyze message and determine intent
    const intent = detectIntent(messageText, lead.conversationState);
    console.log('🧠 Detected intent:', intent);

    // Update conversation with new message
    conversation = await prisma.safeNotifyConversation.update({
      where: { id: conversation.id },
      data: {
        messages: updatedMessages,
        intent: intent,
        messageCount: { increment: 1 },
        updatedAt: new Date()
      },
      include: {
        lead: true
      }
    });

    // 🤖 Sofia AI: SafeNotify's internal sales system
    // Sofia maneja leads para vender SafeNotify, NO es parte del User CRM
    const selectedAgent = {
      id: 'sofia_internal',
      name: 'Sofia',
      description: 'Asistente de ventas interna de SafeNotify'
    };
    console.log('🎯 Using Sofia (SafeNotify internal sales agent)');

    // Update conversation with Sofia as current agent
    await prisma.safeNotifyConversation.update({
      where: { id: conversation.id },
      data: { currentAgent: 'Sofia' }
    });

    // Check if we need to generate/update dynamic prompt
    let dynamicPrompt = null;
    const messageCount = updatedMessages.length;
    
    if (messageCount === 1) {
      // First message - generate initial prompt
      console.log('🎯 First message detected, generating initial prompt...');
      dynamicPrompt = await dynamicPromptService.generateInitialPrompt(
        lead.id,
        phoneNumber,
        messageText,
        { agentId: 'sofia_internal' }
      );
    } else {
      // Check if we should update prompt (every 3 messages)
      const currentPrompt = await dynamicPromptService.getCurrentPrompt(lead.id);
      if (dynamicPromptService.shouldUpdatePrompt(messageCount, 0)) {
        console.log('🔄 Updating prompt with conversation summary...');
        dynamicPrompt = await dynamicPromptService.updatePromptWithSummary(
          lead.id,
          updatedMessages,
          { content: messageText, agentId: 'sofia_internal' }
        );
      } else {
        dynamicPrompt = currentPrompt;
      }
    }

    // Generate AI response using Sofia with dynamic prompt
    const response = await generateAgentResponseWithDynamicPrompt(
      conversation, 
      messageText, 
      intent, 
      dynamicPrompt,
      null // Sofia uses built-in prompts, not CRM agents
    );

    // Add AI agent's response to conversation
    const agentMessage = {
      role: 'assistant',
      content: response.message,
      timestamp: new Date().toISOString(),
      personality: 'sofia',
      agentId: 'sofia_internal'
    };

    const finalMessages = [...updatedMessages, agentMessage];
    
    // Update prompt AFTER agent responds to include their response
    console.log('🔄 Updating prompt after agent response...');
    await dynamicPromptService.updatePromptWithSummary(
      lead.id,
      finalMessages, // Include agent's response in the summary
      { content: response.message, role: 'assistant', agentId: 'sofia_internal' }
    );

    // Update conversation and lead state
    await prisma.safeNotifyConversation.update({
      where: { id: conversation.id },
      data: {
        messages: finalMessages,
        currentStep: response.nextStep,
        updatedAt: new Date()
      }
    });

    // Update lead with new qualification data and score
    const leadUpdateData = {
      ...(response.leadUpdates || {}),
      conversationState: response.nextStep,
      lastActivity: new Date(),
      updatedAt: new Date()
    };

    // Add personal info if extracted
    if (personalInfo.name && !lead.name) {
      leadUpdateData.name = personalInfo.name;
      console.log('✅ Name extracted and saved:', personalInfo.name);
    }
    if (personalInfo.email && !lead.email) {
      leadUpdateData.email = personalInfo.email;
      console.log('✅ Email extracted and saved:', personalInfo.email);
    }

    if (Object.keys(leadUpdateData).length > 3) { // More than just the default 3 fields
      await prisma.safeNotifyLead.update({
        where: { id: lead.id },
        data: leadUpdateData
      });
    }

    console.log('✅ Sofia response generated:', response.message.substring(0, 50) + '...');
    console.log('📊 Next step:', response.nextStep);

    return {
      success: true,
      response: response.message,
      buttons: response.buttons || null,
      interactive: response.interactive || false,
      nextStep: response.nextStep,
      leadScore: response.leadScore || lead.qualificationScore,
      shouldSendContent: response.shouldSendContent || false,
      contentToSend: response.contentToSend || null,
      handoffRequired: response.handoffRequired || false,
      fallback: response.fallback || false
    };

  } catch (error) {
    console.error('❌ Sofia AI processing error:', error);
    
    // Activate interactive fallback
    console.log('🔄 Activating emergency interactive fallback...');
    const emergencyFallback = fallbackService.getInitialFallbackResponse();
    const formattedFallback = fallbackService.formatResponseForWhatsApp(emergencyFallback);
    
    return {
      success: false,
      response: formattedFallback.text,
      buttons: formattedFallback.buttons,
      interactive: true,
      nextStep: CONVERSATION_STATES.GREETING_CLINIC,
      fallback: true,
      error: error.message
    };
  }
}

/**
 * Find or create conversation for lead
 */
async function findOrCreateConversation(leadId, phoneNumber) {
  try {
    // Look for active conversation
    let conversation = await prisma.safeNotifyConversation.findFirst({
      where: {
        leadId: leadId,
        isActive: true
      },
      include: {
        lead: true
      }
    });

    if (conversation) {
      return conversation;
    }

    // Create new conversation
    conversation = await prisma.safeNotifyConversation.create({
      data: {
        leadId: leadId,
        sessionId: `sofia_${leadId}_${Date.now()}`,
        personality: 'sofia',
        currentStep: CONVERSATION_STATES.GREETING_CLINIC,
        isActive: true,
        messages: []
      },
      include: {
        lead: true
      }
    });

    return conversation;

  } catch (error) {
    console.error('❌ Error finding/creating conversation:', error);
    throw error;
  }
}

/**
 * Detect intent from message content
 */
function detectIntent(messageText, currentState) {
  const text = messageText.toLowerCase();

  // Intent patterns
  const intentPatterns = {
    info_safenotify: [
      'información', 'info', 'qué es safenotify', 'como funciona', 'detalles', 'características'
    ],
    demo_request: [
      'demo', 'demostración', 'ver', 'mostrar', 'prueba', 'agendar', 'cita'
    ],
    pricing_safenotify: [
      'precio', 'costo', 'cuánto', 'planes', 'tarifa', 'valor'
    ],
    compliance_concern: [
      'legal', 'habeas data', 'multa', 'regulación', 'compliance', 'privacidad'
    ],
    no_show_problem: [
      'no-show', 'no llegan', 'faltan', 'cancelan', 'confirmar'
    ],
    current_system: [
      'whatsapp personal', 'celular', 'teléfono', 'sistema actual', 'como manejamos'
    ]
  };

  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some(pattern => text.includes(pattern))) {
      return intent;
    }
  }

  // Context-based intent detection
  if (currentState === CONVERSATION_STATES.QUALIFICATION_BASIC) {
    if (text.match(/\d+/) && (text.includes('paciente') || text.includes('mes'))) {
      return 'patient_volume_response';
    }
  }

  return 'general_inquiry';
}

/**
 * Generate Sofia's response using REAL AI with context
 */
async function generateSofiaResponse(conversation, messageText, intent) {
  const lead = conversation.lead;
  const currentStep = conversation.currentStep || CONVERSATION_STATES.GREETING_CLINIC;

  console.log('🤖 Generating REAL AI response for step:', currentStep, 'intent:', intent);

  try {
    // Prepare lead context for AI
    const leadContext = {
      specialty: lead.specialty,
      monthlyPatients: lead.monthlyPatients,
      currentSystem: lead.currentSystem,
      whatsappUsage: lead.whatsappUsage,
      qualificationScore: lead.qualificationScore,
      painPoints: lead.painPoints,
      grade: lead.grade,
      conversationState: currentStep
    };

    // Get conversation history
    const conversationHistory = conversation.messages || [];

    // Generate natural AI response
    const aiResponse = await openaiService.generateNaturalResponse(
      conversationHistory,
      leadContext,
      intent
    );

    if (!aiResponse.success) {
      console.log('⚠️ AI failed, using fallback logic');
      return await handleFallbackResponse(messageText, intent, lead, currentStep);
    }

    // Analyze conversation for next steps
    const sentiment = await openaiService.analyzeConversationSentiment(conversationHistory);
    
    // Determine next step and actions based on AI response and sentiment
    const nextStepAnalysis = await determineNextStep(
      aiResponse.message,
      leadContext,
      sentiment,
      currentStep
    );

    // Update lead score based on conversation progress
    const updatedScore = await updateLeadScore(lead, messageText, intent, sentiment);

    console.log('✅ AI Response generated:', aiResponse.message.substring(0, 50) + '...');
    console.log('📊 Updated score:', updatedScore);
    console.log('📋 Next step:', nextStepAnalysis.nextStep);

    return {
      message: aiResponse.message,
      nextStep: nextStepAnalysis.nextStep,
      leadUpdates: {
        qualificationScore: updatedScore,
        grade: calculateGrade(updatedScore),
        lastIntent: intent,
        ...nextStepAnalysis.leadUpdates
      },
      leadScore: updatedScore,
      shouldSendContent: nextStepAnalysis.shouldSendContent,
      contentToSend: nextStepAnalysis.contentToSend,
      handoffRequired: nextStepAnalysis.handoffRequired,
      aiGenerated: true,
      tokens_used: aiResponse.tokens_used
    };

  } catch (error) {
    console.error('❌ AI Response generation failed:', error);
    return await handleFallbackResponse(messageText, intent, lead, currentStep);
  }
}

/**
 * Determine next step based on AI response and context
 */
async function determineNextStep(aiMessage, leadContext, sentiment, currentStep) {
  const score = leadContext.qualificationScore || 0;
  
  // High engagement + high score = demo interest
  if (sentiment.engagement === 'high' && score >= 60) {
    return {
      nextStep: CONVERSATION_STATES.DEMO_INTEREST,
      shouldSendContent: true,
      contentToSend: 'case_study_medical',
      handoffRequired: score >= 80,
      leadUpdates: { conversationState: CONVERSATION_STATES.DEMO_INTEREST }
    };
  }

  // Compliance concerns detected
  if (sentiment.objections?.includes('legal') || aiMessage.includes('legal') || aiMessage.includes('multa')) {
    return {
      nextStep: CONVERSATION_STATES.RISK_EDUCATION,
      shouldSendContent: true,
      contentToSend: 'compliance_risk_video',
      handoffRequired: false,
      leadUpdates: { conversationState: CONVERSATION_STATES.RISK_EDUCATION }
    };
  }

  // ROI/cost discussions
  if (sentiment.objections?.includes('price') || aiMessage.includes('ahorro') || aiMessage.includes('ROI')) {
    return {
      nextStep: CONVERSATION_STATES.ROI_CALCULATION,
      shouldSendContent: true,
      contentToSend: 'roi_calculator',
      handoffRequired: false,
      leadUpdates: { conversationState: CONVERSATION_STATES.ROI_CALCULATION }
    };
  }

  // Demo request detected
  if (sentiment.buying_intent === 'high' || aiMessage.includes('demo') || aiMessage.includes('ver')) {
    return {
      nextStep: CONVERSATION_STATES.DEMO_INTEREST,
      shouldSendContent: false,
      contentToSend: null,
      handoffRequired: score >= 70,
      leadUpdates: { conversationState: CONVERSATION_STATES.DEMO_INTEREST }
    };
  }

  // Still qualifying
  if (score < 40 && !leadContext.specialty) {
    return {
      nextStep: CONVERSATION_STATES.QUALIFICATION_BASIC,
      shouldSendContent: false,
      contentToSend: null,
      handoffRequired: false,
      leadUpdates: { conversationState: CONVERSATION_STATES.QUALIFICATION_BASIC }
    };
  }

  // Default progression
  return {
    nextStep: getNextLogicalStep(currentStep, score),
    shouldSendContent: false,
    contentToSend: null,
    handoffRequired: false,
    leadUpdates: {}
  };
}

/**
 * Update lead score based on conversation analysis
 */
async function updateLeadScore(lead, messageText, intent, sentiment) {
  let newScore = lead.qualificationScore || 0;
  const text = messageText.toLowerCase();

  // Engagement bonuses
  if (sentiment.engagement === 'high') newScore += 5;
  if (sentiment.buying_intent === 'high') newScore += 10;
  if (sentiment.sentiment === 'positive') newScore += 3;

  // Content analysis bonuses
  if (text.includes('interesa') || text.includes('quiero')) newScore += 8;
  if (text.includes('demo') || text.includes('ver')) newScore += 10;
  if (text.includes('urgente') || text.includes('pronto')) newScore += 5;

  // Professional indicators (generic)
  if (text.includes('doctor') || text.includes('dr.') || text.includes('clínica') || 
      text.includes('empresa') || text.includes('negocio') || text.includes('director')) newScore += 5;
  if ((text.includes('clientes') || text.includes('usuarios') || text.includes('pacientes')) && text.match(/\d+/)) {
    const clientCount = parseInt(text.match(/\d+/)[0]);
    if (clientCount >= 200) newScore += 15;
    else if (clientCount >= 100) newScore += 10;
    else if (clientCount >= 50) newScore += 5;
  }

  // Business sector bonuses
  const premiumSectors = ['dermatología', 'cirugía estética', 'educación', 'capacitación', 'restaurante'];
  if (premiumSectors.some(s => text.includes(s))) newScore += 10;

  // Risk awareness (WhatsApp personal usage)
  if (text.includes('whatsapp personal') || text.includes('celular personal')) newScore += 8;

  return Math.min(newScore, 100); // Cap at 100
}

/**
 * Get next logical step in conversation flow
 */
function getNextLogicalStep(currentStep, score) {
  const flowMap = {
    [CONVERSATION_STATES.GREETING_CLINIC]: CONVERSATION_STATES.QUALIFICATION_BASIC,
    [CONVERSATION_STATES.QUALIFICATION_BASIC]: score >= 40 ? CONVERSATION_STATES.RISK_EDUCATION : CONVERSATION_STATES.QUALIFICATION_BASIC,
    [CONVERSATION_STATES.RISK_EDUCATION]: CONVERSATION_STATES.ROI_CALCULATION,
    [CONVERSATION_STATES.ROI_CALCULATION]: CONVERSATION_STATES.CASE_STUDIES,
    [CONVERSATION_STATES.CASE_STUDIES]: CONVERSATION_STATES.DEMO_INTEREST,
    [CONVERSATION_STATES.DEMO_INTEREST]: CONVERSATION_STATES.SCHEDULING_DEMO,
    [CONVERSATION_STATES.SCHEDULING_DEMO]: CONVERSATION_STATES.HANDOFF_SALES
  };

  return flowMap[currentStep] || CONVERSATION_STATES.QUALIFICATION_BASIC;
}

/**
 * Fallback response when AI fails
 */
async function handleFallbackResponse(messageText, intent, lead, currentStep) {
  console.log('🔄 Using fallback response logic');
  
  // Use the old logic as fallback
  if (currentStep === CONVERSATION_STATES.GREETING_CLINIC) {
    return await handleGreetingClinic(messageText, intent, lead);
  } else if (currentStep === CONVERSATION_STATES.QUALIFICATION_BASIC) {
    return await handleQualificationBasic(messageText, intent, lead);
  }
  
  // Generic fallback
  return {
    message: "Disculpa la demora. Soy Sofia de SafeNotify, especialista en comunicación médica. ¿En qué te puedo ayudar específicamente?",
    nextStep: CONVERSATION_STATES.QUALIFICATION_BASIC,
    leadScore: lead.qualificationScore || 0,
    leadUpdates: {},
    shouldSendContent: false,
    fallback: true
  };
}

/**
 * Handle greeting and initial clinic identification
 */
async function handleGreetingClinic(messageText, intent, lead) {
  const text = messageText.toLowerCase();

  // Check if they mentioned specialty
  const specialtyMention = extractSpecialty(text);
  
  let message = "";
  let nextStep = CONVERSATION_STATES.QUALIFICATION_BASIC;
  let leadUpdates = {};

  if (specialtyMention) {
    leadUpdates.specialty = specialtyMention;
    message = `Excelente, trabajo con muchas clínicas de ${specialtyMention}. ${QUALIFYING_QUESTIONS.PATIENT_VOLUME.question}`;
  } else {
    message = `${SOFIA_PERSONALITY.greeting}`;
  }

  return {
    message,
    nextStep,
    leadUpdates,
    leadScore: lead.qualificationScore
  };
}

/**
 * Handle basic qualification questions
 */
async function handleQualificationBasic(messageText, intent, lead) {
  const text = messageText.toLowerCase();
  let message = "";
  let nextStep = CONVERSATION_STATES.RISK_EDUCATION;
  let leadUpdates = {};
  let newScore = lead.qualificationScore;

  // Extract patient volume
  const patientVolume = extractPatientVolume(text);
  if (patientVolume) {
    leadUpdates.monthlyPatients = patientVolume;
    newScore += calculatePatientVolumeScore(patientVolume);
    
    message = `Perfecto, ${patientVolume} pacientes al mes. ${QUALIFYING_QUESTIONS.CURRENT_SYSTEM.question}`;
    nextStep = CONVERSATION_STATES.RISK_EDUCATION;
  }
  // Extract specialty if not already captured
  else if (!lead.specialty) {
    const specialty = extractSpecialty(text);
    if (specialty) {
      leadUpdates.specialty = specialty;
      newScore += calculateSectorScore(specialty);
      
      message = `${specialty}, excelente sector. ${QUALIFYING_QUESTIONS.VOLUME.question}`;
      nextStep = CONVERSATION_STATES.QUALIFICATION_BASIC; // Stay in qualification
    } else {
      message = "¿Podrías contarme un poco más sobre tu tipo de negocio y cuántos clientes atienden mensualmente?";
    }
  }
  // Extract current system info
  else {
    const usesPersonalWhatsApp = text.includes('whatsapp') || text.includes('personal') || text.includes('celular');
    if (usesPersonalWhatsApp) {
      leadUpdates.whatsappUsage = 'personal';
      leadUpdates.currentSystem = 'whatsapp_personal';
      newScore += 25; // High risk = high score
      
      message = "Entiendo que usan WhatsApp personal. Eso es exactamente lo que me preocupa. ¿Sabían que usar WhatsApp personal para pacientes puede generar multas de hasta $2.000 millones por Habeas Data?";
      nextStep = CONVERSATION_STATES.RISK_EDUCATION;
    } else {
      message = "Entiendo. Muchas clínicas enfrentan desafíos con la comunicación. Déjame contarte sobre los riesgos que muchas clínicas no conocen...";
      nextStep = CONVERSATION_STATES.RISK_EDUCATION;
    }
  }

  // Update lead score
  leadUpdates.qualificationScore = newScore;
  leadUpdates.grade = calculateGrade(newScore);

  return {
    message,
    nextStep,
    leadUpdates,
    leadScore: newScore
  };
}

/**
 * Handle risk education phase
 */
async function handleRiskEducation(messageText, intent, lead) {
  const text = messageText.toLowerCase();

  let message = "";
  let nextStep = CONVERSATION_STATES.ROI_CALCULATION;
  let shouldSendContent = true;
  let contentToSend = 'compliance_risk_video';

  if (text.includes('no sabía') || text.includes('no conocía') || text.includes('multa')) {
    message = "Exacto, la mayoría de clínicas no lo saben. La SIC ha multado clínicas por uso inadecuado de datos. Te voy a enviar un video de 2 minutos que explica estos riesgos. Mientras, ¿cuál dirías que es tu mayor problema: no-shows o confirmaciones tardías?";
  } else if (intent === 'pricing_safenotify') {
    message = "Antes de hablar de inversión, déjame mostrarte el ROI real. Una clínica como la tuya puede ahorrarse $5-15 millones mensuales solo reduciendo no-shows. ¿Cuál es tu tasa actual de no-shows?";
    nextStep = CONVERSATION_STATES.ROI_CALCULATION;
  } else {
    message = "Los riesgos de WhatsApp personal son reales. Pero más allá del compliance, está el ROI. ¿Sabías que cada no-show le cuesta a una clínica entre $150-500K dependiendo la especialidad?";
    nextStep = CONVERSATION_STATES.ROI_CALCULATION;
  }

  return {
    message,
    nextStep,
    shouldSendContent,
    contentToSend,
    leadScore: lead.qualificationScore
  };
}

/**
 * Handle ROI calculation phase
 */
async function handleROICalculation(messageText, intent, lead) {
  const text = messageText.toLowerCase();
  
  let message = "";
  let nextStep = CONVERSATION_STATES.CASE_STUDIES;
  let leadUpdates = {};

  // Extract no-show rate
  const noShowRate = extractNoShowRate(text);
  if (noShowRate) {
    leadUpdates.noShowRate = noShowRate;
    
    const monthlyPatients = lead.monthlyPatients || 100;
    const costPerNoShow = calculateCostPerNoShow(lead.specialty);
    const monthlySavings = Math.round((monthlyPatients * noShowRate / 100) * costPerNoShow / 1000);
    
    message = `Con ${noShowRate}% de no-shows y ${monthlyPatients} pacientes/mes, están perdiendo aprox $${monthlySavings}M mensuales. SafeNotify reduce no-shows hasta 70%. Te voy a mostrar un caso real similar.`;
    
    leadUpdates.estimatedMonthlySavings = monthlySavings;
    nextStep = CONVERSATION_STATES.CASE_STUDIES;
  } else {
    message = "El ROI de SafeNotify es impresionante. Una clínica similar a la tuya se ahorró $12M mensuales. ¿Te gustaría ver el caso de estudio real?";
    nextStep = CONVERSATION_STATES.CASE_STUDIES;
  }

  return {
    message,
    nextStep,
    leadUpdates,
    shouldSendContent: true,
    contentToSend: 'roi_calculator',
    leadScore: lead.qualificationScore
  };
}

/**
 * Handle case studies presentation
 */
async function handleCaseStudies(messageText, intent, lead) {
  let message = "";
  let nextStep = CONVERSATION_STATES.DEMO_INTEREST;
  
  if (intent === 'demo_request') {
    message = "Perfecto! Te voy a agendar una demo personalizada donde verás SafeNotify configurado específicamente para tu especialidad. ¿Prefieres mañana en la mañana o en la tarde?";
    nextStep = CONVERSATION_STATES.SCHEDULING_DEMO;
  } else {
    const specialty = lead.specialty || 'clínicas médicas';
    message = `Increíble, ¿verdad? Tengo más casos de ${specialty} con resultados similares. ¿Te gustaría ver SafeNotify funcionando con datos reales de una clínica como la tuya?`;
    nextStep = CONVERSATION_STATES.DEMO_INTEREST;
  }

  return {
    message,
    nextStep,
    shouldSendContent: true,
    contentToSend: 'case_study_medical',
    leadScore: lead.qualificationScore
  };
}

/**
 * Handle demo interest and scheduling
 */
async function handleDemoInterest(messageText, intent, lead) {
  const text = messageText.toLowerCase();
  
  let message = "";
  let nextStep = CONVERSATION_STATES.SCHEDULING_DEMO;
  let handoffRequired = false;

  if (text.includes('sí') || text.includes('si') || text.includes('demo') || text.includes('ver')) {
    // High-interest prospect
    const newScore = lead.qualificationScore + 20;
    
    if (newScore >= 70) {
      // Auto-schedule demo for high-value leads
      console.log('🎯 High-value lead - Auto-scheduling demo');
      
      try {
        const demoResult = await safenotifyDemoService.scheduleDemo(lead.id, {
          preferredDate: 'tomorrow'
        });
        
        if (demoResult.success) {
          const scheduledDate = new Date(demoResult.scheduledAt);
          const dateStr = scheduledDate.toLocaleDateString('es-CO', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          });
          const timeStr = scheduledDate.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          message = `🎉 ¡Perfecto! Te agendé una demo VIP con ${demoResult.salesRep} para ${dateStr} a las ${timeStr}. Ya te envié todos los detalles por WhatsApp. ¡Nos vemos pronto!`;
          nextStep = CONVERSATION_STATES.HANDOFF_SALES;
          handoffRequired = true;
        } else {
          message = "Excelente! Te voy a conectar directamente con nuestro especialista para coordinar tu demo VIP personalizada.";
          handoffRequired = true;
          nextStep = CONVERSATION_STATES.HANDOFF_SALES;
        }
      } catch (error) {
        console.error('❌ Error auto-scheduling demo:', error);
        message = "Excelente! Te voy a conectar directamente con nuestro especialista para coordinar tu demo VIP personalizada.";
        handoffRequired = true;
        nextStep = CONVERSATION_STATES.HANDOFF_SALES;
      }
    } else {
      message = "¡Perfecto! Te configuro una demo donde verás SafeNotify funcionando con casos reales de tu especialidad. ¿Tienes disponibilidad mañana o pasado mañana?";
      nextStep = CONVERSATION_STATES.SCHEDULING_DEMO;
    }
    
    return {
      message,
      nextStep,
      leadUpdates: { qualificationScore: newScore, grade: calculateGrade(newScore) },
      handoffRequired,
      leadScore: newScore
    };
  } else if (text.includes('mañana') || text.includes('disponibilidad')) {
    // User expressed time preference - try to schedule
    try {
      const demoResult = await safenotifyDemoService.scheduleDemo(lead.id, {
        preferredDate: text.includes('mañana') ? 'tomorrow' : null
      });
      
      if (demoResult.success) {
        const scheduledDate = new Date(demoResult.scheduledAt);
        const dateStr = scheduledDate.toLocaleDateString('es-CO', {
          weekday: 'long',
          month: 'long',  
          day: 'numeric'
        });
        const timeStr = scheduledDate.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        message = `🎉 ¡Listo! Demo agendada para ${dateStr} a las ${timeStr} con ${demoResult.salesRep}. Te llegó la confirmación con todos los detalles. ¿Alguna pregunta?`;
        nextStep = CONVERSATION_STATES.HANDOFF_SALES;
        
        return {
          message,
          nextStep,
          leadUpdates: { 
            qualificationScore: lead.qualificationScore + 15,
            grade: calculateGrade(lead.qualificationScore + 15)
          },
          leadScore: lead.qualificationScore + 15
        };
      } else {
        message = "Perfecto! Déjame coordinar la disponibilidad y te confirmo el horario en unos minutos.";
      }
    } catch (error) {
      console.error('❌ Error scheduling demo:', error);
      message = "Perfecto! Déjame coordinar la disponibilidad y te confirmo el horario en unos minutos.";
    }
  } else if (text.includes('no') || text.includes('después') || text.includes('más tarde')) {
    message = "Entiendo, no hay problema. Te voy a enviar un PDF con el caso de estudio completo para que lo revises cuando tengas tiempo. ¿Te parece si te contacto en 3 días?";
    nextStep = CONVERSATION_STATES.FOLLOW_UP;
  } else {
    message = "SafeNotify transformó su operación. Redujeron 70% los no-shows y eliminaron el riesgo legal. ¿Te gustaría ver cómo funcionaría en tu clínica?";
  }

  return {
    message,
    nextStep,
    leadScore: lead.qualificationScore
  };
}

/**
 * Handle objection handling
 */
async function handleObjectionHandling(messageText, intent, lead) {
  const text = messageText.toLowerCase();
  
  let message = "";
  let nextStep = CONVERSATION_STATES.DEMO_INTEREST;

  // Common objections
  if (text.includes('caro') || text.includes('precio') || text.includes('costoso')) {
    const savings = lead.estimatedMonthlySavings || 8;
    message = `Entiendo la preocupación. SafeNotify cuesta menos de $250K/mes, pero te ahorras $${savings}M+ mensuales solo en no-shows. Es una inversión que se paga sola en 3 días. ¿Te muestro los números exactos?`;
  } else if (text.includes('tiempo') || text.includes('implementar') || text.includes('complicado')) {
    message = "Para nada, el setup toma 5 minutos. Nosotros configuramos todo y capacitamos a tu equipo. En 1 hora ya están enviando recordatorios profesionales. ¿Te gustaría verlo?";
  } else if (text.includes('ya tenemos') || text.includes('sistema actual')) {
    message = "Perfecto que tengan algo. La pregunta es: ¿los protege de multas Habeas Data y reduce no-shows comprobadamente? Comparemos las dos opciones en la demo.";
  } else {
    message = "Entiendo tu punto. Muchas clínicas tenían la misma preocupación. Te propongo ver SafeNotify funcionando 5 minutos, sin compromiso. ¿Te parece?";
  }

  return {
    message,
    nextStep,
    leadScore: lead.qualificationScore
  };
}

// Helper functions
function extractSpecialty(text) {
  const specialties = [
    'dermatología', 'dermatólogo', 'cirugía estética', 'estética', 'ortopedia', 'ortopédico',
    'cardiología', 'cardiólogo', 'neurología', 'neurólogo', 'ginecología', 'ginecólogo',
    'urología', 'urólogo', 'oncología', 'oncólogo', 'pediatría', 'pediatra',
    'medicina interna', 'internista', 'psiquiatría', 'psiquiatra', 'medicina general'
  ];
  
  for (const specialty of specialties) {
    if (text.includes(specialty)) {
      return specialty;
    }
  }
  return null;
}

function extractPersonalInfo(text) {
  const personalInfo = {};
  
  // Extract name patterns
  const namePatterns = [
    /soy\s+([a-záéíóúñ\s]+)/i,
    /me\s+llamo\s+([a-záéíóúñ\s]+)/i,
    /mi\s+nombre\s+es\s+([a-záéíóúñ\s]+)/i,
    /doctor\s+([a-záéíóúñ\s]+)/i,
    /dr\.?\s+([a-záéíóúñ\s]+)/i,
    /dra\.?\s+([a-záéíóúñ\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      personalInfo.name = match[1].trim().split(' ').slice(0, 2).join(' '); // First two words
      break;
    }
  }
  
  // Extract email
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = text.match(emailPattern);
  if (emailMatch) {
    personalInfo.email = emailMatch[1].toLowerCase();
  }
  
  return personalInfo;
}

function extractPatientVolume(text) {
  const numbers = text.match(/\d+/g);
  if (numbers) {
    return parseInt(numbers[0]);
  }
  return null;
}

function extractNoShowRate(text) {
  const percentMatch = text.match(/(\d+)\s*%/);
  if (percentMatch) {
    return parseInt(percentMatch[1]);
  }
  
  // Common expressions
  if (text.includes('muchos') || text.includes('bastantes')) return 25;
  if (text.includes('pocos') || text.includes('casi no')) return 5;
  if (text.includes('normal') || text.includes('regular')) return 15;
  
  return null;
}

function calculatePatientVolumeScore(volume) {
  if (volume >= 200) return 30;
  if (volume >= 100) return 20;
  if (volume >= 50) return 10;
  return 5;
}

function calculateSectorScore(sector) {
  const premium = BUSINESS_SECTOR_SCORING.premium.sectors;
  const standard = BUSINESS_SECTOR_SCORING.standard.sectors;
  
  if (premium.some(s => sector.includes(s))) return 25;
  if (standard.some(s => sector.includes(s))) return 15;
  return 5;
}

function calculateCostPerNoShow(specialty) {
  const premium = ['dermatología', 'cirugía estética', 'ortopedia', 'cardiología'];
  if (premium.some(s => specialty && specialty.includes(s))) return 500; // $500K per no-show
  return 250; // $250K per no-show
}

function calculateGrade(score) {
  if (score >= 70) return 'A'; // Hot lead
  if (score >= 40) return 'B'; // Warm lead
  return 'C'; // Cold lead
}

/**
 * Generate Sofia's response using dynamic AI-generated prompt
 */
/**
 * 🚀 MULTI-AGENT: Generate response with dynamic prompt using specified agent
 */
async function generateAgentResponseWithDynamicPrompt(conversation, messageText, intent, dynamicPrompt, selectedAgent) {
  try {
    const agentName = selectedAgent?.name || 'Sofia';
    console.log(`🤖 Generating ${agentName} response with dynamic prompt...`);
    
    if (!dynamicPrompt || !dynamicPrompt.success) {
      console.log('⚠️ No dynamic prompt available, falling back to static');
      return await generateSofiaResponse(conversation, messageText, intent);
    }

    // Use agent-specific system prompt if available
    let systemPrompt = dynamicPrompt.systemPrompt;
    if (selectedAgent && selectedAgent.systemPrompt && selectedAgent.name !== 'Sofia') {
      // Merge agent's custom prompt with dynamic context
      systemPrompt = `${selectedAgent.systemPrompt}\n\nCONTEXTO DINÁMICO:\n${dynamicPrompt.systemPrompt}`;
      console.log(`📝 Using custom agent prompt for: ${agentName}`);
    }

    // Use OpenAI with the agent-specific prompt
    const aiResponse = await openaiService.generateNaturalResponseWithCustomPrompt(
      conversation.messages || [],
      systemPrompt,
      dynamicPrompt.businessContext,
      intent
    );

    if (!aiResponse.success) {
      console.log('⚠️ AI response failed, activating interactive fallback');
      
      // Check if it's an interactive fallback response
      if (aiResponse.interactive && aiResponse.buttons) {
        return {
          message: aiResponse.message,
          buttons: aiResponse.buttons,
          interactive: true,
          fallback: true,
          nextStep: conversation.currentStep || CONVERSATION_STATES.GREETING_CLINIC,
          leadUpdates: {},
          shouldSendContent: false
        };
      }
      
      return await generateSofiaResponse(conversation, messageText, intent);
    }

    // Analyze next step (keep existing logic)
    const nextStepAnalysis = await determineNextStep(
      aiResponse.message,
      conversation.lead,
      { engagement: 'medium', objections: [] },
      conversation.currentStep
    );

    return {
      message: aiResponse.message,
      nextStep: nextStepAnalysis.nextStep,
      leadUpdates: nextStepAnalysis.leadUpdates || {},
      shouldSendContent: nextStepAnalysis.shouldSendContent || false,
      contentToSend: nextStepAnalysis.contentToSend,
      handoffRequired: nextStepAnalysis.handoffRequired || false,
      aiGenerated: true,
      dynamicPrompt: true,
      agentUsed: agentName,
      tokens_used: aiResponse.tokens_used
    };

  } catch (error) {
    console.error('❌ Dynamic prompt response failed:', error);
    return await generateSofiaResponse(conversation, messageText, intent);
  }
}

// Legacy function - mantener para compatibilidad
async function generateSofiaResponseWithDynamicPrompt(conversation, messageText, intent, dynamicPrompt) {
  return await generateAgentResponseWithDynamicPrompt(conversation, messageText, intent, dynamicPrompt, null);
}

/**
 * 🚀 Sofia AI: Sistema interno de SafeNotify
 * Sofia no es parte del User CRM, es el asistente de ventas interno
 * para vender SafeNotify a prospectos
 */

/**
 * Get Sofia's original system prompt
 */
function getSofiaOriginalPrompt() {
  return `Eres Sofia, especialista en comunicación automatizada y compliance para TODOS los negocios en Colombia 🚀

PERSONALIDAD:
- Consultiva y amigable 😊
- Educativa y profesional
- Enfocada en ROI y compliance
- Empática con challenges de cada negocio
- Usa emojis apropiados (máximo 2 por mensaje)

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
- Termina con pregunta para continuar conversación`;
}

/**
 * Calculate overall lead score for handoff decision
 */
function calculateLeadScore(lead) {
  let score = lead.qualificationScore || 0;
  
  // Add bonus points for high-value indicators
  if (lead.monthlyPatients >= 200) score += 10;
  if (lead.whatsappUsage === 'personal') score += 15; // High pain = high value
  if (lead.specialty && MEDICAL_SPECIALTY_SCORING.premium.specialties.includes(lead.specialty)) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Check if message is a button press from interactive message
 */
function isButtonPress(messageText) {
  // WhatsApp sends button responses as the button ID or title
  const buttonIds = ['about_safenotify', 'templates_methodology', 'plans_pricing', 'contact_advisor', 'demo_request'];
  const buttonTitles = ['🏢 Acerca SafeNotify', '📋 Plantillas', '💰 Planes', '👨‍💼 Contactar', '🖥️ Demo Gratis'];
  
  return buttonIds.includes(messageText.toLowerCase()) || 
         buttonTitles.some(title => messageText.includes(title.split(' ')[1])) ||
         messageText.includes('Acerca') || messageText.includes('Plantillas') || 
         messageText.includes('Planes') || messageText.includes('Contactar') || messageText.includes('Demo');
}

/**
 * Handle button press and send appropriate response
 */
async function handleButtonPress(phoneNumber, messageText, messageSid = null) {
  try {
    console.log('🔘 Handling button press:', messageText);

    // Find or create lead
    const lead = await createOrFindLead(phoneNumber);

    // Determine which button was pressed
    let buttonId = 'default';
    if (messageText.includes('Acerca') || messageText.includes('about_safenotify')) {
      buttonId = 'about_safenotify';
    } else if (messageText.includes('Plantillas') || messageText.includes('templates_methodology')) {
      buttonId = 'templates_methodology';
    } else if (messageText.includes('Planes') || messageText.includes('plans_pricing')) {
      buttonId = 'plans_pricing';
    } else if (messageText.includes('Contactar') || messageText.includes('contact_advisor')) {
      buttonId = 'contact_advisor';
    } else if (messageText.includes('Demo') || messageText.includes('demo_request')) {
      buttonId = 'demo_request';
    }

    // Get appropriate fallback response
    const fallbackResponse = fallbackService.handleButtonPress(buttonId, {
      phone: phoneNumber,
      leadId: lead.id
    });

    // Send interactive message via Twilio
    const twilioResponse = await twilioService.sendInteractiveMessage(
      phoneNumber,
      fallbackResponse.text,
      fallbackResponse.buttons
    );

    console.log('📤 Interactive response sent:', twilioResponse.success ? 'SUCCESS' : 'FAILED');

    // Update conversation history
    const conversation = await findOrCreateConversation(lead.id, phoneNumber);
    
    const newMessages = [
      ...(conversation.messages || []),
      {
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
        messageSid: messageSid,
        buttonPress: true
      },
      {
        role: 'assistant',
        content: fallbackResponse.text,
        timestamp: new Date().toISOString(),
        personality: 'sofia',
        interactive: true,
        buttons: fallbackResponse.buttons
      }
    ];

    await prisma.safeNotifyConversation.update({
      where: { id: conversation.id },
      data: {
        messages: newMessages,
        messageCount: { increment: 2 },
        currentStep: 'interactive_fallback',
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: fallbackResponse.text,
      buttons: fallbackResponse.buttons,
      interactive: true,
      messageSent: twilioResponse.success,
      leadId: lead.id
    };

  } catch (error) {
    console.error('❌ Error handling button press:', error);
    return {
      success: false,
      error: error.message,
      fallback: true
    };
  }
}

/**
 * Update conversation state
 */
async function updateConversationState(conversationId, newState, additionalData = {}) {
  try {
    const updatedConversation = await prisma.safeNotifyConversation.update({
      where: { id: conversationId },
      data: {
        currentStep: newState,
        updatedAt: new Date(),
        ...additionalData
      }
    });

    console.log('✅ Conversation state updated to:', newState);
    return updatedConversation;

  } catch (error) {
    console.error('❌ Error updating conversation state:', error);
    throw error;
  }
}

module.exports = {
  createOrFindLead,
  processProspectMessage,
  updateConversationState,
  calculateLeadScore,
  SOFIA_PERSONALITY,
  CONVERSATION_STATES,
  QUALIFYING_QUESTIONS,
  // 🚀 NEW MULTI-AGENT EXPORTS
  generateAgentResponseWithDynamicPrompt
};