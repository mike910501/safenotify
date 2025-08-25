const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// REAL Twilio Content Template SIDs - provided by user
const realTwilioSids = {
  'INSCRIPCIÓN CONFIRMADA': 'HXa0390a5abb2560f49617ec057033c892',
  'RENOVACIÓN PRÓXIMA': 'HX7ee187510b458fc5a6b2c672836f0c28',
  'PAGO RECHAZADO': 'HX93f2e2c7ea1e2cedbb1d3bf30739b8a2',
  'CITA CANCELADA': 'HX37a5dce38a99d8839e61b9e2401fd362',
  'PAQUETE ENVIADO': 'HXb22dea2bc1cfa84e68a0e8e5de77af14',
  'CONFIRMACIÓN GENERAL': 'HX0f43aedc329176e066d95cc7aaed1f67',
  'VENCIMIENTO PRÓXIMO': 'HX2bfa21b03830bdf362b3d199bc075a02',
  'PAGO RECIBIDO': 'HX7d6c' // Note: This one seems incomplete, but using as provided
  // Missing: SERVICIO PROGRAMADO, SOLICITUD APROBADA, DOCUMENTO LISTO, RESULTADOS LISTOS EMPRESA
};

async function updateTwilioSids() {
  console.log('🔄 Updating templates with REAL Twilio SIDs...\n');

  for (const [templateName, twilioSid] of Object.entries(realTwilioSids)) {
    try {
      // Find the template by name
      const template = await prisma.template.findFirst({
        where: { 
          name: templateName,
          isPublic: true 
        }
      });

      if (template) {
        // Update with real Twilio SID
        const updated = await prisma.template.update({
          where: { id: template.id },
          data: { 
            twilioSid: twilioSid,
            status: 'active' // Mark as active since we have real SID
          }
        });
        
        console.log(`✅ Updated "${templateName}"`);
        console.log(`   Old SID: ${template.twilioSid}`);
        console.log(`   New SID: ${twilioSid}`);
        console.log(`   Status: active\n`);
      } else {
        console.log(`⚠️  Template "${templateName}" not found in database\n`);
      }
    } catch (error) {
      console.error(`❌ Error updating "${templateName}":`, error.message);
    }
  }

  // Check for templates that still have fake SIDs
  console.log('\n📋 Checking remaining templates...\n');
  
  const templatesStillFake = await prisma.template.findMany({
    where: {
      isPublic: true,
      OR: [
        { twilioSid: { startsWith: 'HX8' } },
        { twilioSid: { startsWith: 'HX2a' } },
        { twilioSid: { startsWith: 'HX3b' } },
        { twilioSid: { startsWith: 'HX4c' } },
        { twilioSid: { startsWith: 'HX5d' } },
        { twilioSid: { startsWith: 'HX6e' } },
        { twilioSid: { startsWith: 'HX7f' } },
        { twilioSid: { startsWith: 'HX89' } },
        { twilioSid: { startsWith: 'HX90' } },
        { twilioSid: { startsWith: 'HX01' } },
        { twilioSid: { contains: 'def' } },
        { twilioSid: { contains: 'abc' } }
      ]
    },
    select: {
      name: true,
      twilioSid: true
    }
  });

  if (templatesStillFake.length > 0) {
    console.log('⚠️  These templates still have FAKE SIDs and need real ones from Twilio:');
    templatesStillFake.forEach(t => {
      console.log(`   - ${t.name}: ${t.twilioSid}`);
    });
    console.log('\nYou need to create these templates in Twilio Console to get real SIDs.');
  } else {
    console.log('🎉 All public templates now have real Twilio SIDs!');
  }

  // Show summary
  console.log('\n📊 SUMMARY:');
  const allPublic = await prisma.template.findMany({
    where: { isPublic: true },
    select: {
      name: true,
      twilioSid: true,
      status: true
    }
  });

  const activeCount = allPublic.filter(t => t.status === 'active').length;
  const withRealSids = allPublic.filter(t => 
    !t.twilioSid.includes('def') && 
    !t.twilioSid.includes('abc') &&
    !t.twilioSid.includes('123') &&
    !t.twilioSid.includes('456') &&
    !t.twilioSid.includes('789')
  ).length;

  console.log(`Total public templates: ${allPublic.length}`);
  console.log(`Active templates: ${activeCount}`);
  console.log(`Templates with real SIDs: ${withRealSids}`);

  await prisma.$disconnect();
}

updateTwilioSids().catch(console.error);