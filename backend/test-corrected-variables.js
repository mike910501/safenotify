const { PrismaClient } = require('@prisma/client');
const twilioService = require('./config/twilio');
const prisma = new PrismaClient();

async function testCorrectedVariables() {
  console.log('🧪 TESTING WITH CORRECTED VARIABLE FORMAT (NAMES INSTEAD OF NUMBERS)\n');
  
  try {
    const client = twilioService.client;
    console.log('✅ Twilio client initialized');
    
    // Get template
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
    console.log(`📋 Variables: ${JSON.stringify(template.variables)}`);
    
    const testPhone = '+573133592457';
    
    // Simulate contact and defaults
    const contact = {
      nombre: 'Michael Huertas',
      telefono: '+573133592457'
    };
    
    const defaultValues = {
      dias_restantes: '10',
      empresa: 'ENERVISA',
      fecha_vencimiento: '25 de Septiembre 2025',
      link_renovacion: 'https://enervisa.gov.co/renovar',
      placa_vehiculo: 'MTX08E',
      tipo_documento: 'Licencia de Conducción'
    };
    
    // Create variables using VARIABLE NAMES as keys (like the corrected code)
    const templateVariables = {};
    
    template.variables.forEach((varName) => {
      let value = '';
      
      if (defaultValues[varName]) {
        value = defaultValues[varName];
        console.log(`📋 ${varName} -> default value = '${value}'`);
      } else {
        value = contact[varName] || '';
        console.log(`📋 ${varName} -> direct CSV = '${value}'`);
      }
      
      // THIS IS THE KEY FIX: Use variable NAME as key, not number
      templateVariables[varName] = value;
    });
    
    console.log(`\n✅ Template variables (CORRECTED FORMAT):`);
    console.log(JSON.stringify(templateVariables, null, 2));
    
    // Compare old vs new format
    console.log(`\n🔍 FORMAT COMPARISON:`);
    console.log(`❌ OLD (wrong): {"1":"ENERVISA","2":"Michael Huertas",...}`);
    console.log(`✅ NEW (correct): {"empresa":"ENERVISA","nombre":"Michael Huertas",...}`);
    
    const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
    
    // Send with corrected variable format
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
      ? process.env.TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
      
    const messagePayload = {
      from: fromNumber,
      to: `whatsapp:${testPhone}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify(templateVariables)
    };
    
    console.log(`\n📤 Message payload:`);
    console.log(`   ContentSID: ${messagePayload.contentSid}`);
    console.log(`   ContentVariables: ${messagePayload.contentVariables}`);
    
    // Send the message
    console.log(`\n🚀 Sending message with CORRECTED variable format...`);
    const startTime = Date.now();
    const message = await client.messages.create(messagePayload);
    const endTime = Date.now();
    
    console.log(`\n✅ MESSAGE SENT SUCCESSFULLY!`);
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Send time: ${endTime - startTime}ms`);
    
    console.log(`\n📱 CHECK YOUR WHATSAPP NOW!`);
    console.log(`If the correction worked, you should receive:`);
    console.log(`   🏢 ENERVISA`);
    console.log(`   👤 Michael Huertas`);
    console.log(`   🚗 MTX08E`);
    console.log(`   📄 Licencia de Conducción`);
    console.log(`   📅 25 de Septiembre 2025`);
    console.log(`   ⏰ 10`);
    console.log(`   🔗 https://enervisa.gov.co/renovar`);
    
    console.log(`\n📋 If you still receive test data, the template in Twilio might have`);
    console.log(`   different variable names than what we have in the database.`);
    
    return {
      success: true,
      messageSid: message.sid,
      templateVariables,
      contentSid
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
  testCorrectedVariables().catch(console.error);
}

module.exports = { testCorrectedVariables };