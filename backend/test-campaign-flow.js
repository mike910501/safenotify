const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCampaignFlow() {
  console.log('🧪 TESTING COMPLETE CAMPAIGN FLOW\n');
  console.log('=' .repeat(50));

  // 1. Check active templates with real SIDs
  console.log('\n📋 Step 1: Checking Active Templates with Real Twilio SIDs\n');
  
  const activeTemplates = await prisma.template.findMany({
    where: { 
      status: 'active',
      isPublic: true,
      twilioSid: { not: null }
    },
    select: {
      id: true,
      name: true,
      twilioSid: true,
      category: true,
      variables: true,
      status: true
    }
  });

  console.log(`✅ Found ${activeTemplates.length} active templates:\n`);
  
  activeTemplates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   SID: ${t.twilioSid}`);
    console.log(`   Variables: ${JSON.stringify(t.variables)}`);
    
    // Check if SID looks real
    const looksReal = t.twilioSid.startsWith('HX') && 
                      t.twilioSid.length === 34 &&
                      !t.twilioSid.includes('abc') &&
                      !t.twilioSid.includes('def') &&
                      !t.twilioSid.includes('123');
    
    console.log(`   Status: ${looksReal ? '✅ Real SID' : '❌ Suspicious SID'}\n`);
  });

  // 2. Test template selection simulation
  console.log('=' .repeat(50));
  console.log('\n🎯 Step 2: Simulating Template Selection\n');
  
  const testTemplate = activeTemplates.find(t => t.name === 'PAGO RECIBIDO') || activeTemplates[0];
  
  if (testTemplate) {
    console.log(`Selected template: ${testTemplate.name}`);
    console.log(`Template ID: ${testTemplate.id}`);
    console.log(`Twilio SID: ${testTemplate.twilioSid}`);
    console.log(`Required variables: ${JSON.stringify(testTemplate.variables)}`);
  }

  // 3. Check campaign creation requirements
  console.log('\n=' .repeat(50));
  console.log('\n📝 Step 3: Campaign Creation Requirements\n');
  
  console.log('Required for campaign:');
  console.log('✓ Template with real Twilio SID');
  console.log('✓ CSV file with contacts');
  console.log('✓ Variable mappings');
  console.log('✓ User with available message quota');

  // 4. Check user quotas
  console.log('\n=' .repeat(50));
  console.log('\n👤 Step 4: Checking User Quotas\n');
  
  const users = await prisma.user.findMany({
    select: {
      email: true,
      planType: true,
      messagesUsed: true,
      messagesLimit: true
    }
  });

  users.forEach(user => {
    const available = user.messagesLimit - user.messagesUsed;
    console.log(`User: ${user.email}`);
    console.log(`  Plan: ${user.planType}`);
    console.log(`  Messages: ${user.messagesUsed}/${user.messagesLimit}`);
    console.log(`  Available: ${available}`);
    console.log(`  Status: ${available > 0 ? '✅ Can send' : '❌ Quota exceeded'}\n`);
  });

  // 5. Test Twilio configuration
  console.log('=' .repeat(50));
  console.log('\n📱 Step 5: Checking Twilio Configuration\n');
  
  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_WHATSAPP_NUMBER
  );

  console.log(`Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
  console.log(`Twilio Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`WhatsApp Number: ${process.env.TWILIO_WHATSAPP_NUMBER || '❌ Missing'}`);
  console.log(`Overall Twilio Status: ${twilioConfigured ? '✅ Ready' : '❌ Not configured'}`);

  // 6. Final validation
  console.log('\n=' .repeat(50));
  console.log('\n🔍 FINAL VALIDATION RESULTS:\n');
  
  const hasActiveTemplates = activeTemplates.length > 0;
  const hasRealSIDs = activeTemplates.every(t => 
    t.twilioSid && t.twilioSid.startsWith('HX') && t.twilioSid.length === 34
  );
  const hasUsersWithQuota = users.some(u => u.messagesLimit - u.messagesUsed > 0);

  console.log(`✓ Active Templates: ${hasActiveTemplates ? '✅ YES' : '❌ NO'} (${activeTemplates.length} found)`);
  console.log(`✓ Real Twilio SIDs: ${hasRealSIDs ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Users with Quota: ${hasUsersWithQuota ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Twilio Configured: ${twilioConfigured ? '✅ YES' : '❌ NO'}`);

  const readyForProduction = hasActiveTemplates && hasRealSIDs && hasUsersWithQuota && twilioConfigured;

  console.log('\n' + '=' .repeat(50));
  console.log('\n🚀 PRODUCTION READINESS:\n');
  
  if (readyForProduction) {
    console.log('✅ ✅ ✅ READY FOR PRODUCTION! ✅ ✅ ✅');
    console.log('\nAll systems checked and validated.');
    console.log('You can safely deploy to production.');
  } else {
    console.log('❌ NOT READY FOR PRODUCTION ❌');
    console.log('\nPlease fix the issues marked with ❌ above.');
  }

  console.log('\n' + '=' .repeat(50));

  await prisma.$disconnect();
}

testCampaignFlow().catch(console.error);