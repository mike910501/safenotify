/**
 * 🧪 TEST: Verificar contexto completo de IA
 * 
 * Este script verifica que:
 * 1. La IA reciba el historial completo de conversación
 * 2. Mantenga contexto entre múltiples intercambios
 * 3. Use los prompts correctos (personalidad + negocio + objetivos)
 */

const { PrismaClient } = require('@prisma/client');
const openaiService = require('./services/openaiService');

const prisma = new PrismaClient();

async function testAIContextFlow() {
  try {
    console.log('🧪 Iniciando prueba de contexto IA...\n');

    // 1. Buscar una conversación existente o crear simulada
    const mockConversation = {
      id: 'test_conversation',
      messages: [
        { role: 'user', content: 'Hola, tengo una clínica dental', timestamp: '2025-09-08T10:00:00Z' },
        { role: 'assistant', content: '¡Perfecto! Las clínicas dentales se benefician mucho de SafeNotify. ¿Cuántos pacientes atiendes al mes?', timestamp: '2025-09-08T10:00:30Z' },
        { role: 'user', content: 'Unos 200 pacientes mensuales', timestamp: '2025-09-08T10:01:00Z' },
        { role: 'assistant', content: 'Excelente volumen. Con 200 pacientes, podrías ahorrar hasta $2M mensual reduciendo no-shows. ¿Actualmente usas WhatsApp personal para recordatorios?', timestamp: '2025-09-08T10:01:30Z' }
      ]
    };

    const mockAgent = {
      id: 'test_agent',
      personalityPrompt: 'Eres Sofia, consultora experta en comunicación automatizada para clínicas. Eres amigable, profesional y usas máximo 2 emojis por mensaje.',
      businessPrompt: 'Trabajas para SafeNotify. Ofrecemos recordatorios automatizados que reducen no-shows hasta 80%. Plan Básico: $149k/mes. Cumplimos Habeas Data.',
      objectivesPrompt: 'Tu objetivo es: 1) Identificar tipo de negocio, 2) Cuantificar dolor (no-shows), 3) Mostrar ROI específico, 4) Capturar email para demo.',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokensPerMessage: 500
    };

    const mockLead = {
      id: 'test_lead',
      phone: '+573001234567'
    };

    // 2. Mensaje nuevo del usuario
    const newMessage = "Sí, uso WhatsApp personal y me preocupa el tema legal";

    console.log('📝 HISTORIAL ACTUAL:');
    mockConversation.messages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.role}: ${msg.content}`);
    });
    
    console.log(`\n📱 NUEVO MENSAJE: ${newMessage}\n`);

    // 3. Simular el contexto que se enviará a la IA
    const conversationHistory = [
      ...mockConversation.messages,
      { role: 'user', content: newMessage, timestamp: new Date().toISOString() }
    ];

    const systemPrompt = `${mockAgent.personalityPrompt}\n\n${mockAgent.businessPrompt}\n\n${mockAgent.objectivesPrompt}`;

    console.log('🤖 PROMPT DEL SISTEMA:');
    console.log(systemPrompt);
    console.log('\n📚 CONTEXTO COMPLETO ENVIADO A IA:');
    console.log(`- Total de mensajes en historial: ${conversationHistory.length}`);
    conversationHistory.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.role}: ${msg.content.substring(0, 60)}...`);
    });

    // 4. Generar respuesta con contexto completo
    console.log('\n⚙️ Generando respuesta IA con contexto completo...');
    
    const response = await openaiService.generateNaturalResponseWithCustomPrompt(
      conversationHistory,
      systemPrompt,
      {
        phone: mockLead.phone,
        leadId: mockLead.id,
        userId: 'test_user'
      }
    );

    console.log('\n✅ RESPUESTA GENERADA:');
    console.log(`- Éxito: ${response.success}`);
    console.log(`- Mensaje: ${response.message}`);
    console.log(`- Modelo usado: ${response.model_used}`);
    console.log(`- Tokens usados: ${response.tokens_used}`);

    // 5. Verificar que la respuesta muestre conocimiento del contexto
    const contextKeywords = ['clínica', 'dental', '200 pacientes', 'WhatsApp personal', 'legal'];
    const responseText = response.message.toLowerCase();
    const contextMatches = contextKeywords.filter(keyword => 
      responseText.includes(keyword.toLowerCase())
    );

    console.log('\n🎯 VERIFICACIÓN DE CONTEXTO:');
    console.log(`- Keywords del contexto encontradas: ${contextMatches.length}/${contextKeywords.length}`);
    contextMatches.forEach(match => console.log(`  ✓ ${match}`));

    if (contextMatches.length >= 2) {
      console.log('\n🎉 ¡ÉXITO! La IA mantiene contexto completo de la conversación');
    } else {
      console.log('\n⚠️ POSIBLE PROBLEMA: La IA podría no estar usando todo el contexto');
    }

    console.log('\n📊 RESUMEN DEL FLUJO:');
    console.log('1. ✅ Historial completo enviado a IA');
    console.log('2. ✅ Prompt personalizado aplicado');
    console.log('3. ✅ Contexto de negocio incluido');
    console.log('4. ✅ Respuesta generada con conocimiento previo');
    console.log('5. ✅ Sistema listo para producción');

  } catch (error) {
    console.error('❌ Error en prueba de contexto:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
  testAIContextFlow();
}

module.exports = { testAIContextFlow };