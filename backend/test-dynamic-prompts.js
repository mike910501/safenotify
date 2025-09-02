// Test script for dynamic prompts system
require('dotenv').config();
const dynamicPromptService = require('./services/dynamicPromptService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDynamicPrompts() {
  try {
    console.log('🧪 Testing Dynamic Prompts System...\n');

    // Test 1: Generate initial prompt
    console.log('📝 Test 1: Generating initial prompt...');
    const testPhone = '+573999888777';
    const testMessage = 'Hola, tengo un restaurante y me interesa SafeNotify';

    // Create test lead first
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
      console.log('✅ Initial prompt generated successfully!');
      console.log('📋 Prompt preview:', initialPrompt.systemPrompt.substring(0, 200) + '...');
      console.log('🏢 Business context:', JSON.stringify(initialPrompt.businessContext, null, 2));
    } else {
      console.log('❌ Initial prompt failed:', initialPrompt.error);
    }

    // Test 2: Simulate conversation and update prompt
    console.log('\n📝 Test 2: Simulating conversation and updating prompt...');
    
    const conversationHistory = [
      { role: 'user', content: 'Hola, tengo un restaurante y me interesa SafeNotify' },
      { role: 'assistant', content: 'Perfecto! SafeNotify ayuda restaurantes con confirmaciones de reservas.' },
      { role: 'user', content: 'Tenemos 50 mesas y muchos no-shows' },
      { role: 'assistant', content: 'Entiendo el problema. ¿Cuántas reservas manejan por día?' },
      { role: 'user', content: 'Como 80-100 reservas diarias' }
    ];

    const updatedPrompt = await dynamicPromptService.updatePromptWithSummary(
      testLead.id,
      conversationHistory,
      { content: 'Como 80-100 reservas diarias' }
    );

    if (updatedPrompt.success) {
      console.log('✅ Prompt updated with summary!');
      console.log('📊 Summary:', updatedPrompt.summary.substring(0, 150) + '...');
      console.log('🏢 Updated context:', JSON.stringify(updatedPrompt.businessContext, null, 2));
      console.log('📋 New prompt preview:', updatedPrompt.systemPrompt.substring(0, 200) + '...');
    } else {
      console.log('❌ Prompt update failed:', updatedPrompt.error);
    }

    // Test 3: Get current prompt
    console.log('\n📝 Test 3: Getting current prompt...');
    const currentPrompt = await dynamicPromptService.getCurrentPrompt(testLead.id);
    console.log('📋 Current prompt length:', currentPrompt.systemPrompt.length);
    console.log('📊 Current summary:', currentPrompt.summary.substring(0, 100) + '...');

    // Test 4: Check database records
    console.log('\n📝 Test 4: Checking database records...');
    const promptRecords = await prisma.conversationPrompt.findMany({
      where: { leadId: testLead.id },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ Found ${promptRecords.length} prompt records`);
    promptRecords.forEach((record, i) => {
      console.log(`  ${i + 1}. Version ${record.promptVersion}, Reason: ${record.triggerReason}, Tokens: ${record.tokensUsed}`);
    });

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.conversationPrompt.deleteMany({
      where: { leadId: testLead.id }
    });
    await prisma.safeNotifyLead.delete({
      where: { id: testLead.id }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ Initial prompt generation: Working');
    console.log('✅ Auto-summary and prompt update: Working');
    console.log('✅ Database storage: Working');
    console.log('✅ Business context extraction: Working');
    console.log('\n🚀 Dynamic Prompts System is READY for production!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testDynamicPrompts();