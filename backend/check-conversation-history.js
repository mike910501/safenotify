const { PrismaClient } = require('@prisma/client');

async function checkConversationHistory() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking conversation history...\n');
    
    // Get recent CRM conversations
    const conversations = await prisma.cRMConversation.findMany({
      orderBy: { lastActivity: 'desc' },
      take: 3,
      include: {
        customerLead: true,
        currentAgent: true
      }
    });
    
    console.log(`📊 Found ${conversations.length} recent conversations:\n`);
    
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      console.log(`🗣️ Conversation ${i + 1}:`);
      console.log(`   ID: ${conv.id}`);
      console.log(`   Customer: ${conv.customerLead?.name || 'Unknown'}`);
      console.log(`   Phone: ${conv.customerLead?.phone?.substring(0, 8)}***`);
      console.log(`   Agent: ${conv.currentAgent?.name || 'No agent'}`);
      console.log(`   Status: ${conv.status}`);
      console.log(`   Message count: ${conv.messageCount}`);
      console.log(`   Last activity: ${conv.lastActivity?.toISOString()}`);
      
      if (conv.messages && Array.isArray(conv.messages)) {
        console.log(`   Recent messages (${conv.messages.length}):`);
        const recentMessages = conv.messages.slice(-5); // Last 5 messages
        recentMessages.forEach((msg, idx) => {
          console.log(`     ${idx + 1}. [${msg.role}] ${msg.content?.substring(0, 80)}...`);
        });
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking conversations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConversationHistory();