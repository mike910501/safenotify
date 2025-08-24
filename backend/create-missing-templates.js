const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingTemplates() {
  try {
    console.log('📋 Creating missing templates...');

    // 1. recordatorio_citas
    const recordatorioTemplate = await prisma.template.create({
      data: {
        name: 'recordatorio_citas',
        content: 'Recordatorio de cita para {{nombre}} el {{fecha}} a las {{hora}} en {{ubicacion}}. {{negocio}}',
        variables: ['nombre', 'fecha', 'hora', 'ubicacion', 'negocio'],
        status: 'active',
        isPublic: true,
        user: {
          connect: { id: 'cmeox7brh0000temwpxd3z1sk' }
        },
        twilioSid: 'HX75c882c4b3bc3b2b4874cb137b733010',
        twilioTemplateId: 'recordatorio_citas',
        category: 'appointments',
        aiApproved: true,
        adminNotes: 'Template creado manualmente - recordatorio de citas'
      }
    });

    console.log('✅ Created recordatorio_citas template:', recordatorioTemplate.id);

    // 2. confirmacion_citas  
    const confirmacionTemplate = await prisma.template.create({
      data: {
        name: 'confirmacion_citas',
        content: 'Confirmación de cita para {{nombre}} el {{fecha}} a las {{hora}} en {{ubicacion}}. {{negocio}} - {{servicio}}',
        variables: ['nombre', 'fecha', 'hora', 'ubicacion', 'negocio', 'servicio'],
        status: 'active',
        isPublic: true,
        user: {
          connect: { id: 'cmeox7brh0000temwpxd3z1sk' }
        },
        twilioSid: 'HX7438a469268dd438c00bd5fe0e74bd00',
        twilioTemplateId: 'confirmacion_citas',
        category: 'appointments',
        aiApproved: true,
        adminNotes: 'Template creado manualmente - confirmación de citas'
      }
    });

    console.log('✅ Created confirmacion_citas template:', confirmacionTemplate.id);

    console.log('\n📋 All templates now available:');
    const allTemplates = await prisma.template.findMany({
      where: { status: 'active', isPublic: true },
      select: {
        name: true,
        twilioSid: true,
        variables: true
      }
    });

    allTemplates.forEach(template => {
      console.log(`  - ${template.name} (SID: ${template.twilioSid}) - Variables: ${JSON.stringify(template.variables)}`);
    });

    await prisma.$disconnect();
    console.log('\n🎉 All templates created successfully!');

  } catch (error) {
    console.error('❌ Error creating templates:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createMissingTemplates();