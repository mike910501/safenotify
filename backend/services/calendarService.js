const { PrismaClient } = require('@prisma/client');
const { addDays, addHours, format, parse, isWithinInterval, startOfDay, endOfDay } = require('date-fns');
const { es } = require('date-fns/locale');

const prisma = new PrismaClient();

class CalendarService {
  constructor() {
    this.timezone = 'America/Bogota';
  }
  
  // Obtener disponibilidad para un agente
  async getAvailability(agentId, date) {
    try {
      const calendar = await prisma.calendar.findFirst({
        where: { agentId },
        include: {
          availability: true,
          events: {
            where: {
              startTime: {
                gte: startOfDay(date),
                lte: endOfDay(date)
              },
              status: { not: 'cancelled' }
            }
          }
        }
      });
      
      if (!calendar) {
        // Si no existe calendario, crear uno básico
        const agent = await prisma.userAIAgent.findUnique({
          where: { id: agentId },
          include: { user: true }
        });
        
        if (!agent) {
          throw new Error('Agent not found');
        }
        
        const newCalendar = await this.createDefaultCalendar(agent.user.id, agentId);
        return await this.getAvailability(agentId, date);
      }
      
      const dayOfWeek = date.getDay();
      const dayAvailability = calendar.availability.find(a => a.dayOfWeek === dayOfWeek);
      
      if (!dayAvailability || !dayAvailability.isAvailable) {
        return { available: false, slots: [] };
      }
      
      // Generar slots disponibles
      const slots = this.generateTimeSlots(
        dayAvailability.startTime,
        dayAvailability.endTime,
        30, // 30 minutos por slot
        calendar.events,
        date
      );
      
      return { available: true, slots };
    } catch (error) {
      console.error('Error getting availability:', error);
      throw error;
    }
  }
  
  // Crear calendario por defecto
  async createDefaultCalendar(userId, agentId) {
    const calendar = await prisma.calendar.create({
      data: {
        userId,
        agentId,
        name: 'Calendario Principal',
        description: 'Calendario principal para citas y reservas',
        timezone: this.timezone
      }
    });
    
    // Crear disponibilidad por defecto (L-V 9:00-18:00)
    const defaultAvailability = [];
    for (let day = 1; day <= 5; day++) { // Lunes a Viernes
      defaultAvailability.push({
        calendarId: calendar.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isAvailable: true
      });
    }
    
    await prisma.calendarAvailability.createMany({
      data: defaultAvailability
    });
    
    return calendar;
  }
  
  // Agendar cita
  async bookAppointment(agentId, appointmentData) {
    try {
      const {
        date,
        time,
        customerName,
        customerPhone,
        customerEmail,
        description
      } = appointmentData;
      
      const calendar = await prisma.calendar.findFirst({
        where: { agentId }
      });
      
      if (!calendar) {
        throw new Error('Calendar not found');
      }
      
      // Verificar disponibilidad
      const startTime = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
      const endTime = addHours(startTime, 1);
      
      // Verificar conflictos
      const conflicts = await prisma.calendarEvent.findMany({
        where: {
          calendarId: calendar.id,
          status: { not: 'cancelled' },
          OR: [
            {
              startTime: { lte: startTime },
              endTime: { gt: startTime }
            },
            {
              startTime: { lt: endTime },
              endTime: { gte: endTime }
            }
          ]
        }
      });
      
      if (conflicts.length > 0) {
        throw new Error('Time slot not available');
      }
      
      // Crear evento
      const event = await prisma.calendarEvent.create({
        data: {
          calendarId: calendar.id,
          title: `Cita con ${customerName}`,
          description: description || 'Cita agendada por WhatsApp',
          startTime,
          endTime,
          customerName,
          customerPhone,
          customerEmail,
          status: 'scheduled'
        }
      });
      
      return event;
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  }
  
  // Generar slots de tiempo disponibles
  generateTimeSlots(startTime, endTime, durationMinutes, existingEvents, date) {
    const slots = [];
    
    try {
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const endHour = parseInt(endTime.split(':')[0]);
      const endMinute = parseInt(endTime.split(':')[1]);
      
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const slotDateTime = parse(`${format(date, 'yyyy-MM-dd')} ${timeString}`, 'yyyy-MM-dd HH:mm', new Date());
        const slotEndTime = addHours(slotDateTime, 1);
        
        // Verificar si el slot está ocupado
        const isOccupied = existingEvents.some(event => {
          return isWithinInterval(slotDateTime, {
            start: event.startTime,
            end: event.endTime
          });
        });
        
        // Solo mostrar slots futuros
        const now = new Date();
        const isFuture = slotDateTime > now;
        
        if (!isOccupied && isFuture) {
          slots.push({
            time: timeString,
            available: true,
            datetime: slotDateTime
          });
        }
        
        // Incrementar 30 minutos
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentHour += 1;
          currentMinute = 0;
        }
      }
    } catch (error) {
      console.error('Error generating time slots:', error);
    }
    
    return slots;
  }
  
  // Confirmar cita
  async confirmAppointment(eventId) {
    try {
      return await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { 
          confirmed: true,
          status: 'confirmed',
          confirmationSent: true
        }
      });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      throw error;
    }
  }
  
  // Cancelar cita
  async cancelAppointment(eventId) {
    try {
      return await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { status: 'cancelled' }
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
  }
  
  // Obtener próximas citas
  async getUpcomingAppointments(agentId, limit = 5) {
    try {
      const calendar = await prisma.calendar.findFirst({
        where: { agentId }
      });
      
      if (!calendar) return [];
      
      return await prisma.calendarEvent.findMany({
        where: {
          calendarId: calendar.id,
          startTime: { gte: new Date() },
          status: { not: 'cancelled' }
        },
        orderBy: { startTime: 'asc' },
        take: limit
      });
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      return [];
    }
  }
  
  // Obtener eventos del día
  async getTodayEvents(agentId) {
    try {
      const calendar = await prisma.calendar.findFirst({
        where: { agentId }
      });
      
      if (!calendar) return [];
      
      const today = new Date();
      
      return await prisma.calendarEvent.findMany({
        where: {
          calendarId: calendar.id,
          startTime: {
            gte: startOfDay(today),
            lte: endOfDay(today)
          },
          status: { not: 'cancelled' }
        },
        orderBy: { startTime: 'asc' }
      });
    } catch (error) {
      console.error('Error getting today events:', error);
      return [];
    }
  }
  
  // Actualizar disponibilidad
  async updateAvailability(agentId, dayOfWeek, startTime, endTime, isAvailable) {
    try {
      const calendar = await prisma.calendar.findFirst({
        where: { agentId }
      });
      
      if (!calendar) {
        throw new Error('Calendar not found');
      }
      
      return await prisma.calendarAvailability.upsert({
        where: {
          calendarId_dayOfWeek: {
            calendarId: calendar.id,
            dayOfWeek
          }
        },
        create: {
          calendarId: calendar.id,
          dayOfWeek,
          startTime,
          endTime,
          isAvailable
        },
        update: {
          startTime,
          endTime,
          isAvailable
        }
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  }
  
  // Generar reporte de citas
  async getAppointmentReport(agentId, startDate, endDate) {
    try {
      const calendar = await prisma.calendar.findFirst({
        where: { agentId }
      });
      
      if (!calendar) return { total: 0, scheduled: 0, confirmed: 0, cancelled: 0 };
      
      const events = await prisma.calendarEvent.findMany({
        where: {
          calendarId: calendar.id,
          startTime: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      
      const report = {
        total: events.length,
        scheduled: events.filter(e => e.status === 'scheduled').length,
        confirmed: events.filter(e => e.status === 'confirmed').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
        events: events
      };
      
      return report;
    } catch (error) {
      console.error('Error generating appointment report:', error);
      return { total: 0, scheduled: 0, confirmed: 0, cancelled: 0 };
    }
  }
}

module.exports = new CalendarService();