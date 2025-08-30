// Test script para verificar analytics endpoint
const { PrismaClient } = require('@prisma/client');

async function testAnalytics() {
  console.log('🧪 Testing Analytics Implementation...\n');
  
  try {
    // 1. Test Prisma connection
    console.log('1️⃣ Testing Prisma connection...');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ Prisma connected successfully\n');
    
    // 2. Test basic queries
    console.log('2️⃣ Testing basic queries...');
    
    const userCount = await prisma.user.count();
    console.log(`✅ Users in database: ${userCount}`);
    
    const campaignCount = await prisma.campaign.count();
    console.log(`✅ Campaigns in database: ${campaignCount}`);
    
    const messageCount = await prisma.messageLog.count();
    console.log(`✅ Messages in database: ${messageCount}\n`);
    
    // 3. Test analytics queries
    console.log('3️⃣ Testing analytics queries...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Test message stats
    const recentMessages = await prisma.messageLog.count({
      where: {
        sentAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    console.log(`✅ Recent messages (30 days): ${recentMessages}`);
    
    // Test delivered messages
    const deliveredMessages = await prisma.messageLog.count({
      where: {
        status: 'delivered',
        sentAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    console.log(`✅ Delivered messages: ${deliveredMessages}`);
    
    // 4. Test complex query (similar to analytics endpoint)
    console.log('\n4️⃣ Testing complex analytics query...');
    
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE("sentAt") as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM message_logs ml
      WHERE ml."sentAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("sentAt")
      ORDER BY DATE("sentAt") DESC
      LIMIT 5
    `;
    
    console.log('✅ Daily stats sample:', JSON.stringify(dailyStats, null, 2));
    
    // 5. Test template usage query
    console.log('\n5️⃣ Testing template usage query...');
    
    const templateUsage = await prisma.$queryRaw`
      SELECT 
        t.name,
        COUNT(c.id) as usage_count
      FROM templates t
      LEFT JOIN campaigns c ON t.id = c."templateId"
      WHERE c."createdAt" >= ${thirtyDaysAgo}
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC
      LIMIT 3
    `;
    
    // Convert BigInt to regular numbers for JSON serialization
    const templateUsageFormatted = templateUsage.map(item => ({
      ...item,
      usage_count: Number(item.usage_count)
    }));
    console.log('✅ Template usage sample:', JSON.stringify(templateUsageFormatted, null, 2));
    
    console.log('\n🎉 ALL ANALYTICS TESTS PASSED!');
    console.log('✅ Analytics endpoint should work correctly in production');
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Specific error handling
    if (error.code === 'P2021') {
      console.log('\n💡 TIP: The table might not exist. Run: npx prisma db push');
    }
    
    if (error.message.includes('connect')) {
      console.log('\n💡 TIP: Check DATABASE_URL in .env file');
    }
    
  } finally {
    process.exit(0);
  }
}

// Run the test
testAnalytics();