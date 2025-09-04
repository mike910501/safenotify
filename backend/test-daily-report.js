require('dotenv').config();
const { sendDailyReport, getTodaysConversationPrompts, getTodaysNewLeads } = require('./services/dailyReportService');

/**
 * Test script for daily report system
 * Run this to manually test the daily report functionality
 */

async function testDailyReport() {
  try {
    console.log('🧪 Testing Daily Report System...');
    console.log('=' .repeat(50));
    
    // Test 1: Get today's conversation prompts
    console.log('\n📋 Test 1: Fetching today\'s conversation prompts...');
    const prompts = await getTodaysConversationPrompts();
    console.log(`✅ Found ${prompts.length} conversation prompts`);
    
    if (prompts.length > 0) {
      console.log('📝 Sample prompt:');
      console.log(`   - Lead: ${prompts[0].lead.phone.substring(0, 8)}***`);
      console.log(`   - Summary: "${prompts[0].conversationSummary?.substring(0, 100)}..."`);
    }
    
    // Test 2: Get today's new leads
    console.log('\n👥 Test 2: Fetching today\'s new leads...');
    const newLeads = await getTodaysNewLeads();
    console.log(`✅ Found ${newLeads.length} new leads`);
    
    if (newLeads.length > 0) {
      console.log('👤 Sample lead:');
      console.log(`   - Phone: ${newLeads[0].phone.substring(0, 8)}***`);
      console.log(`   - Name: ${newLeads[0].name || 'Sin nombre'}`);
      console.log(`   - Score: ${newLeads[0].qualificationScore}`);
    }
    
    // Test 3: Send daily report
    console.log('\n📧 Test 3: Sending daily report email...');
    const result = await sendDailyReport();
    console.log('✅ Daily report sent successfully!');
    console.log(`📧 Email ID: ${result.emailId}`);
    console.log(`📊 Report included: ${result.leadsCount} new leads, ${result.conversationsCount} conversations`);
    
    console.log('\n🎉 All tests passed! Check your email at mikehuertas91@gmail.com');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDailyReport()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });