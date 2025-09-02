const { PrismaClient } = require('@prisma/client');
const twilioService = require('./config/twilio');
const prisma = new PrismaClient();

async function testTwilioDirectSend() {
  console.log('🧪 DIRECT TWILIO TEMPLATE TEST - REAL MESSAGES\n');
  
  try {
    // Get Twilio client
    const client = twilioService.client;
    console.log('✅ Twilio client initialized');
    
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
    
    // Test phone number (replace with your test number)
    const testPhone = '+573133592457'; // Your number for testing
    const testData = {
      // Datos personales
      nombre: 'Michael Huertas',
      
      // Datos de empresa
      empresa: 'ENERVISA',
      negocio: 'ENERVISA',
      
      // Servicios y citas
      servicio: 'Renovación Documentos',
      tipo_servicio: 'Renovación de Licencia',
      
      // Fechas y tiempos
      fecha: '15 de Septiembre 2025',
      fecha_cita: '15 de Septiembre 2025',
      fecha_vencimiento: '25 de Septiembre 2025',
      hora: '10:30 AM',
      hora_cita: '10:30 AM',
      
      // Ubicación
      lugar: 'Oficina Centro',
      ubicacion: 'Carrera 7 #32-40',
      direccion: 'Carrera 7 #32-40, Bogotá',
      
      // Documentos y vehículos
      placa_vehiculo: 'MTX08E',
      tipo_documento: 'Licencia de Conducción',
      dias_restantes: '10',
      
      // Personal y contacto
      telefono: '+573133592457',
      nombre_estilista: 'Ana García',
      nombre_repartidor: 'Carlos López',
      telefono_repartidor: '+573001234567',
      telefono_salon: '+573009876543',
      
      // Pedidos y reservas
      numero_pedido: 'PED-2025-001',
      precio: '$85.000',
      total: '$127.500',
      tiempo_entrega: '45 minutos',
      hora_estimada: '11:15 AM',
      
      // Exámenes y resultados
      tipo_examen: 'Examen Médico',
      codigo_resultado: 'RES-2025-789',
      
      // Mantenimiento
      dias_desde_ultima_visita: '90',
      servicio_recomendado: 'Corte y Peinado',
      
      // Links
      link_renovacion: 'https://enervisa.gov.co/renovar',
      link_resultados: 'https://resultados.enervisa.co/RES-2025-789',
      link_reserva: 'https://reservas.salon.co/book'
    };
    
    console.log(`📱 Test phone: ${testPhone}`);
    console.log(`📊 Test data:`, testData);
    console.log('\n' + '='.repeat(80) + '\n');
    
    const results = [];
    
    // Test each template
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      console.log(`🧪 TESTING TEMPLATE ${i + 1}/${templates.length}: ${template.name}`);
      console.log(`📋 Template ID: ${template.id}`);
      console.log(`📋 Variables: ${template.variables?.length || 0}`);
      
      try {
        // Determine Content SID using the fixed logic
        const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
        
        console.log(`🔍 SID Analysis:`);
        console.log(`   twilioSid: ${template.twilioSid || 'null'}`);
        console.log(`   twilioContentSid: ${template.twilioContentSid || 'null'}`);
        console.log(`   twilioTemplateId: ${template.twilioTemplateId || 'null'}`);
        console.log(`   Selected ContentSID: ${contentSid}`);
        
        if (!contentSid) {
          console.log('❌ No Content SID available - SKIP\n');
          results.push({
            template: template.name,
            status: 'skipped',
            error: 'No Content SID available'
          });
          continue;
        }
        
        // Prepare message payload with proper WhatsApp format
        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
          ? process.env.TWILIO_WHATSAPP_NUMBER 
          : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
          
        const messagePayload = {
          from: fromNumber,
          to: `whatsapp:${testPhone}`,
          contentSid: contentSid
        };
        
        // Prepare template variables if any
        if (template.variables && template.variables.length > 0) {
          const templateVariables = {};
          
          template.variables.forEach((varName, varIndex) => {
            const variableNumber = (varIndex + 1).toString();
            let value = testData[varName] || testData[varName.toLowerCase()] || `NO_DATA_FOR_${varName}`;
            
            // Handle specific mappings for common variations
            if (!testData[varName] && !testData[varName.toLowerCase()]) {
              const mappings = {
                'tiempo-entrega': 'tiempo_entrega',
                'tiempo_entrega': 'tiempo_entrega',
                'hora_estimada': 'hora_estimada',
                'nombre_repartidor': 'nombre_repartidor',
                'telefono_repartidor': 'telefono_repartidor'
              };
              if (mappings[varName]) {
                value = testData[mappings[varName]] || value;
              }
            }
            
            templateVariables[variableNumber] = value;
          });
          
          messagePayload.contentVariables = JSON.stringify(templateVariables);
          console.log(`📋 Template Variables:`, templateVariables);
        }
        
        console.log(`📤 Message Payload:`, {
          ...messagePayload,
          contentVariables: messagePayload.contentVariables ? 'SET' : 'NOT_SET'
        });
        
        // Send message
        console.log(`🚀 Sending message...`);
        const startTime = Date.now();
        const message = await client.messages.create(messagePayload);
        const endTime = Date.now();
        
        console.log(`✅ MESSAGE SENT SUCCESSFULLY!`);
        console.log(`   Message SID: ${message.sid}`);
        console.log(`   Status: ${message.status}`);
        console.log(`   Send time: ${endTime - startTime}ms`);
        console.log(`   Error code: ${message.errorCode || 'none'}`);
        console.log(`   Error message: ${message.errorMessage || 'none'}`);
        
        results.push({
          template: template.name,
          status: 'success',
          messageSid: message.sid,
          messageStatus: message.status,
          sendTime: endTime - startTime,
          contentSid: contentSid,
          hasVariables: template.variables?.length > 0
        });
        
      } catch (error) {
        console.log(`❌ SEND FAILED:`);
        console.log(`   Error: ${error.message}`);
        console.log(`   Code: ${error.code || 'unknown'}`);
        console.log(`   Status: ${error.status || 'unknown'}`);
        
        results.push({
          template: template.name,
          status: 'failed',
          error: error.message,
          errorCode: error.code,
          contentSid: template.twilioContentSid || template.twilioSid || template.twilioTemplateId
        });
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
      
      // Wait between messages to avoid rate limits
      if (i < templates.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Summary report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL TEST RESULTS SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    const skipped = results.filter(r => r.status === 'skipped');
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⏭️  Skipped: ${skipped.length}`);
    console.log(`📊 Total: ${results.length}\n`);
    
    if (successful.length > 0) {
      console.log('✅ SUCCESSFUL SENDS:');
      successful.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.template}`);
        console.log(`      SID: ${result.messageSid}`);
        console.log(`      Status: ${result.messageStatus}`);
        console.log(`      Time: ${result.sendTime}ms`);
        console.log(`      ContentSID: ${result.contentSid}`);
        console.log(`      Variables: ${result.hasVariables ? 'YES' : 'NO'}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED SENDS:');
      failed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.template}`);
        console.log(`      Error: ${result.error}`);
        console.log(`      Code: ${result.errorCode || 'none'}`);
        console.log(`      ContentSID: ${result.contentSid}`);
      });
      
      console.log('\n🔍 FAILURE ANALYSIS:');
      
      // Analyze failure patterns
      const errorTypes = {};
      failed.forEach(result => {
        const errorKey = result.errorCode || 'unknown';
        errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
      });
      
      console.log('Error patterns:');
      Object.entries(errorTypes).forEach(([error, count]) => {
        console.log(`   ${error}: ${count} occurrences`);
      });
    }
    
    if (skipped.length > 0) {
      console.log('\n⏭️  SKIPPED TEMPLATES:');
      skipped.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.template}: ${result.error}`);
      });
    }
    
    // Generate fix recommendations
    console.log('\n🔧 FIX RECOMMENDATIONS:');
    
    if (failed.length > 0) {
      console.log('Based on failures found:');
      
      const commonIssues = {
        '21211': 'Invalid phone number format',
        '63007': 'Template content does not exist or is not approved',
        '63016': 'Template variables mismatch',
        '20003': 'Authentication issue',
        '21610': 'Template not found'
      };
      
      failed.forEach(result => {
        if (result.errorCode && commonIssues[result.errorCode]) {
          console.log(`❌ ${result.template}: ${commonIssues[result.errorCode]}`);
        }
      });
    }
    
    if (successful.length === templates.length) {
      console.log('🎉 ALL TEMPLATES WORKING CORRECTLY!');
    } else {
      console.log('⚠️  Some templates have issues that need fixing');
    }
    
    console.log('\n📋 TEST COMPLETE - Check your WhatsApp for received messages');
    
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
  testTwilioDirectSend().catch(console.error);
}

module.exports = { testTwilioDirectSend };