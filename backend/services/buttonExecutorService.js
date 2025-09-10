// Servicio para ejecutar acciones de botones interactivos
const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const calendarService = require('./calendarService');
const { format, addDays, parse } = require('date-fns');
const { es } = require('date-fns/locale');

const prisma = new PrismaClient();

class ButtonExecutorService {
  constructor() {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    console.log('🎯 ButtonExecutorService initialized');
  }
  
  // Método principal para ejecutar acciones de botones
  async executeButtonAction(buttonId, buttonData, context) {
    try {
      console.log(`🎯 Executing button action: ${buttonId}`);
      
      // Determinar el tipo de acción basado en el ID del botón
      const actionType = this.determineActionType(buttonId);
      
      switch (actionType) {
        case 'confirm_appointment':
          return await this.confirmAppointment(buttonData, context);
        case 'reschedule_appointment':
          return await this.rescheduleAppointment(buttonData, context);
        case 'cancel_appointment':
          return await this.cancelAppointment(buttonData, context);
        case 'show_availability':
          return await this.showAvailability(buttonData, context);
        case 'book_time_slot':
          return await this.bookTimeSlot(buttonData, context);
        case 'request_service':
          return await this.requestService(buttonData, context);
        case 'rate_service':
          return await this.rateService(buttonData, context);
        case 'get_support':
          return await this.getSupport(buttonData, context);
        case 'view_menu':
          return await this.viewMenu(buttonData, context);
        case 'contact_human':
          return await this.contactHuman(buttonData, context);
        default:
          return await this.handleGenericAction(buttonId, buttonData, context);
      }
    } catch (error) {
      console.error('❌ Button action execution failed:', error);
      return {
        success: false,
        error: error.message,
        response: 'Disculpa, hubo un problema procesando tu selección. ¿Puedes intentar de nuevo?'
      };
    }
  }
  
  determineActionType(buttonId) {
    // Determinar tipo de acción basado en patrones del ID
    if (buttonId.includes('confirm_apt')) return 'confirm_appointment';
    if (buttonId.includes('reschedule_apt')) return 'reschedule_appointment';
    if (buttonId.includes('cancel_apt')) return 'cancel_appointment';
    if (buttonId.includes('show_availability')) return 'show_availability';
    if (buttonId.includes('book_slot')) return 'book_time_slot';
    if (buttonId.includes('service_')) return 'request_service';
    if (buttonId.includes('rate_')) return 'rate_service';
    if (buttonId.includes('support')) return 'get_support';
    if (buttonId.includes('menu')) return 'view_menu';
    if (buttonId.includes('human')) return 'contact_human';
    
    return 'generic';
  }
  
  async confirmAppointment(buttonData, context) {
    try {
      const appointmentId = buttonData.appointmentId || context.metadata?.lastAppointment?.id;
      
      if (!appointmentId) {
        return {
          success: false,
          response: 'No pude encontrar la cita para confirmar. ¿Puedes proporcionar más detalles?'
        };
      }
      
      const confirmedAppointment = await calendarService.confirmAppointment(appointmentId);
      
      // Actualizar conversación
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          metadata: {
            ...context.metadata,
            lastAction: 'appointment_confirmed',
            lastActionTime: new Date().toISOString()
          }
        }
      });
      
      const responseMessage = `✅ *Cita Confirmada*\n\n` +
        `Tu cita ha sido confirmada exitosamente:\n` +
        `📅 ${format(new Date(confirmedAppointment.startTime), 'EEEE, dd MMMM yyyy', { locale: es })}\n` +
        `🕐 ${format(new Date(confirmedAppointment.startTime), 'HH:mm')}\n\n` +
        `Recibirás un recordatorio 24 horas antes. ¡Nos vemos pronto! 😊`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'appointment_confirmed',
        appointmentId: confirmedAppointment.id
      };
    } catch (error) {
      return {
        success: false,
        response: 'Hubo un problema confirmando tu cita. Por favor contacta con nosotros directamente.',
        error: error.message
      };
    }
  }
  
  async rescheduleAppointment(buttonData, context) {
    try {
      // Mostrar disponibilidad para los próximos días
      const availability = await this.getNextAvailableSlots(context.agentId, 7);
      
      if (availability.length === 0) {
        return {
          success: true,
          response: 'No hay horarios disponibles en los próximos días. Te contactaremos pronto para coordinar una nueva fecha.',
          action: 'reschedule_no_availability'
        };
      }
      
      // Crear mensaje con opciones de reprogramación
      let responseMessage = `🔄 *Reprogramar Cita*\n\nHorarios disponibles:\n\n`;
      
      availability.slice(0, 5).forEach((slot, index) => {
        responseMessage += `${index + 1}. ${slot.dayName}, ${slot.date} - ${slot.time}\n`;
      });
      
      responseMessage += `\nResponde con el número de tu opción preferida o escribe "más opciones" para ver más horarios.`;
      
      // Actualizar contexto con opciones de reprogramación
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          metadata: {
            ...context.metadata,
            lastAction: 'reschedule_options_shown',
            rescheduleOptions: availability,
            originalAppointment: buttonData.appointmentId
          }
        }
      });
      
      return {
        success: true,
        response: responseMessage,
        action: 'reschedule_options_shown'
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude obtener los horarios disponibles. Contacta con nosotros para reprogramar.',
        error: error.message
      };
    }
  }
  
  async cancelAppointment(buttonData, context) {
    try {
      const appointmentId = buttonData.appointmentId || context.metadata?.lastAppointment?.id;
      
      if (!appointmentId) {
        return {
          success: false,
          response: 'No encontré la cita para cancelar. ¿Puedes proporcionar más información?'
        };
      }
      
      await calendarService.cancelAppointment(appointmentId);
      
      // Actualizar conversación
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          metadata: {
            ...context.metadata,
            lastAction: 'appointment_cancelled',
            lastActionTime: new Date().toISOString()
          }
        }
      });
      
      const responseMessage = `❌ *Cita Cancelada*\n\n` +
        `Tu cita ha sido cancelada exitosamente.\n\n` +
        `Si deseas agendar una nueva cita en el futuro, solo escríbenos. ` +
        `Estamos aquí para ayudarte cuando lo necesites. 😊`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'appointment_cancelled'
      };
    } catch (error) {
      return {
        success: false,
        response: 'Hubo un problema cancelando tu cita. Contacta con nosotros directamente.',
        error: error.message
      };
    }
  }
  
  async showAvailability(buttonData, context) {
    try {
      const daysAhead = buttonData.days || 7;
      const today = new Date();
      
      let availabilityMessage = `📅 *Horarios Disponibles*\n\n`;
      let hasAvailability = false;
      
      for (let i = 0; i < daysAhead; i++) {
        const checkDate = addDays(today, i);
        const availability = await calendarService.getAvailability(context.agentId, checkDate);
        
        if (availability.available && availability.slots.length > 0) {
          hasAvailability = true;
          const dayName = format(checkDate, 'EEEE', { locale: es });
          const dateStr = format(checkDate, 'dd/MM');
          
          availabilityMessage += `*${dayName} ${dateStr}:*\n`;
          availability.slots.slice(0, 4).forEach(slot => {
            availabilityMessage += `• ${slot.time}\n`;
          });
          availabilityMessage += `\n`;
        }
      }
      
      if (!hasAvailability) {
        availabilityMessage = `📅 *Sin Disponibilidad*\n\n` +
          `No hay horarios disponibles en los próximos ${daysAhead} días.\n` +
          `Te contactaremos pronto para coordinar una cita.`;
      } else {
        availabilityMessage += `Para agendar, responde con:\n"Agendar [día] [hora]"\n\nEjemplo: "Agendar lunes 10:00"`;
      }
      
      return {
        success: true,
        response: availabilityMessage,
        action: 'availability_shown',
        hasAvailability
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude obtener la información de horarios disponibles.',
        error: error.message
      };
    }
  }
  
  async bookTimeSlot(buttonData, context) {
    try {
      const { date, time, slotId } = buttonData;
      
      if (!date || !time) {
        return {
          success: false,
          response: 'Información de horario incompleta. ¿Puedes especificar fecha y hora?'
        };
      }
      
      // Obtener información del cliente desde el contexto
      const customerData = await this.getCustomerData(context);
      
      const appointmentData = {
        date,
        time,
        customerName: customerData.name || 'Cliente WhatsApp',
        customerPhone: context.customerPhone,
        customerEmail: customerData.email,
        description: 'Cita agendada mediante botones interactivos'
      };
      
      const appointment = await calendarService.bookAppointment(context.agentId, appointmentData);
      
      const responseMessage = `✅ *Cita Agendada*\n\n` +
        `Tu cita ha sido agendada exitosamente:\n` +
        `📅 ${format(new Date(appointment.startTime), 'EEEE, dd MMMM yyyy', { locale: es })}\n` +
        `🕐 ${format(new Date(appointment.startTime), 'HH:mm')}\n` +
        `👤 ${appointment.customerName}\n\n` +
        `*ID de Cita:* ${appointment.id}\n\n` +
        `Recibirás una confirmación y recordatorio. ¡Nos vemos pronto! 😊`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'time_slot_booked',
        appointmentId: appointment.id
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude agendar la cita en ese horario. Quizás ya esté ocupado. ¿Podrías elegir otro horario?',
        error: error.message
      };
    }
  }
  
  async requestService(buttonData, context) {
    const { serviceType, serviceName } = buttonData;
    
    try {
      // Guardar solicitud de servicio
      await prisma.conversationRecord.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          recordType: 'service_request',
          data: {
            serviceType,
            serviceName,
            requestedAt: new Date().toISOString(),
            source: 'interactive_button'
          },
          customerPhone: context.customerPhone,
          followUpRequired: true,
          createdBy: 'button_action',
          agentId: context.agentId
        }
      });
      
      const responseMessage = `✅ *Solicitud de Servicio Recibida*\n\n` +
        `Hemos registrado tu interés en: *${serviceName}*\n\n` +
        `Un miembro de nuestro equipo te contactará pronto con más información y para coordinar los detalles.\n\n` +
        `¿Hay algo específico que te gustaría saber sobre este servicio?`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'service_requested',
        serviceType
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude procesar tu solicitud de servicio. Contacta con nosotros directamente.',
        error: error.message
      };
    }
  }
  
  async rateService(buttonData, context) {
    const { rating, feedback } = buttonData;
    
    try {
      // Guardar calificación
      await prisma.conversationRecord.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          recordType: 'feedback',
          data: {
            rating: parseInt(rating),
            feedback: feedback || '',
            submittedAt: new Date().toISOString(),
            source: 'interactive_button'
          },
          customerPhone: context.customerPhone,
          followUpRequired: parseInt(rating) < 4, // Follow up si rating < 4
          createdBy: 'button_action',
          agentId: context.agentId
        }
      });
      
      const responseMessage = parseInt(rating) >= 4 
        ? `⭐ *¡Gracias por tu calificación!*\n\nNos alegra saber que tuviste una buena experiencia. Tu opinión es muy valiosa para nosotros. 😊`
        : `⭐ *Gracias por tu feedback*\n\nLamentamos que tu experiencia no haya sido la esperada. Nos pondremos en contacto contigo para mejorar nuestro servicio. 🙏`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'service_rated',
        rating: parseInt(rating)
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude registrar tu calificación. Gracias por tu feedback de todas formas.',
        error: error.message
      };
    }
  }
  
  async getSupport(buttonData, context) {
    const { issueType } = buttonData;
    
    try {
      // Crear ticket de soporte
      const supportTicket = await prisma.conversationRecord.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          recordType: 'support',
          data: {
            issueType: issueType || 'general',
            createdAt: new Date().toISOString(),
            status: 'pending',
            priority: 'normal'
          },
          customerPhone: context.customerPhone,
          followUpRequired: true,
          createdBy: 'button_action',
          agentId: context.agentId
        }
      });
      
      const responseMessage = `🆘 *Solicitud de Soporte*\n\n` +
        `Hemos creado un ticket de soporte para ti.\n` +
        `*Ticket ID:* ${supportTicket.id.slice(-8)}\n\n` +
        `Un agente te contactará pronto para ayudarte con tu consulta.\n\n` +
        `Mientras tanto, ¿puedes describir brevemente el problema?`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'support_requested',
        ticketId: supportTicket.id
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude crear tu solicitud de soporte. Contacta con nosotros directamente para recibir ayuda.',
        error: error.message
      };
    }
  }
  
  async viewMenu(buttonData, context) {
    try {
      // Buscar menú/catálogo activo del usuario
      const menuFile = await prisma.userMediaFile.findFirst({
        where: {
          userId: context.userId,
          mediaType: { in: ['menu', 'catalogue', 'price_list'] },
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!menuFile) {
        return {
          success: true,
          response: `📋 *Menú/Catálogo*\n\nCurrentemente estamos actualizando nuestro menú. Para información sobre productos y servicios, contacta con nosotros directamente.`,
          action: 'menu_not_available'
        };
      }
      
      // Enviar archivo del menú
      await this.twilioClient.messages.create({
        from: `whatsapp:${context.whatsappNumber}`,
        to: `whatsapp:${context.customerPhone}`,
        body: '📋 Aquí tienes nuestro menú/catálogo actualizado:',
        mediaUrl: [menuFile.fileUrl]
      });
      
      return {
        success: true,
        response: null, // Ya enviado por Twilio
        action: 'menu_sent',
        menuType: menuFile.mediaType
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude enviar el menú en este momento. Contacta con nosotros para más información.',
        error: error.message
      };
    }
  }
  
  async contactHuman(buttonData, context) {
    try {
      // Marcar conversación para transferencia humana
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          metadata: {
            ...context.metadata,
            humanTransferRequested: true,
            humanTransferAt: new Date().toISOString(),
            lastAction: 'human_contact_requested'
          }
        }
      });
      
      // Crear tarea para el equipo humano
      await prisma.followUpTask.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          taskType: 'human_contact',
          scheduledAt: new Date(), // Inmediato
          message: 'Cliente solicita contacto humano desde botón interactivo',
          priority: 'high',
          status: 'PENDING',
          createdBy: 'button_action',
          agentId: context.agentId
        }
      });
      
      const responseMessage = `👤 *Conectando con Agente Humano*\n\n` +
        `Hemos registrado tu solicitud para hablar con un miembro de nuestro equipo.\n\n` +
        `Un agente se pondrá en contacto contigo muy pronto. Mientras tanto, puedes seguir escribiendo si tienes alguna pregunta específica.\n\n` +
        `Gracias por tu paciencia. 😊`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'human_contact_requested'
      };
    } catch (error) {
      return {
        success: false,
        response: 'No pude procesar tu solicitud para hablar con un agente. Contacta con nosotros directamente.',
        error: error.message
      };
    }
  }
  
  async handleGenericAction(buttonId, buttonData, context) {
    try {
      // Log de acción genérica para análisis
      await prisma.conversationRecord.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          recordType: 'button_action',
          data: {
            buttonId,
            buttonData,
            timestamp: new Date().toISOString()
          },
          customerPhone: context.customerPhone,
          followUpRequired: false,
          createdBy: 'button_action',
          agentId: context.agentId
        }
      });
      
      const responseMessage = `✅ *Acción Registrada*\n\n` +
        `He registrado tu selección. ¿En qué más puedo ayudarte?`;
      
      return {
        success: true,
        response: responseMessage,
        action: 'generic_action',
        buttonId
      };
    } catch (error) {
      return {
        success: false,
        response: 'Procesé tu selección. ¿En qué más puedo ayudarte?',
        error: error.message
      };
    }
  }
  
  // Métodos auxiliares
  async getNextAvailableSlots(agentId, days = 7) {
    const slots = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const checkDate = addDays(today, i);
      const availability = await calendarService.getAvailability(agentId, checkDate);
      
      if (availability.available && availability.slots.length > 0) {
        availability.slots.forEach(slot => {
          slots.push({
            date: format(checkDate, 'yyyy-MM-dd'),
            dayName: format(checkDate, 'EEEE', { locale: es }),
            time: slot.time,
            datetime: slot.datetime
          });
        });
      }
    }
    
    return slots.slice(0, 10); // Máximo 10 slots
  }
  
  async getCustomerData(context) {
    try {
      const lead = await prisma.customerLead.findUnique({
        where: { id: context.customerLeadId }
      });
      
      return {
        name: lead?.name,
        email: lead?.email,
        phone: context.customerPhone
      };
    } catch (error) {
      return {
        name: null,
        email: null,
        phone: context.customerPhone
      };
    }
  }
}

module.exports = new ButtonExecutorService();