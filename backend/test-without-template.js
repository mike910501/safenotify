const { PrismaClient } = require('@prisma/client');
const twilioService = require('./config/twilio');
const prisma = new PrismaClient();

async function testWithoutTemplate() {
  console.log('🧪 TESTING MESSAGE WITHOUT CONTENT SID (MANUAL VARIABLES)\n');
  
  try {
    const client = twilioService.client;
    console.log('✅ Twilio client initialized');
    
    // Get the template content but DON'T use contentSid
    const template = await prisma.template.findFirst({
      where: { 
        name: 'vecimiento_codumentos',
        status: 'active' 
      }
    });
    
    if (!template) {
      console.log('❌ Template not found');
      return;
    }
    
    console.log(`📋 Template: ${template.name}`);
    console.log(`📋 Content: ${template.content}`);
    console.log(`📋 Variables: ${JSON.stringify(template.variables)}`);
    
    const testPhone = '+573133592457';
    const realData = {
      empresa: 'ENERVISA',
      nombre: 'Michael Huertas',
      placa_vehiculo: 'MTX08E',
      tipo_documento: 'Licencia de Conducción',
      fecha_vencimiento: '25 de Septiembre 2025',
      dias_restantes: '10',
      link_renovacion: 'https://enervisa.gov.co/renovar'
    };
    
    console.log(`📊 Real data: ${JSON.stringify(realData, null, 2)}`);
    
    // Manual variable replacement (like old system)
    let messageBody = template.content;
    
    // Replace variables manually using VARIABLE NAMES (not numbers)
    template.variables.forEach((varName, index) => {
      const placeholder = `{{${varName}}}`;  // Use variable NAME, not index
      const value = realData[varName] || 'NO_DATA';
      messageBody = messageBody.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      console.log(`   Replacing ${placeholder} with "${value}"`);
    });
    
    console.log(`\n📝 Final message body:`);
    console.log(messageBody);
    
    // Prepare message WITHOUT contentSid
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
      ? process.env.TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
      
    const messagePayload = {
      from: fromNumber,
      to: `whatsapp:${testPhone}`,
      body: messageBody  // Use body instead of contentSid
    };
    
    console.log(`\n📤 Message payload:`, messagePayload);
    
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
    
    console.log(`\n📱 CHECK YOUR WHATSAPP - This should have REAL DATA!`);
    console.log(`Expected data:`);
    console.log(`   🏢 ENERVISA`);
    console.log(`   👤 Michael Huertas`);
    console.log(`   🚗 MTX08E`);
    console.log(`   📄 Licencia de Conducción`);
    console.log(`   📅 25 de Septiembre 2025`);
    console.log(`   ⏰ 10 días`);
    console.log(`   🔗 https://enervisa.gov.co/renovar`);
    
    return { success: true, messageSid: message.sid, body: messageBody };
    
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
  testWithoutTemplate().catch(console.error);
}

module.exports = { testWithoutTemplate };