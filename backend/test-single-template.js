const { PrismaClient } = require('@prisma/client');
const twilioService = require('./config/twilio');
const prisma = new PrismaClient();

async function testSingleTemplate() {
  console.log('🧪 TESTING SINGLE TEMPLATE WITH REAL DATA\n');
  
  try {
    const client = twilioService.client;
    console.log('✅ Twilio client initialized');
    
    // Get the "asignacion de labores" template specifically
    const template = await prisma.template.findFirst({
      where: { 
        name: 'asignacion de labores',
        status: 'active' 
      },
      select: {
        id: true,
        name: true,
        twilioSid: true,
        twilioContentSid: true,
        twilioTemplateId: true,
        variables: true,
        content: true
      }
    });
    
    if (!template) {
      console.log('❌ Template not found');
      return;
    }
    
    console.log(`📋 Testing template: ${template.name}`);
    console.log(`📋 Variables: ${JSON.stringify(template.variables)}`);
    
    const testPhone = '+573133592457';
    const testData = {
      nombre: 'Michael Huertas',
      empresa: 'ENERVISA',
      fecha: '16 de Septiembre 2025',
      direccion: 'Carrera 7 #32-40, Bogotá'
    };
    
    console.log(`📊 Test data:`, testData);
    
    // Determine Content SID
    const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
    console.log(`🔍 Using ContentSID: ${contentSid}`);
    
    // Prepare message payload
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
      ? process.env.TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
      
    const messagePayload = {
      from: fromNumber,
      to: `whatsapp:${testPhone}`,
      contentSid: contentSid
    };
    
    // Map template variables correctly - USING VARIABLE NAMES (FIX APPLIED)
    if (template.variables && template.variables.length > 0) {
      const templateVariables = {};
      
      // FIXED: Error 63028 - Handle duplicate variables correctly  
      const uniqueVariables = [...new Set(template.variables)];
      console.log(`📋 Original variables: [${template.variables.join(', ')}] (${template.variables.length})`);
      console.log(`📋 Unique variables: [${uniqueVariables.join(', ')}] (${uniqueVariables.length})`);
      
      uniqueVariables.forEach((varName) => {
        let value = testData[varName] || `TEST_${varName}`;
        templateVariables[varName] = value; // Use variable NAME as key, not number!
        console.log(`   ${varName}: "${value}"`);
      });
      
      messagePayload.contentVariables = JSON.stringify(templateVariables);
      console.log(`\n📋 Final Template Variables:`, templateVariables);
    }
    
    console.log(`\n📤 Message Payload:`, {
      ...messagePayload,
      contentVariables: messagePayload.contentVariables ? JSON.parse(messagePayload.contentVariables) : 'NONE'
    });
    
    // Send the message
    console.log(`\n🚀 Sending message...`);
    const startTime = Date.now();
    const message = await client.messages.create(messagePayload);
    const endTime = Date.now();
    
    console.log(`\n✅ MESSAGE SENT SUCCESSFULLY!`);
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Send time: ${endTime - startTime}ms`);
    console.log(`   Error code: ${message.errorCode || 'none'}`);
    console.log(`   Error message: ${message.errorMessage || 'none'}`);
    
    console.log(`\n📱 Check your WhatsApp for the message with REAL data!`);
    
    return {
      success: true,
      messageSid: message.sid,
      templateVariables: messagePayload.contentVariables ? JSON.parse(messagePayload.contentVariables) : {}
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Code:', error.code || 'unknown');
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testSingleTemplate().catch(console.error);
}

module.exports = { testSingleTemplate };