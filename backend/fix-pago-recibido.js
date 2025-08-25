const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPagoRecibido() {
  console.log('🔧 Fixing PAGO RECIBIDO template SID...\n');

  const template = await prisma.template.findFirst({
    where: { 
      name: 'PAGO RECIBIDO',
      isPublic: true 
    }
  });

  if (template) {
    const updated = await prisma.template.update({
      where: { id: template.id },
      data: { 
        twilioSid: 'HX7d6c6ea569abce704edb224b66ce1999',
        status: 'active'
      }
    });
    
    console.log(`✅ Updated "PAGO RECIBIDO"`);
    console.log(`   Old SID: ${template.twilioSid}`);
    console.log(`   New SID: HX7d6c6ea569abce704edb224b66ce1999`);
    console.log(`   Status: active\n`);
  }

  // Show final summary
  console.log('📊 FINAL STATUS:\n');
  
  const allPublic = await prisma.template.findMany({
    where: { 
      isPublic: true,
      status: 'active'
    },
    select: {
      name: true,
      twilioSid: true,
      category: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  console.log('✅ Active Templates with REAL Twilio SIDs:\n');
  allPublic.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   Category: ${t.category}`);
    console.log(`   SID: ${t.twilioSid}\n`);
  });

  console.log(`Total active templates ready to use: ${allPublic.length}`);

  await prisma.$disconnect();
}

fixPagoRecibido().catch(console.error);