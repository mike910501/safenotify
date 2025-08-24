const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        twilioSid: true,
        status: true,
        isPublic: true,
        userId: true
      }
    });
    
    console.log('📋 All templates in database:');
    templates.forEach(t => {
      console.log(`  - ${t.name} (SID: ${t.twilioSid || 'NULL'}) - Status: ${t.status} - Public: ${t.isPublic}`);
    });
    
    console.log('\n🔍 Looking for template with SID: HX7438a469268dd438c00bd5fe0e74bd00');
    const specificTemplate = await prisma.template.findFirst({
      where: {
        twilioSid: 'HX7438a469268dd438c00bd5fe0e74bd00'
      }
    });
    console.log('Found:', specificTemplate ? 'YES' : 'NO');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkTemplates();