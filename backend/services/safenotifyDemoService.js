const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const prisma = new PrismaClient();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * SafeNotify Demo Service - Automated demo scheduling for Sofia AI
 * Handles demo types, scheduling, calendar integration, and follow-up
 */

// Demo types configuration
const DEMO_TYPES = {
  compliance: {
    name: 'Demo Compliance & Habeas Data',
    duration: 15,
    description: 'Enfoque en riesgos legales y protección datos',
    zoomRoom: 'compliance-demo',
    salesRepType: 'compliance_specialist'
  },
  roi: {
    name: 'Demo ROI & Reducción No-Shows',
    duration: 20,
    description: 'Cálculos de ahorro y optimización clínica',
    zoomRoom: 'roi-demo',
    salesRepType: 'roi_specialist'
  },
  full: {
    name: 'Demo Completa SafeNotify',
    duration: 30,
    description: 'Funcionalidades completas personalizada',
    zoomRoom: 'full-demo',
    salesRepType: 'senior_specialist'
  },
  custom: {
    name: 'Demo Personalizada',
    duration: 30,
    description: 'Demo adaptada a especialidad específica',
    zoomRoom: 'custom-demo',
    salesRepType: 'specialty_expert'
  }
};

// Sales team configuration (in production this would come from database)
const SALES_TEAM = {
  compliance_specialist: {
    name: 'Dr. Ana Martínez',
    email: 'ana.martinez@safenotify.co',
    whatsapp: process.env.COMPLIANCE_SPECIALIST_WHATSAPP,
    expertise: ['compliance', 'legal', 'habeas_data']
  },
  roi_specialist: {
    name: 'Carlos Rivera',
    email: 'carlos.rivera@safenotify.co', 
    whatsapp: process.env.ROI_SPECIALIST_WHATSAPP,
    expertise: ['roi', 'analytics', 'optimization']
  },
  senior_specialist: {
    name: 'Dr. Patricia López',
    email: 'patricia.lopez@safenotify.co',
    whatsapp: process.env.SENIOR_SPECIALIST_WHATSAPP,
    expertise: ['all']
  },
  specialty_expert: {
    name: 'Dr. Miguel González',
    email: 'miguel.gonzalez@safenotify.co',
    whatsapp: process.env.SPECIALTY_EXPERT_WHATSAPP,
    expertise: ['dermatology', 'aesthetic', 'orthopedics']
  }
};

// Available time slots (in production, integrate with calendar API)
const AVAILABLE_SLOTS = {
  today: [],
  tomorrow: ['09:00', '10:30', '14:00', '15:30'],
  dayAfterTomorrow: ['09:00', '10:30', '11:30', '14:00', '15:30', '16:30']
};

/**
 * Schedule demo automatically based on lead qualification
 */
async function scheduleDemo(leadId, preferences = {}) {
  try {
    console.log('📅 Scheduling demo for lead:', leadId);

    const lead = await prisma.safeNotifyLead.findUnique({
      where: { id: leadId },
      include: {
        conversations: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Determine best demo type based on lead profile
    const demoType = determineDemoType(lead);
    console.log('🎯 Recommended demo type:', demoType);

    // Get available slots
    const availableSlots = await getAvailableSlots(demoType, preferences.preferredDate);
    
    if (availableSlots.length === 0) {
      console.log('❌ No available slots found');
      return {
        success: false,
        error: 'No available slots',
        alternatives: await getAlternativeSlots()
      };
    }

    // Auto-select best slot (first available for high-value leads)
    const selectedSlot = availableSlots[0];
    console.log('⏰ Selected slot:', selectedSlot);

    // Assign sales rep
    const salesRep = await assignSalesRep(demoType, lead.specialty);
    console.log('👤 Assigned rep:', salesRep.name);

    // Generate Zoom link
    const zoomMeeting = await generateZoomMeeting(demoType, selectedSlot, lead, salesRep);

    // Create demo appointment in database
    const demoAppointment = await prisma.safeNotifyDemo.create({
      data: {
        leadId: leadId,
        scheduledAt: selectedSlot.datetime,
        duration: DEMO_TYPES[demoType].duration,
        demoType: demoType,
        status: 'scheduled',
        zoomLink: zoomMeeting.joinUrl,
        meetingId: zoomMeeting.meetingId,
        salesRepEmail: salesRep.email,
        notes: `Auto-scheduled for ${lead.specialty || 'medical specialty'} - Score: ${lead.qualificationScore}`
      }
    });

    // Update lead status
    await prisma.safeNotifyLead.update({
      where: { id: leadId },
      data: {
        status: 'demo_scheduled',
        demoScheduledAt: selectedSlot.datetime,
        conversationState: 'scheduling_demo'
      }
    });

    // Send confirmation messages
    await sendDemoConfirmation(lead.phone, demoAppointment, salesRep);

    // Schedule automated reminders
    await scheduleReminders(demoAppointment.id);

    // Notify sales rep
    await notifySalesRep(salesRep, demoAppointment, lead);

    console.log('✅ Demo scheduled successfully:', demoAppointment.id);

    return {
      success: true,
      demoId: demoAppointment.id,
      scheduledAt: selectedSlot.datetime,
      demoType: demoType,
      salesRep: salesRep.name,
      zoomLink: zoomMeeting.joinUrl,
      confirmationSent: true
    };

  } catch (error) {
    console.error('❌ Error scheduling demo:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Determine best demo type based on lead characteristics
 */
function determineDemoType(lead) {
  const score = lead.qualificationScore || 0;
  const specialty = lead.specialty || '';
  const concerns = lead.painPoints || [];

  // High-value leads get full demo
  if (score >= 80) {
    return 'full';
  }

  // Compliance-focused leads
  if (lead.whatsappUsage === 'personal' || concerns.includes('compliance')) {
    return 'compliance';
  }

  // Cost-focused leads
  if (concerns.includes('no-shows') || lead.noShowRate) {
    return 'roi';
  }

  // Specialty-specific demos
  const premiumSpecialties = ['dermatología', 'cirugía estética', 'ortopedia'];
  if (premiumSpecialties.some(s => specialty.includes(s))) {
    return 'custom';
  }

  // Default to ROI demo
  return 'roi';
}

/**
 * Get available demo slots
 */
async function getAvailableSlots(demoType, preferredDate = null) {
  try {
    const duration = DEMO_TYPES[demoType].duration;
    const slots = [];

    // In production, this would integrate with Google Calendar API
    // For now, return mock available slots
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    // Tomorrow slots
    AVAILABLE_SLOTS.tomorrow.forEach(time => {
      const [hours, minutes] = time.split(':');
      const datetime = new Date(tomorrow);
      datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      slots.push({
        datetime: datetime,
        time: time,
        date: tomorrow.toISOString().split('T')[0],
        available: true,
        duration: duration
      });
    });

    // Day after tomorrow slots
    AVAILABLE_SLOTS.dayAfterTomorrow.forEach(time => {
      const [hours, minutes] = time.split(':');
      const datetime = new Date(dayAfter);
      datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      slots.push({
        datetime: datetime,
        time: time,
        date: dayAfter.toISOString().split('T')[0],
        available: true,
        duration: duration
      });
    });

    console.log('📅 Found available slots:', slots.length);
    return slots.slice(0, 5); // Return first 5 slots

  } catch (error) {
    console.error('❌ Error getting available slots:', error);
    return [];
  }
}

/**
 * Get alternative slots when primary options not available
 */
async function getAlternativeSlots() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return [
    {
      datetime: nextWeek,
      time: '09:00',
      date: nextWeek.toISOString().split('T')[0],
      note: 'Próxima semana - Mayor disponibilidad'
    }
  ];
}

/**
 * Assign best sales rep for demo
 */
async function assignSalesRep(demoType, specialty) {
  const requiredRole = DEMO_TYPES[demoType].salesRepType;
  
  // Check if specialist is available for specialty
  if (specialty && demoType === 'custom') {
    const specialties = ['dermatología', 'cirugía estética', 'ortopedia'];
    if (specialties.some(s => specialty.includes(s))) {
      return SALES_TEAM.specialty_expert;
    }
  }

  // Return appropriate specialist
  return SALES_TEAM[requiredRole] || SALES_TEAM.senior_specialist;
}

/**
 * Generate Zoom meeting (mock implementation)
 */
async function generateZoomMeeting(demoType, slot, lead, salesRep) {
  // In production, integrate with Zoom API
  const meetingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const demoConfig = DEMO_TYPES[demoType];
  
  return {
    meetingId: meetingId,
    joinUrl: `https://safenotify.zoom.us/j/${meetingId}`,
    password: '123456',
    hostUrl: `https://safenotify.zoom.us/s/${meetingId}?role=1`,
    topic: `${demoConfig.name} - ${lead.clinicName || 'Clínica Médica'}`,
    duration: demoConfig.duration,
    startTime: slot.datetime.toISOString()
  };
}

/**
 * Send demo confirmation via WhatsApp
 */
async function sendDemoConfirmation(phoneNumber, demoAppointment, salesRep) {
  try {
    const salesNumber = process.env.SOFIA_SALES_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
    const demo = await prisma.safeNotifyDemo.findUnique({
      where: { id: demoAppointment.id },
      include: { lead: true }
    });

    if (!demo) return false;

    const scheduledDate = new Date(demo.scheduledAt);
    const dateStr = scheduledDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = scheduledDate.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const confirmationMessage = `🎉 ¡Demo SafeNotify Confirmada!

📅 **Fecha:** ${dateStr}
⏰ **Hora:** ${timeStr}
👤 **Especialista:** ${salesRep.name}
🎯 **Tipo:** ${DEMO_TYPES[demo.demoType].description}
⏱️ **Duración:** ${demo.duration} minutos

🔗 **Link Zoom:** ${demo.zoomLink}
🆔 **ID Reunión:** ${demo.meetingId}

📋 **Qué verás:**
• SafeNotify configurado para ${demo.lead.specialty || 'tu especialidad'}
• Cálculos reales de ROI para tu clínica  
• Compliance total Habeas Data
• Reducción no-shows comprobada

💡 **Tip:** Ten a mano datos de tu clínica para personalizar la demo.

¿Tienes alguna pregunta antes de la demo?`;

    await client.messages.create({
      from: `whatsapp:${salesNumber}`,
      to: `whatsapp:${phoneNumber}`,
      body: confirmationMessage
    });

    console.log('✅ Demo confirmation sent to:', phoneNumber.substring(0, 8) + '***');
    return true;

  } catch (error) {
    console.error('❌ Error sending demo confirmation:', error);
    return false;
  }
}

/**
 * Schedule automated reminders
 */
async function scheduleReminders(demoId) {
  try {
    // In production, this would use a job queue (Bull, Agenda, etc.)
    console.log('⏰ Reminders scheduled for demo:', demoId);
    
    // TODO: Implement with job queue
    // - 24h reminder with prep materials
    // - 2h reminder with direct zoom link
    // - Post-demo follow-up (2h after scheduled end)
    
    return true;
  } catch (error) {
    console.error('❌ Error scheduling reminders:', error);
    return false;
  }
}

/**
 * Notify assigned sales rep
 */
async function notifySalesRep(salesRep, demoAppointment, lead) {
  try {
    if (!salesRep.whatsapp) return;

    const scheduledDate = new Date(demoAppointment.scheduledAt);
    const dateStr = scheduledDate.toLocaleDateString('es-CO');
    const timeStr = scheduledDate.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const notification = `🎯 NUEVA DEMO ASIGNADA

📋 **Lead:** ${lead.name || 'Prospect médico'}
🏥 **Clínica:** ${lead.clinicName || 'N/A'}  
🩺 **Especialidad:** ${lead.specialty || 'N/A'}
📊 **Score:** ${lead.qualificationScore}/100 (${lead.grade} grade)
📞 **Tel:** ${lead.phone.substring(0, 8)}***

📅 **Demo:** ${dateStr} a las ${timeStr}
🎯 **Tipo:** ${DEMO_TYPES[demoAppointment.demoType].name}
⏱️ **Duración:** ${demoAppointment.duration}min

🔗 **Zoom:** ${demoAppointment.zoomLink}

💡 **Contexto IA:**
${lead.painPoints?.length ? '• Pain points: ' + lead.painPoints.join(', ') : ''}
${lead.currentSystem ? '• Sistema actual: ' + lead.currentSystem : ''}
${lead.monthlyPatients ? '• Pacientes/mes: ' + lead.monthlyPatients : ''}

🤖 Generado por Sofia AI - Lead calificado automáticamente`;

    const salesNumber = process.env.SOFIA_SALES_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
    await client.messages.create({
      from: `whatsapp:${salesNumber}`,
      to: `whatsapp:${salesRep.whatsapp}`,
      body: notification
    });

    console.log('✅ Sales rep notified:', salesRep.name);
    return true;

  } catch (error) {
    console.error('❌ Error notifying sales rep:', error);
    return false;
  }
}

/**
 * Handle demo rescheduling
 */
async function rescheduleDemo(demoId, newSlot, reason = null) {
  try {
    console.log('📅 Rescheduling demo:', demoId);

    const demo = await prisma.safeNotifyDemo.findUnique({
      where: { id: demoId },
      include: { lead: true }
    });

    if (!demo) {
      throw new Error('Demo not found');
    }

    // Update demo appointment
    const updatedDemo = await prisma.safeNotifyDemo.update({
      where: { id: demoId },
      data: {
        scheduledAt: newSlot.datetime,
        notes: `${demo.notes || ''}\nRescheduled: ${reason || 'Cliente request'}`
      }
    });

    // Generate new Zoom meeting
    const salesRep = SALES_TEAM[DEMO_TYPES[demo.demoType].salesRepType];
    const newZoomMeeting = await generateZoomMeeting(demo.demoType, newSlot, demo.lead, salesRep);
    
    await prisma.safeNotifyDemo.update({
      where: { id: demoId },
      data: {
        zoomLink: newZoomMeeting.joinUrl,
        meetingId: newZoomMeeting.meetingId
      }
    });

    // Send updated confirmation
    await sendDemoConfirmation(demo.lead.phone, updatedDemo, salesRep);

    console.log('✅ Demo rescheduled successfully');
    return {
      success: true,
      newDateTime: newSlot.datetime,
      zoomLink: newZoomMeeting.joinUrl
    };

  } catch (error) {
    console.error('❌ Error rescheduling demo:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancel demo appointment
 */
async function cancelDemo(demoId, reason = null) {
  try {
    const demo = await prisma.safeNotifyDemo.update({
      where: { id: demoId },
      data: {
        status: 'cancelled',
        notes: `${demo.notes || ''}\nCancelled: ${reason || 'Unknown reason'}`
      },
      include: { lead: true }
    });

    // Update lead status
    await prisma.safeNotifyLead.update({
      where: { id: demo.leadId },
      data: {
        status: 'lost',
        conversationState: 'demo_cancelled'
      }
    });

    console.log('❌ Demo cancelled:', demoId);
    return { success: true };

  } catch (error) {
    console.error('❌ Error cancelling demo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get demo analytics
 */
async function getDemoAnalytics(dateRange = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const demos = await prisma.safeNotifyDemo.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: { lead: true }
    });

    const analytics = {
      total: demos.length,
      byStatus: {},
      byType: {},
      averageScore: 0,
      showUpRate: 0,
      conversionRate: 0
    };

    demos.forEach(demo => {
      // By status
      analytics.byStatus[demo.status] = (analytics.byStatus[demo.status] || 0) + 1;
      
      // By type  
      analytics.byType[demo.demoType] = (analytics.byType[demo.demoType] || 0) + 1;
    });

    const completedDemos = demos.filter(d => d.status === 'completed');
    const scheduledDemos = demos.filter(d => d.status === 'scheduled');

    analytics.showUpRate = scheduledDemos.length > 0 
      ? Math.round((completedDemos.length / scheduledDemos.length) * 100) 
      : 0;

    analytics.averageScore = demos.length > 0
      ? Math.round(demos.reduce((sum, d) => sum + (d.lead?.qualificationScore || 0), 0) / demos.length)
      : 0;

    return analytics;

  } catch (error) {
    console.error('❌ Error getting demo analytics:', error);
    return null;
  }
}

module.exports = {
  scheduleDemo,
  rescheduleDemo,
  cancelDemo,
  getDemoAnalytics,
  getAvailableSlots,
  DEMO_TYPES,
  SALES_TEAM
};