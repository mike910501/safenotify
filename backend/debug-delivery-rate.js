// Debug script para investigar por qué la tasa de entrega es 0
const { PrismaClient } = require('@prisma/client');

async function debugDeliveryRate() {
  console.log('🔍 DEBUGGING DELIVERY RATE ISSUES...\n');
  
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // 1. Verificar structure de la tabla message_logs
    console.log('1️⃣ CHECKING MESSAGE LOGS STRUCTURE...');
    
    const messageLogs = await prisma.messageLog.findMany({
      take: 5,
      include: {
        campaign: {
          include: {
            user: {
              select: { name: true, email: true }
            },
            template: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    console.log(`Found ${messageLogs.length} message logs`);
    if (messageLogs.length > 0) {
      console.log('Sample message log:');
      console.log({
        id: messageLogs[0].id,
        status: messageLogs[0].status,
        phone: messageLogs[0].phone,
        sentAt: messageLogs[0].sentAt,
        deliveredAt: messageLogs[0].deliveredAt,
        campaignName: messageLogs[0].campaign?.name,
        templateName: messageLogs[0].campaign?.template?.name,
        userName: messageLogs[0].campaign?.user?.name
      });
    }
    
    // 2. Verificar diferentes status en message_logs
    console.log('\n2️⃣ CHECKING MESSAGE STATUS DISTRIBUTION...');
    
    const statusCounts = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM message_logs
      GROUP BY status
      ORDER BY count DESC
    `;
    
    console.log('Status distribution:');
    statusCounts.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
    // 3. Verificar campaigns con sus totales
    console.log('\n3️⃣ CHECKING CAMPAIGNS DATA...');
    
    const campaignsWithCounts = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.name,
        c."totalContacts",
        c."sentCount",
        c."errorCount",
        c.status as campaign_status,
        COUNT(ml.id) as actual_messages,
        COUNT(CASE WHEN ml.status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN ml.status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN ml.status = 'failed' THEN 1 END) as failed_count
      FROM campaigns c
      LEFT JOIN message_logs ml ON c.id = ml."campaignId"
      GROUP BY c.id, c.name, c."totalContacts", c."sentCount", c."errorCount", c.status
      ORDER BY c."createdAt" DESC
      LIMIT 10
    `;
    
    console.log('Campaigns with message counts:');
    campaignsWithCounts.forEach(campaign => {
      console.log(`Campaign: ${campaign.name}`);
      console.log(`  Total Contacts: ${campaign.totalContacts}`);
      console.log(`  Sent Count: ${campaign.sentCount}`);
      console.log(`  Error Count: ${campaign.errorCount}`);
      console.log(`  Actual Messages: ${campaign.actual_messages}`);
      console.log(`  Delivered: ${campaign.delivered_count}`);
      console.log(`  Sent: ${campaign.sent_count}`);
      console.log(`  Failed: ${campaign.failed_count}`);
      console.log(`  Campaign Status: ${campaign.campaign_status}`);
      console.log('  ---');
    });
    
    // 4. Test delivery rate calculation
    console.log('\n4️⃣ TESTING DELIVERY RATE CALCULATION...');
    
    const testCampaign = campaignsWithCounts[0];
    if (testCampaign) {
      const deliveryRate1 = testCampaign.totalContacts > 0 
        ? (Number(testCampaign.delivered_count) / testCampaign.totalContacts) * 100 
        : 0;
      
      const deliveryRate2 = testCampaign.actual_messages > 0 
        ? (Number(testCampaign.delivered_count) / Number(testCampaign.actual_messages)) * 100 
        : 0;
      
      const deliveryRate3 = testCampaign.sentCount > 0 
        ? (Number(testCampaign.delivered_count) / testCampaign.sentCount) * 100 
        : 0;
      
      console.log(`Test Campaign: ${testCampaign.name}`);
      console.log(`Method 1 (delivered/totalContacts): ${deliveryRate1.toFixed(2)}%`);
      console.log(`Method 2 (delivered/actual_messages): ${deliveryRate2.toFixed(2)}%`);
      console.log(`Method 3 (delivered/sentCount): ${deliveryRate3.toFixed(2)}%`);
    }
    
    // 5. Check webhook status updates
    console.log('\n5️⃣ CHECKING WEBHOOK STATUS UPDATES...');
    
    const recentMessages = await prisma.messageLog.findMany({
      where: {
        sentAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 5
    });
    
    console.log('Recent messages (last 7 days):');
    recentMessages.forEach(msg => {
      console.log(`  Phone: ${msg.phone.substring(0, 8)}***`);
      console.log(`  Status: ${msg.status}`);
      console.log(`  Sent At: ${msg.sentAt}`);
      console.log(`  Delivered At: ${msg.deliveredAt}`);
      console.log(`  Message SID: ${msg.messageSid}`);
      console.log('  ---');
    });
    
    // 6. Recommend fixes
    console.log('\n📋 RECOMMENDATIONS:');
    
    if (statusCounts.find(s => s.status === 'delivered')) {
      console.log('✅ Found delivered messages - delivery tracking is working');
    } else {
      console.log('❌ No delivered messages found - webhook may not be updating status');
      console.log('💡 Check Twilio webhook configuration');
    }
    
    const totalMessages = statusCounts.reduce((sum, s) => sum + Number(s.count), 0);
    const deliveredMessages = statusCounts.find(s => s.status === 'delivered')?.count || 0;
    const overallRate = totalMessages > 0 ? (Number(deliveredMessages) / totalMessages) * 100 : 0;
    
    console.log(`Overall delivery rate: ${overallRate.toFixed(2)}%`);
    
    if (overallRate === 0) {
      console.log('🔧 ISSUE: All messages show as "sent" but none as "delivered"');
      console.log('🔧 SOLUTION: Configure Twilio webhooks to update message status');
      console.log('🔧 URL: https://safenotify-backend.onrender.com/api/webhooks/twilio');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDeliveryRate();