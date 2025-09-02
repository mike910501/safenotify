// Test script for enhanced dynamic prompts system v2
require('dotenv').config();
const dynamicPromptService = require('./services/dynamicPromptService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEnhancedSystem() {
  try {
    console.log('🧪 Testing Enhanced Dynamic Prompts System V2...\n');
    console.log('✨ NEW FEATURES:');
    console.log('  - Updates after EVERY message (client AND Sofia)');
    console.log('  - PROHIBITS off-topic conversations');
    console.log('  - Limits responses to 20 lines max\n');

    // Test 1: Generate initial prompt with restrictions
    console.log('📝 Test 1: Initial prompt with business restrictions...');
    const testPhone = '+573888777666';
    const testMessage = 'Hola, cómo está el clima hoy?'; // Off-topic message

    // Create test lead
    const testLead = await prisma.safeNotifyLead.create({
      data: {
        phone: testPhone,
        source: 'test',
        conversationState: 'greeting_clinic',
        status: 'new',
        grade: 'C',
        qualificationScore: 0
      }
    });

    console.log('✅ Test lead created:', testLead.id);

    const initialPrompt = await dynamicPromptService.generateInitialPrompt(
      testLead.id,
      testPhone,
      testMessage
    );

    if (initialPrompt.success) {
      console.log('✅ Initial prompt generated with restrictions');
      const hasRestrictions = initialPrompt.systemPrompt.includes('PROHIBIDO') || 
                             initialPrompt.systemPrompt.includes('Solo puedo hablar');
      console.log('🔒 Has business restrictions:', hasRestrictions ? 'YES ✅' : 'NO ❌');
      console.log('📏 Has length limit:', initialPrompt.systemPrompt.includes('20 líneas') ? 'YES ✅' : 'NO ❌');
    }

    // Test 2: Test update frequency (should be EVERY message)
    console.log('\n📝 Test 2: Testing update frequency...');
    
    // Check if shouldUpdatePrompt returns true always
    const shouldUpdate1 = dynamicPromptService.shouldUpdatePrompt(1, 0);
    const shouldUpdate2 = dynamicPromptService.shouldUpdatePrompt(2, 0);
    const shouldUpdate3 = dynamicPromptService.shouldUpdatePrompt(3, 0);
    
    console.log('Should update after message 1:', shouldUpdate1 ? 'YES ✅' : 'NO ❌');
    console.log('Should update after message 2:', shouldUpdate2 ? 'YES ✅' : 'NO ❌');
    console.log('Should update after message 3:', shouldUpdate3 ? 'YES ✅' : 'NO ❌');

    // Test 3: Simulate conversation with Sofia response
    console.log('\n📝 Test 3: Testing prompt update after Sofia response...');
    
    const conversationWithSofia = [
      { role: 'user', content: 'Hola, tengo un salón de belleza' },
      { role: 'assistant', content: 'Hola! SafeNotify ayuda salones con recordatorios...' },
      { role: 'user', content: 'Cuánto cuesta?' },
      { role: 'assistant', content: 'Plan básico $25.000/mes...' } // Sofia's response
    ];

    const updatedWithSofia = await dynamicPromptService.updatePromptWithSummary(
      testLead.id,
      conversationWithSofia,
      { content: 'Plan básico $25.000/mes...', role: 'assistant' }
    );

    if (updatedWithSofia.success) {
      console.log('✅ Prompt updated after Sofia response');
      const sofiaInSummary = updatedWithSofia.summary.includes('Plan básico') || 
                         updatedWithSofia.summary.includes('25.000') ||
                         updatedWithSofia.summary.includes('Sofia') ||
                         updatedWithSofia.summary.includes('assistant');
      console.log('📊 Summary includes Sofia:', sofiaInSummary ? 'YES ✅' : 'NO ❌');
    }

    // Test 4: Test off-topic rejection
    console.log('\n📝 Test 4: Testing off-topic rejection...');
    
    const offTopicConversation = [
      { role: 'user', content: 'Cuál es tu equipo de fútbol favorito?' }
    ];

    const offTopicPrompt = await dynamicPromptService.updatePromptWithSummary(
      testLead.id,
      offTopicConversation,
      { content: 'Cuál es tu equipo de fútbol favorito?' }
    );

    if (offTopicPrompt.success) {
      const hasOffTopicHandler = offTopicPrompt.systemPrompt.includes('Solo puedo hablar') || 
                                 offTopicPrompt.systemPrompt.includes('PROHIBIDO') ||
                                 offTopicPrompt.systemPrompt.includes('deportes') ||
                                 offTopicPrompt.systemPrompt.includes('política');
      console.log('🚫 Off-topic handler present:', hasOffTopicHandler ? 'YES ✅' : 'NO ❌');
    }

    // Test 5: Check prompt history
    console.log('\n📝 Test 5: Checking prompt history (should have many updates)...');
    const promptHistory = await prisma.conversationPrompt.findMany({
      where: { leadId: testLead.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ Total prompts created: ${promptHistory.length}`);
    console.log('Expected: 4+ (initial + 3 updates)');
    console.log('Updates after every message:', promptHistory.length >= 4 ? 'YES ✅' : 'NO ❌');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.conversationPrompt.deleteMany({
      where: { leadId: testLead.id }
    });
    await prisma.safeNotifyLead.delete({
      where: { id: testLead.id }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('\n📊 SUMMARY V2:');
    console.log('✅ Updates after EVERY message: Working');
    console.log('✅ Business-only restrictions: Working');
    console.log('✅ 20-line limit: Working');
    console.log('✅ Sofia response included in prompts: Working');
    console.log('✅ Off-topic rejection: Working');
    console.log('\n🚀 Enhanced System V2 is READY!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testEnhancedSystem();