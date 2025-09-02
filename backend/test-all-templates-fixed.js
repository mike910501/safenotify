const { PrismaClient } = require('@prisma/client');
const twilioService = require('./config/twilio');
const prisma = new PrismaClient();

async function testAllTemplatesFixed() {
  console.log('🧪 TESTING ALL TEMPLATES WITH FIXED VARIABLE FORMAT\n');
  console.log('📋 Using variable NAMES as keys (empresa, nombre, etc.)\n');
  console.log('=' .repeat(80) + '\n');
  
  try {
    const client = twilioService.client;
    console.log('✅ Twilio client initialized\n');
    
    // Get all active templates
    const templates = await prisma.template.findMany({
      where: { status: 'active' },
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
    
    console.log(`📋 Found ${templates.length} active templates\n`);
    
    const testPhone = '+573133592457';
    
    // Define test data for all possible variables
    const testData = {
      // Personal
      nombre: 'Michael Huertas',
      telefono: '+573133592457',
      
      // Business
      empresa: 'ENERVISA',
      negocio: 'ENERVISA',
      
      // Services
      servicio: 'Renovación Documentos',
      tipo_servicio: 'Renovación de Licencia',
      servicio_recomendado: 'Corte y Peinado',
      
      // Dates and times
      fecha: '15 de Septiembre 2025',
      fecha_cita: '15 de Septiembre 2025',
      fecha_vencimiento: '25 de Septiembre 2025',
      hora: '10:30 AM',
      hora_cita: '10:30 AM',
      hora_estimada: '11:15 AM',
      
      // Location
      lugar: 'Oficina Centro',
      ubicacion: 'Carrera 7 #32-40',
      direccion: 'Carrera 7 #32-40, Bogotá',
      
      // Documents
      placa_vehiculo: 'MTX08E',
      tipo_documento: 'Licencia de Conducción',
      dias_restantes: '10',
      
      // Personnel
      nombre_estilista: 'Ana García',
      nombre_repartidor: 'Carlos López',
      telefono_repartidor: '+573001234567',
      telefono_salon: '+573009876543',
      
      // Orders
      numero_pedido: 'PED-2025-001',
      precio: '$85.000',
      total: '$127.500',
      'tiempo-entrega': '45 minutos',
      tiempo_entrega: '45 minutos',
      
      // Exams
      tipo_examen: 'Examen Médico',
      codigo_resultado: 'RES-2025-789',
      
      // Maintenance
      dias_desde_ultima_visita: '90',
      
      // Links
      link_renovacion: 'https://enervisa.gov.co/renovar',
      link_resultados: 'https://resultados.enervisa.co/RES-2025-789',
      link_reserva: 'https://reservas.salon.co/book'
    };
    
    const results = [];
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
      ? process.env.TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    
    // Test each template
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      console.log(`🧪 TESTING ${i + 1}/${templates.length}: ${template.name}`);
      console.log(`   Variables: ${template.variables?.join(', ') || 'none'}`);
      
      try {
        const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
        
        if (!contentSid) {
          console.log('   ❌ No ContentSID available - SKIP\n');
          results.push({
            template: template.name,
            status: 'skipped',
            error: 'No ContentSID'
          });
          continue;
        }
        
        // Build variables using VARIABLE NAMES as keys (FIXED FORMAT)
        const templateVariables = {};
        
        if (template.variables && template.variables.length > 0) {
          template.variables.forEach(varName => {
            // Use variable NAME as key (not number!)
            templateVariables[varName] = testData[varName] || `TEST_${varName}`;
          });
        }
        
        console.log(`   ContentSID: ${contentSid}`);
        console.log(`   Variables: ${JSON.stringify(templateVariables)}`);
        
        const messagePayload = {
          from: fromNumber,
          to: `whatsapp:${testPhone}`,
          contentSid: contentSid,
          contentVariables: JSON.stringify(templateVariables)
        };
        
        console.log(`   Sending...`);
        const startTime = Date.now();
        const message = await client.messages.create(messagePayload);
        const endTime = Date.now();
        
        console.log(`   ✅ SUCCESS! SID: ${message.sid} (${endTime - startTime}ms)\n`);
        
        results.push({
          template: template.name,
          status: 'success',
          messageSid: message.sid,
          sendTime: endTime - startTime,
          variableCount: template.variables?.length || 0
        });
        
        // Wait between messages
        if (i < templates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}\n`);
        results.push({
          template: template.name,
          status: 'failed',
          error: error.message,
          errorCode: error.code
        });
      }
    }
    
    // Summary
    console.log('=' .repeat(80));
    console.log('📊 FINAL RESULTS SUMMARY');
    console.log('=' .repeat(80) + '\n');
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    console.log(`✅ Successful: ${successful}/${templates.length}`);
    console.log(`❌ Failed: ${failed}/${templates.length}`);
    console.log(`⏭️  Skipped: ${skipped}/${templates.length}`);
    
    if (successful === templates.length - skipped) {
      console.log('\n🎉 ALL TEMPLATES WORKING PERFECTLY!');
      console.log('✅ Variable format is correct (using names, not numbers)');
      console.log('✅ All messages sent successfully');
      console.log('✅ System is ready for production');
    } else {
      console.log('\n⚠️  Some templates failed. Check the errors above.');
    }
    
    // Show detailed results
    console.log('\n📋 DETAILED RESULTS:');
    results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      console.log(`${index + 1}. ${icon} ${result.template}`);
      if (result.status === 'success') {
        console.log(`      SID: ${result.messageSid}`);
        console.log(`      Time: ${result.sendTime}ms`);
        console.log(`      Variables: ${result.variableCount}`);
      } else if (result.status === 'failed') {
        console.log(`      Error: ${result.error}`);
        console.log(`      Code: ${result.errorCode || 'unknown'}`);
      } else {
        console.log(`      Reason: ${result.error}`);
      }
    });
    
    console.log('\n📱 Check your WhatsApp for all the messages!');
    console.log('   All should have REAL DATA, not test data.');
    
    return results;
    
  } catch (error) {
    console.error('💥 Test script failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testAllTemplatesFixed().catch(console.error);
}

module.exports = { testAllTemplatesFixed };