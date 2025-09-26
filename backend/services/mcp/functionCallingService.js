// Servicio para simular MCP usando Function Calling
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const { addDays, addHours, format, parse } = require('date-fns');
const { es } = require('date-fns/locale');
const calendarService = require('./calendarService');

const prisma = new PrismaClient();

class FunctionCallingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // ✅ Definir funciones que simulan MCP tools usando TOOLS API (formato moderno)
    this.tools = [
      {
        type: 'function',
        function: {
          name: 'send_multimedia',
          description: 'Enviar archivo multimedia por WhatsApp (menú, catálogo, documento, imagen)',
          parameters: {
            type: 'object',
            properties: {
              media_type: {
                type: 'string',
                enum: ['menu', 'catalogue', 'document', 'image', 'price_list', 'location'],
                description: 'Tipo de archivo a enviar'
              },
              message: {
                type: 'string',
                description: 'Mensaje que acompaña al archivo'
              },
              urgency: {
                type: 'string',
                enum: ['low', 'normal', 'high'],
                description: 'Urgencia del envío',
                default: 'normal'
              }
            },
            required: ['media_type']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'save_conversation_data',
          description: 'Guardar información importante de la conversación en base de datos',
          parameters: {
            type: 'object',
            properties: {
              data_type: {
                type: 'string',
                enum: ['order', 'appointment', 'inquiry', 'lead', 'complaint', 'feedback'],
                description: 'Tipo de dato a guardar'
              },
              data: {
                type: 'object',
                description: 'Datos estructurados a guardar',
                properties: {
                  customer_name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  service_type: { type: 'string' },
                  notes: { type: 'string' },
                  value: { type: 'number' },
                  date: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }
                }
              },
              follow_up_required: {
                type: 'boolean',
                description: 'Si requiere seguimiento posterior'
              }
            },
            required: ['data_type', 'data']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'analyze_customer_intent',
          description: 'Analizar la intención del cliente y actualizar su perfil',
          parameters: {
            type: 'object',
            properties: {
              intent: {
                type: 'string',
                enum: ['purchase', 'inquiry', 'complaint', 'support', 'appointment', 'cancel'],
                description: 'Intención detectada del cliente'
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confianza en la detección (0-1)'
              },
              qualification_score: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Score de calificación del lead (0-100)'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags relevantes para el cliente'
              }
            },
            required: ['intent', 'confidence']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'schedule_follow_up',
          description: 'Programar seguimiento automático para el cliente',
          parameters: {
            type: 'object',
            properties: {
              follow_up_type: {
                type: 'string',
                enum: ['reminder', 'check_in', 'offer', 'survey', 'appointment_confirm'],
                description: 'Tipo de seguimiento'
              },
              delay_hours: {
                type: 'number',
                minimum: 1,
                maximum: 720,
                description: 'Horas de delay para el seguimiento'
              },
              message: {
                type: 'string',
                description: 'Mensaje del seguimiento'
              },
              priority: {
                type: 'string',
                enum: ['low', 'normal', 'high'],
                description: 'Prioridad del seguimiento',
                default: 'normal'
              }
            },
            required: ['follow_up_type', 'delay_hours']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_availability',
          description: 'Verificar disponibilidad de citas en el calendario del agente',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                format: 'date',
                description: 'Fecha a consultar (YYYY-MM-DD)'
              },
              days_ahead: {
                type: 'number',
                minimum: 0,
                maximum: 30,
                description: 'Días hacia adelante para verificar (opcional)',
                default: 7
              }
            },
            required: ['date']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'book_appointment',
          description: 'Agendar una nueva cita en el calendario',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                format: 'date',
                description: 'Fecha de la cita (YYYY-MM-DD)'
              },
              time: {
                type: 'string',
                pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
                description: 'Hora de la cita (HH:MM)'
              },
              customer_name: {
                type: 'string',
                description: 'Nombre del cliente'
              },
              customer_phone: {
                type: 'string',
                description: 'Teléfono del cliente'
              },
              customer_email: {
                type: 'string',
                format: 'email',
                description: 'Email del cliente (opcional)'
              },
              description: {
                type: 'string',
                description: 'Descripción o notas de la cita'
              },
              send_confirmation: {
                type: 'boolean',
                description: 'Enviar mensaje de confirmación automático',
                default: true
              }
            },
            required: ['date', 'time', 'customer_name', 'customer_phone']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'send_interactive_message',
          description: 'Enviar mensaje interactivo con botones de acción por WhatsApp',
          parameters: {
            type: 'object',
            properties: {
              message_type: {
                type: 'string',
                enum: ['appointment_confirmation', 'availability_selector', 'service_menu', 'yes_no_question', 'rating_request'],
                description: 'Tipo de mensaje interactivo'
              },
              header_text: {
                type: 'string',
                description: 'Texto del encabezado del mensaje'
              },
              body_text: {
                type: 'string',
                description: 'Texto principal del mensaje'
              },
              footer_text: {
                type: 'string',
                description: 'Texto del pie de página (opcional)'
              },
              buttons: {
                type: 'array',
                maxItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'ID único del botón' },
                    title: { type: 'string', description: 'Texto visible del botón' },
                    action: { type: 'string', description: 'Acción a ejecutar al presionar' }
                  },
                  required: ['id', 'title']
                },
                description: 'Botones de acción (máximo 3)'
              },
              context_data: {
                type: 'object',
                description: 'Datos de contexto para las acciones de los botones'
              }
            },
            required: ['message_type', 'body_text', 'buttons']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_upcoming_appointments',
          description: 'Obtener las próximas citas del cliente o agente',
          parameters: {
            type: 'object',
            properties: {
              scope: {
                type: 'string',
                enum: ['customer', 'agent', 'today'],
                description: 'Alcance de la consulta',
                default: 'customer'
              },
              limit: {
                type: 'number',
                minimum: 1,
                maximum: 10,
                description: 'Número máximo de citas a retornar',
                default: 3
              },
              include_today: {
                type: 'boolean',
                description: 'Incluir citas de hoy',
                default: true
              }
            }
          }
        }
      }
    ];

    console.log('🛠️ FunctionCallingService initialized with', this.tools.length, 'tools');
  }
  
  async generateWithFunctions(messages, context, agentConfig) {
    try {
      console.log('🤖 Generating response with function calling...');
      console.log('📋 Available tools:', this.tools.map(t => t.function.name));
      
      // ✅ Usar TOOLS API (formato moderno) en lugar de functions (legacy)
      const modelName = agentConfig.model || 'gpt-4o-mini'; // Use gpt-4o-mini as default for now
      
      const requestParams = {
        model: modelName,
        messages: messages,
        tools: this.tools,
        tool_choice: 'auto', // El modelo decide si usar herramientas
        temperature: agentConfig.temperature || 0.7,
        max_completion_tokens: agentConfig.maxTokensPerMessage || 500
      };
      
      // ✅ Solo agregar parámetros GPT-5 si realmente se usa un modelo GPT-5
      if (modelName.includes('gpt-5')) {
        if (agentConfig.reasoningEffort) requestParams.reasoning_effort = agentConfig.reasoningEffort;
        if (agentConfig.verbosity) requestParams.verbosity = agentConfig.verbosity;
      }
      
      const response = await this.openai.chat.completions.create(requestParams);
      
      const message = response.choices[0].message;
      console.log('🎯 Model response received, tool_calls:', message.tool_calls?.length || 0);
      
      // Si el modelo quiere llamar herramientas
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log('🔧 Processing tool calls...');
        
        // Agregar la respuesta del asistente a los mensajes
        messages.push(message);
        
        // Ejecutar cada herramienta llamada
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`🚀 Executing tool: ${functionName}`, functionArgs);
          
          try {
            const functionResult = await this.executeFunction(
              functionName, 
              functionArgs, 
              context
            );
            
            // Agregar el resultado al contexto
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            });
            
            console.log(`✅ Tool ${functionName} executed:`, functionResult);
          } catch (error) {
            console.error(`❌ Tool ${functionName} failed:`, error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message, success: false })
            });
          }
        }
        
        // Obtener respuesta final después de ejecutar las herramientas
        const finalResponse = await this.openai.chat.completions.create({
          model: agentConfig.model || 'gpt-5-mini',
          messages: messages,
          max_completion_tokens: agentConfig.maxTokensPerMessage || 500,
          temperature: agentConfig.temperature || 0.7
        });
        
        const finalMessage = finalResponse.choices[0].message.content;
        console.log('✅ Final response with function results generated');
        
        return {
          success: true,
          message: finalMessage,
          toolsUsed: message.tool_calls.map(tc => tc.function.name),
          functionCalls: message.tool_calls.length
        };
      }
      
      // Si no usó herramientas, retornar respuesta normal
      console.log('📝 Normal response (no tools used)');
      return {
        success: true,
        message: message.content,
        toolsUsed: [],
        functionCalls: 0
      };
      
    } catch (error) {
      console.error('❌ Function Calling error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Disculpa, tuve un problema procesando tu solicitud. ¿Puedes intentar de nuevo?'
      };
    }
  }
  
  async executeFunction(name, args, context) {
    switch(name) {
      case 'send_multimedia':
        return await this.sendMultimedia(args, context);
      case 'save_conversation_data':
        return await this.saveConversationData(args, context);
      case 'analyze_customer_intent':
        return await this.analyzeCustomerIntent(args, context);
      case 'schedule_follow_up':
        return await this.scheduleFollowUp(args, context);
      case 'check_availability':
        return await this.checkAvailability(args, context);
      case 'book_appointment':
        return await this.bookAppointment(args, context);
      case 'send_interactive_message':
        return await this.sendInteractiveMessage(args, context);
      case 'get_upcoming_appointments':
        return await this.getUpcomingAppointments(args, context);
      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  }
  
  async sendMultimedia(args, context) {
    try {
      console.log('📎 Sending multimedia:', args.media_type);
      
      // Buscar archivo multimedia en la BD del usuario
      const mediaFile = await prisma.userMediaFile.findFirst({
        where: {
          userId: context.userId,
          mediaType: args.media_type,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!mediaFile) {
        return { 
          success: false, 
          error: `No ${args.media_type} file found for this user`,
          suggestion: 'Upload a file in your dashboard first'
        };
      }
      
      // Enviar por WhatsApp usando Twilio
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      const messageBody = args.message || `Aquí tienes el ${args.media_type} solicitado:`;
      
      const twilioResponse = await twilioClient.messages.create({
        from: `whatsapp:${context.whatsappNumber}`,
        to: `whatsapp:${context.customerPhone}`,
        body: messageBody,
        mediaUrl: [mediaFile.fileUrl]
      });
      
      // Registrar envío en la conversación
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          messages: {
            push: {
              role: 'assistant',
              content: `[MULTIMEDIA SENT: ${args.media_type}] ${messageBody}`,
              timestamp: new Date().toISOString(),
              mediaUrl: mediaFile.fileUrl,
              mediaType: args.media_type,
              messageSid: twilioResponse.sid
            }
          }
        }
      });
      
      return { 
        success: true, 
        sent: true, 
        file: mediaFile.fileName,
        message: messageBody,
        messageSid: twilioResponse.sid
      };
      
    } catch (error) {
      console.error('❌ Error sending multimedia:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  async saveConversationData(args, context) {
    try {
      console.log('💾 Saving conversation data:', args.data_type);
      
      // Crear registro estructurado
      const record = await prisma.conversationRecord.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          recordType: args.data_type,
          data: args.data,
          customerPhone: context.customerPhone,
          followUpRequired: args.follow_up_required || false,
          createdBy: 'ai_agent',
          agentId: context.agentId
        }
      });
      
      // Actualizar el lead con información nueva
      if (args.data.customer_name || args.data.email) {
        await prisma.customerLead.update({
          where: { id: context.customerLeadId },
          data: {
            name: args.data.customer_name || undefined,
            email: args.data.email || undefined,
            notes: args.data.notes ? 
              `${args.data.notes}\n[Auto-saved: ${new Date().toISOString()}]` : undefined
          }
        });
      }
      
      return { 
        success: true, 
        saved: true, 
        recordId: record.id,
        dataType: args.data_type,
        followUpScheduled: args.follow_up_required
      };
      
    } catch (error) {
      console.error('❌ Error saving conversation data:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  async analyzeCustomerIntent(args, context) {
    try {
      console.log('🧠 Analyzing customer intent:', args.intent);
      
      // Actualizar lead con nueva información de intención
      const updatedLead = await prisma.customerLead.update({
        where: { id: context.customerLeadId },
        data: {
          qualificationScore: args.qualification_score || undefined,
          tags: args.tags ? {
            set: [...new Set([...(context.currentTags || []), ...args.tags])]
          } : undefined,
          lastActivity: new Date()
        }
      });
      
      // Actualizar conversación con intención detectada
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          metadata: {
            ...context.conversationMetadata,
            lastIntent: args.intent,
            intentConfidence: args.confidence,
            qualificationScore: args.qualification_score,
            aiAnalysisTimestamp: new Date().toISOString()
          }
        }
      });
      
      return {
        success: true,
        analyzed: true,
        intent: args.intent,
        confidence: args.confidence,
        scoreUpdated: args.qualification_score !== undefined,
        tagsAdded: args.tags?.length || 0
      };
      
    } catch (error) {
      console.error('❌ Error analyzing customer intent:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  async scheduleFollowUp(args, context) {
    try {
      console.log('⏰ Scheduling follow-up:', args.follow_up_type);
      
      const followUpDate = new Date();
      followUpDate.setHours(followUpDate.getHours() + args.delay_hours);
      
      // Crear tarea de seguimiento
      const followUp = await prisma.followUpTask.create({
        data: {
          conversationId: context.conversationId,
          userId: context.userId,
          customerLeadId: context.customerLeadId,
          taskType: args.follow_up_type,
          scheduledAt: followUpDate,
          message: args.message || `Seguimiento automático: ${args.follow_up_type}`,
          priority: args.priority || 'normal',
          status: 'PENDING',
          createdBy: 'ai_agent',
          agentId: context.agentId
        }
      });
      
      return {
        success: true,
        scheduled: true,
        followUpId: followUp.id,
        scheduledFor: followUpDate.toISOString(),
        type: args.follow_up_type,
        delayHours: args.delay_hours
      };
      
    } catch (error) {
      console.error('❌ Error scheduling follow-up:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Nuevas funciones MCP para calendario e interactividad
  async checkAvailability(args, context) {
    try {
      console.log('📅 Checking availability for date:', args.date);
      
      const targetDate = new Date(args.date);
      const availability = await calendarService.getAvailability(context.agentId, targetDate);
      
      // Si se pidió verificar varios días adelante
      if (args.days_ahead && args.days_ahead > 0) {
        const multiDayAvailability = [];
        
        for (let i = 0; i <= args.days_ahead; i++) {
          const checkDate = addDays(targetDate, i);
          const dayAvailability = await calendarService.getAvailability(context.agentId, checkDate);
          
          multiDayAvailability.push({
            date: format(checkDate, 'yyyy-MM-dd'),
            dayName: format(checkDate, 'EEEE', { locale: es }),
            available: dayAvailability.available,
            slots: dayAvailability.slots.slice(0, 5) // Primeros 5 slots disponibles
          });
        }
        
        return {
          success: true,
          multiDay: true,
          availability: multiDayAvailability,
          totalDaysChecked: args.days_ahead + 1
        };
      }
      
      return {
        success: true,
        date: args.date,
        available: availability.available,
        slots: availability.slots,
        totalSlots: availability.slots.length
      };
      
    } catch (error) {
      console.error('❌ Error checking availability:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async bookAppointment(args, context) {
    try {
      console.log('📅 Booking appointment for:', args.customer_name);
      
      const appointmentData = {
        date: args.date,
        time: args.time,
        customerName: args.customer_name,
        customerPhone: args.customer_phone,
        customerEmail: args.customer_email,
        description: args.description || 'Cita agendada vía WhatsApp'
      };
      
      const appointment = await calendarService.bookAppointment(context.agentId, appointmentData);
      
      // Guardar en conversación
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          metadata: {
            ...context.conversationMetadata,
            lastAppointment: {
              id: appointment.id,
              date: args.date,
              time: args.time,
              status: appointment.status,
              bookedAt: new Date().toISOString()
            }
          }
        }
      });
      
      // Enviar confirmación automática si se solicita
      if (args.send_confirmation) {
        await this.sendAppointmentConfirmation(appointment, context);
      }
      
      return {
        success: true,
        booked: true,
        appointmentId: appointment.id,
        date: args.date,
        time: args.time,
        customer: args.customer_name,
        confirmationSent: args.send_confirmation
      };
      
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      return {
        success: false,
        error: error.message,
        suggestion: 'Please check availability first or try a different time slot'
      };
    }
  }
  
  async sendInteractiveMessage(args, context) {
    try {
      console.log('🔘 Sending interactive message:', args.message_type);
      
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      // Preparar botones para Twilio
      const buttons = args.buttons.slice(0, 3).map((btn, index) => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.substring(0, 20) // Límite de Twilio
        }
      }));
      
      // Construir mensaje interactivo
      const interactiveMessage = {
        messaging_service_sid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        from: `whatsapp:${context.whatsappNumber}`,
        to: `whatsapp:${context.customerPhone}`,
        contentSid: process.env.TEMPLATE_INTERACTIVE_MESSAGE,
        contentVariables: JSON.stringify({
          1: args.header_text || '',
          2: args.body_text,
          3: args.footer_text || ''
        }),
        // Para mensajes con botones, usar estructura de botones
        body: args.body_text
      };
      
      // Si no tenemos template, usar mensaje simple con botones en texto
      if (!process.env.TEMPLATE_INTERACTIVE_MESSAGE) {
        let messageBody = args.body_text;
        
        // Agregar botones como texto numerado
        if (buttons.length > 0) {
          messageBody += '\n\n';
          buttons.forEach((btn, index) => {
            messageBody += `${index + 1}. ${btn.reply.title}\n`;
          });
          messageBody += '\nResponde con el número de tu opción.';
        }
        
        interactiveMessage.body = messageBody;
        delete interactiveMessage.contentSid;
        delete interactiveMessage.contentVariables;
      }
      
      const twilioResponse = await twilioClient.messages.create(interactiveMessage);
      
      // Guardar mensaje en conversación con contexto de botones
      await prisma.cRMConversation.update({
        where: { id: context.conversationId },
        data: {
          messages: {
            push: {
              role: 'assistant',
              content: `[INTERACTIVE MESSAGE: ${args.message_type}] ${args.body_text}`,
              timestamp: new Date().toISOString(),
              messageType: 'interactive',
              buttons: args.buttons,
              contextData: args.context_data,
              messageSid: twilioResponse.sid
            }
          }
        }
      });
      
      return {
        success: true,
        sent: true,
        messageType: args.message_type,
        buttonsCount: buttons.length,
        messageSid: twilioResponse.sid,
        interactive: true
      };
      
    } catch (error) {
      console.error('❌ Error sending interactive message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUpcomingAppointments(args, context) {
    try {
      console.log('📋 Getting upcoming appointments, scope:', args.scope);
      
      let appointments = [];
      
      if (args.scope === 'today') {
        appointments = await calendarService.getTodayEvents(context.agentId);
      } else if (args.scope === 'agent') {
        appointments = await calendarService.getUpcomingAppointments(context.agentId, args.limit);
      } else {
        // Para scope 'customer' - buscar citas del cliente actual
        const calendar = await prisma.calendar.findFirst({
          where: { agentId: context.agentId }
        });
        
        if (calendar) {
          appointments = await prisma.calendarEvent.findMany({
            where: {
              calendarId: calendar.id,
              customerPhone: context.customerPhone,
              startTime: { gte: new Date() },
              status: { not: 'cancelled' }
            },
            orderBy: { startTime: 'asc' },
            take: args.limit || 3
          });
        }
      }
      
      const formattedAppointments = appointments.map(apt => ({
        id: apt.id,
        title: apt.title,
        date: format(new Date(apt.startTime), 'yyyy-MM-dd'),
        time: format(new Date(apt.startTime), 'HH:mm'),
        dayName: format(new Date(apt.startTime), 'EEEE', { locale: es }),
        customerName: apt.customerName,
        status: apt.status,
        description: apt.description
      }));
      
      return {
        success: true,
        scope: args.scope,
        appointments: formattedAppointments,
        count: formattedAppointments.length,
        includesToday: args.include_today
      };
      
    } catch (error) {
      console.error('❌ Error getting upcoming appointments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async sendAppointmentConfirmation(appointment, context) {
    try {
      const confirmationMessage = `✅ *Cita Confirmada*\n\n` +
        `📅 **Fecha:** ${format(new Date(appointment.startTime), 'EEEE, dd MMMM yyyy', { locale: es })}\n` +
        `⏰ **Hora:** ${format(new Date(appointment.startTime), 'HH:mm')}\n` +
        `👤 **Cliente:** ${appointment.customerName}\n` +
        `📝 **Descripción:** ${appointment.description}\n\n` +
        `*ID de Cita:* ${appointment.id}\n\n` +
        `Para cancelar o reprogramar, responde con "cancelar cita" o "reprogramar cita".`;
        
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      await twilioClient.messages.create({
        from: `whatsapp:${context.whatsappNumber}`,
        to: `whatsapp:${context.customerPhone}`,
        body: confirmationMessage
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending confirmation:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FunctionCallingService();