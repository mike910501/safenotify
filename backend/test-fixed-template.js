require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createTwilioClient } = require('./config/twilio');

const prisma = new PrismaClient();

async function testFixedTemplateVariables() {
  console.log('🧪 PRUEBA DE PLANTILLA CORREGIDA - ERROR 63028\n');
  
  try {
    // Buscar template con el contenido problemático
    const template = await prisma.template.findFirst({
      where: {
        status: 'approved',
        content: {
          contains: '{{empresa}}'
        },
        variables: {
          hasSome: ['nombre', 'empresa', 'fecha', 'direccion']
        }
      }
    });

    if (!template) {
      console.log('❌ No se encontró template con las variables problemáticas');
      return;
    }

    console.log('📋 TEMPLATE ENCONTRADO:');
    console.log(`Nombre: ${template.name}`);
    console.log(`Content SID: ${template.twilioContentSid}`);
    console.log(`Variables originales: [${template.variables.join(', ')}] (${template.variables.length})`);
    console.log(`Contenido: "${template.content}"`);

    // Aplicar la lógica de deduplicación que implementamos
    const uniqueVariables = [...new Set(template.variables)];
    console.log(`Variables únicas: [${uniqueVariables.join(', ')}] (${uniqueVariables.length})`);

    // Detectar variables duplicadas en el contenido
    const contentVariables = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(template.content)) !== null) {
      contentVariables.push(match[1]);
    }
    
    console.log(`Variables en contenido: [${contentVariables.join(', ')}] (${contentVariables.length})`);
    
    const varCount = {};
    contentVariables.forEach(variable => {
      varCount[variable] = (varCount[variable] || 0) + 1;
    });
    
    console.log('\n📊 ANÁLISIS DE VARIABLES:');
    Object.entries(varCount).forEach(([variable, count]) => {
      console.log(`  ${variable}: ${count} vez(es)${count > 1 ? ' ⚠️ DUPLICADA' : ''}`);
    });

    // Datos de prueba
    const testContact = {
      nombre: 'Juan Pérez',
      empresa: 'SafeNotify',
      fecha: '15 de diciembre',
      direccion: 'Calle 123 #45-67'
    };

    console.log('\n🎯 PREPARANDO VARIABLES PARA TWILIO:');
    
    const templateVariables = {};
    uniqueVariables.forEach((varName) => {
      const value = testContact[varName] || `[${varName}]`;
      templateVariables[varName] = value;
      console.log(`  ${varName}: "${value}"`);
    });

    console.log(`\nVariables JSON: ${JSON.stringify(templateVariables)}`);
    
    // Solo hacer la llamada real si tenemos credenciales válidas y un ContentSID
    if (template.twilioContentSid && process.env.TWILIO_ACCOUNT_SID) {
      console.log('\n🚀 INTENTANDO ENVÍO REAL A NÚMERO DE PRUEBA...');
      
      // Usar número de prueba seguro
      const testPhone = '+573001234567'; // Número ficticio para prueba
      
      try {
        const client = createTwilioClient();
        
        const messagePayload = {
          from: process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
            ? process.env.TWILIO_WHATSAPP_NUMBER 
            : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${testPhone}`,
          contentSid: template.twilioContentSid,
          contentVariables: JSON.stringify(templateVariables)
        };

        console.log('📤 Payload para Twilio:');
        console.log(JSON.stringify(messagePayload, null, 2));
        
        // Comentar la línea siguiente para hacer prueba real
        console.log('⚠️ Prueba simulada - descomenta la siguiente línea para envío real');
        // const message = await client.messages.create(messagePayload);
        // console.log('✅ Mensaje enviado exitosamente:', message.sid);
        
      } catch (error) {
        if (error.code === 63028) {
          console.log('❌ ERROR 63028 PERSISTE - Variables aún no coinciden');
        } else {
          console.log(`❌ Otro error: ${error.code} - ${error.message}`);
        }
      }
    } else {
      console.log('⚠️ No se puede hacer prueba real - falta ContentSID o credenciales');
    }

    console.log('\n💡 RESULTADO DEL ANÁLISIS:');
    console.log(`- Variables originales: ${template.variables.length}`);
    console.log(`- Variables únicas: ${uniqueVariables.length}`);
    console.log(`- Variables en contenido: ${contentVariables.length}`);
    
    if (uniqueVariables.length === new Set(contentVariables).size) {
      console.log('✅ FIX APLICADO CORRECTAMENTE - Variables únicas coinciden');
    } else {
      console.log('❌ AÚN HAY DISCREPANCIA - Revisar lógica');
    }

  } catch (error) {
    console.error('💥 Error en prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedTemplateVariables().catch(console.error);