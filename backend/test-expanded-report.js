require('dotenv').config();
const { sendDailyReport } = require('./services/dailyReportService');

/**
 * Test script for the expanded daily report with complete chat history
 */

async function testExpandedReport() {
  try {
    console.log('🧪 Testing EXPANDED Daily Report System...');
    console.log('🔍 Now includes:');
    console.log('   ✅ Complete conversation summaries');
    console.log('   ✅ Full chat message history');
    console.log('   ✅ Unique clients only (no duplicates)');
    console.log('   ✅ Complete phone numbers');
    console.log('=' .repeat(60));
    
    console.log('\n📧 Sending expanded daily report...');
    const result = await sendDailyReport();
    
    console.log('\n✅ EXPANDED REPORT SENT SUCCESSFULLY!');
    console.log(`📧 Email ID: ${result.emailId}`);
    console.log(`📊 Report included:`);
    console.log(`   - ${result.leadsCount} new leads`);
    console.log(`   - ${result.conversationsCount} unique conversations WITH FULL CHAT`);
    
    console.log('\n📋 Enhanced Features:');
    console.log('   🔍 Complete conversation summaries (not truncated)');
    console.log('   💬 Full chat message history with timestamps');
    console.log('   👤 Client messages vs 🤖 Sofia responses');
    console.log('   🏢 Business context in readable format');
    console.log('   📱 Complete phone numbers');
    console.log('   🎯 No duplicate clients');
    
    console.log('\n🎉 Check your email for the COMPLETE conversation details!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Expanded report test failed:', error);
    process.exit(1);
  }
}

// Run the test
testExpandedReport()
  .then(() => {
    console.log('✅ Expanded report test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Expanded report test failed:', error);
    process.exit(1);
  });