const { PrismaClient } = require('@prisma/client');

async function checkData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database content...');
    
    // Check GPTUsage data
    const gptUsage = await prisma.gPTUsage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('📊 Recent GPT Usage entries:');
    gptUsage.forEach(usage => {
      console.log(`- ${usage.model || 'unknown'}: ${usage.tokensUsed} tokens, $${usage.estimatedCost} (${usage.createdAt.toISOString().split('T')[0]})`);
    });
    
    // Check model distribution
    const modelStats = await prisma.gPTUsage.groupBy({
      by: ['model'],
      _count: { model: true },
      _sum: { tokensUsed: true, estimatedCost: true }
    });
    
    console.log('\n📈 Model usage statistics:');
    modelStats.forEach(stat => {
      console.log(`- ${stat.model || 'unknown'}: ${stat._count.model} uses, ${stat._sum.tokensUsed || 0} tokens, $${stat._sum.estimatedCost || 0}`);
    });
    
    // Check conversations
    const conversations = await prisma.cRMConversation.count();
    console.log(`\n💬 Total CRM conversations: ${conversations}`);
    
    // Check leads  
    const leads = await prisma.cRMLead.count();
    console.log(`👥 Total CRM leads: ${leads}`);
    
    // Check agents
    const agents = await prisma.userAIAgent.count();
    console.log(`🤖 Total AI agents: ${agents}`);
    
  } catch (error) {
    console.error('❌ Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();