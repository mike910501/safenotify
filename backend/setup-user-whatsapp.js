/**
 * 🔧 SETUP USER WHATSAPP NUMBER
 * 
 * Script para configurar el número WhatsApp de un usuario para el CRM
 * Esto permite que el usuario reciba mensajes y genere conversaciones
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupUserWhatsApp() {
  try {
    console.log('🔧 Configurando número WhatsApp para CRM...');
    
    // 1. Buscar tu usuario (mike)
    const user = await prisma.user.findFirst({
      where: {
        email: 'mikehuertas91@gmail.com' // Usuario admin principal
      }
    });
    
    if (!user) {
      console.error('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    
    // 2. Verificar si ya tienes número configurado
    const existingNumber = await prisma.userWhatsAppNumber.findFirst({
      where: { userId: user.id }
    });
    
    if (existingNumber) {
      console.log('📱 Ya tienes número configurado:', existingNumber.phoneNumber);
      return;
    }
    
    // 3. Configurar tu número de WhatsApp
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';
    
    const userWhatsAppNumber = await prisma.userWhatsAppNumber.create({
      data: {
        userId: user.id,
        phoneNumber: whatsappNumber,
        displayName: 'SafeNotify CRM',
        isActive: true,
        isPrimary: true,
        webhookUrl: 'https://safenotify-backend.onrender.com/api/webhooks/user-crm',
        twilioSid: process.env.TWILIO_ACCOUNT_SID,
        timezone: 'America/Bogota'
      }
    });
    
    console.log('✅ Número WhatsApp configurado:');
    console.log('   Número:', whatsappNumber);
    console.log('   Display:', 'SafeNotify CRM');
    console.log('   Webhook:', 'https://safenotify-backend.onrender.com/api/webhooks/user-crm');
    
    // 4. Crear agente IA por defecto si no existe
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: { userId: user.id, isActive: true }
    });
    
    if (!existingAgent) {
      const defaultAgent = await prisma.userAIAgent.create({
        data: {
          userId: user.id,
          name: 'Asistente Principal',
          description: 'Agente IA principal para el CRM',
          role: 'assistant',
          isActive: true,
          isDefault: true,
          personalityPrompt: 'Eres un asistente virtual amigable y profesional. Ayudas a los clientes con sus consultas de manera eficiente y empática.',
          businessPrompt: 'Trabajas para SafeNotify, una plataforma de notificaciones seguras.',
          objectivesPrompt: 'Tu objetivo es ayudar a los clientes y generar leads de calidad.',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokensPerMessage: 500,
          triggerKeywords: ['hola', 'ayuda', 'información', 'precio'],
          businessRules: {
            workingHours: '9:00-18:00',
            escalateKeywords: ['urgente', 'problema', 'queja'],
            maxConsecutiveMessages: 10
          }
        }
      });
      
      console.log('✅ Agente IA creado:', defaultAgent.name);
    } else {
      console.log('✅ Agente IA ya existe:', existingAgent.name);
    }
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETA');
    console.log('Ahora puedes:');
    console.log('1. Configurar el webhook en Twilio Console');
    console.log('2. Enviar un mensaje de prueba al número WhatsApp');
    console.log('3. Ver la conversación aparecer en el CRM');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupUserWhatsApp();