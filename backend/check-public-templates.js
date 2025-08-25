const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplates() {
  console.log('🔍 Checking all public templates in database...\n');
  
  const publicTemplates = await prisma.template.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      twilioSid: true,
      status: true,
      category: true,
      variables: true
    }
  });

  console.log(`Found ${publicTemplates.length} public templates:\n`);
  
  publicTemplates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   - ID: ${t.id}`);
    console.log(`   - Twilio SID: ${t.twilioSid || 'NOT SET'}`);
    console.log(`   - Status: ${t.status}`);
    console.log(`   - Category: ${t.category}`);
    console.log(`   - Variables: ${JSON.stringify(t.variables)}`);
    console.log('');
  });

  // Check if the Twilio SIDs are real or fake
  const fakePatterns = ['HX', 'def', 'abc', '123', '456', '789', '000'];
  const suspiciousTemplates = publicTemplates.filter(t => {
    if (!t.twilioSid) return true;
    return fakePatterns.some(pattern => t.twilioSid.includes(pattern));
  });

  if (suspiciousTemplates.length > 0) {
    console.log('⚠️  WARNING: Found templates with suspicious/fake Twilio SIDs:');
    suspiciousTemplates.forEach(t => {
      console.log(`   - ${t.name}: ${t.twilioSid || 'EMPTY'}`);
    });
    console.log('\n❌ These templates WILL NOT WORK in production!');
    console.log('You need real Twilio Content Template SIDs from your Twilio Console.');
  }

  await prisma.$disconnect();
}

checkTemplates().catch(console.error);