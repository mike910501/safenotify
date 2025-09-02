const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSofiaLeads() {
  console.log('🔍 CHECKING SOFIA LEADS IN DATABASE\n');
  
  try {
    // Check total leads
    const totalLeads = await prisma.safeNotifyLead.count();
    console.log(`📊 Total SafeNotify Leads: ${totalLeads}`);
    
    if (totalLeads === 0) {
      console.log('❌ NO LEADS FOUND - That\'s why the admin panel is empty!');
      console.log('\nTo see data in admin panel, you need to:');
      console.log('1. Have someone chat with Sofia via WhatsApp');
      console.log('2. Sofia will create leads automatically');
      console.log('3. Then the admin panel will show the data');
      return;
    }
    
    // Get recent leads
    const leads = await prisma.safeNotifyLead.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    console.log(`\n📋 Recent ${leads.length} leads:`);
    
    leads.forEach((lead, index) => {
      console.log(`\n${index + 1}. Lead ID: ${lead.id}`);
      console.log(`   Phone: ${lead.phone}`);
      console.log(`   Name: ${lead.name || 'Sin nombre'}`);
      console.log(`   Email: ${lead.email || 'Sin email'}`);
      console.log(`   Specialty: ${lead.specialty || 'No identificada'}`);
      console.log(`   Grade: ${lead.grade}`);
      console.log(`   Score: ${lead.qualificationScore}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Conversations: ${lead.conversations.length}`);
      console.log(`   Created: ${lead.createdAt}`);
      console.log(`   Last Activity: ${lead.lastActivity || 'None'}`);
    });
    
    // Check conversations
    const totalConversations = await prisma.safeNotifyConversation.count();
    console.log(`\n💬 Total Conversations: ${totalConversations}`);
    
    if (totalConversations > 0) {
      const recentConversations = await prisma.safeNotifyConversation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: {
              phone: true,
              name: true
            }
          }
        }
      });
      
      console.log(`\n🗣️ Recent conversations:`);
      recentConversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. Conversation ID: ${conv.id}`);
        console.log(`   Lead: ${conv.lead?.name || 'Unknown'} (${conv.lead?.phone})`);
        console.log(`   Messages: ${conv.messageCount || 0}`);
        console.log(`   Step: ${conv.currentStep}`);
        console.log(`   Active: ${conv.isActive}`);
        console.log(`   Created: ${conv.createdAt}`);
      });
    }
    
    // Test admin endpoint simulation
    console.log(`\n🔧 ADMIN ENDPOINT SIMULATION:`);
    console.log(`The admin panel calls: /api/admin/sofia/conversations`);
    console.log(`This should return ${totalLeads} leads in the interface`);
    
    if (totalLeads > 0) {
      console.log('\n✅ Data exists - admin panel should show leads!');
      console.log('If admin panel is empty, check:');
      console.log('1. Admin authentication token');
      console.log('2. Admin role permissions');  
      console.log('3. Network/CORS issues');
      console.log('4. Browser console for errors');
    }
    
  } catch (error) {
    console.error('❌ Error checking Sofia leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSofiaLeads().catch(console.error);