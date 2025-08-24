const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateOwnership() {
  try {
    console.log('🔧 Fixing template ownership...');

    // 1. Hacer que recordatorio_citas y confirmacion_citas sean plantillas del sistema (sin usuario)
    await prisma.template.updateMany({
      where: {
        name: {
          in: ['recordatorio_citas', 'confirmacion_citas']
        }
      },
      data: {
        userId: null, // Sin usuario = plantilla del sistema
        adminNotes: 'Plantilla genérica del sistema'
      }
    });

    console.log('✅ Updated recordatorio_citas and confirmacion_citas as system templates');

    // 2. Verificar que nueva_oferta sí sea del usuario
    const nuevaOferta = await prisma.template.findFirst({
      where: { name: 'nueva_oferta' }
    });

    if (nuevaOferta && !nuevaOferta.userId) {
      await prisma.template.update({
        where: { id: nuevaOferta.id },
        data: {
          userId: 'cmeox7brh0000temwpxd3z1sk', // Asignar a Mike
          adminNotes: 'Plantilla creada por el usuario'
        }
      });
      console.log('✅ Assigned nueva_oferta to user Mike');
    }

    // 3. Mostrar resultado final
    console.log('\n📋 Template ownership summary:');
    
    const userTemplates = await prisma.template.findMany({
      where: { 
        userId: 'cmeox7brh0000temwpxd3z1sk',
        status: 'active'
      },
      select: { name: true, twilioSid: true }
    });

    const systemTemplates = await prisma.template.findMany({
      where: { 
        userId: null,
        status: 'active',
        isPublic: true
      },
      select: { name: true, twilioSid: true }
    });

    console.log('\n👤 User templates (Mike):');
    userTemplates.forEach(t => console.log(`  - ${t.name} (${t.twilioSid})`));

    console.log('\n🏢 System templates (generic):');
    systemTemplates.forEach(t => console.log(`  - ${t.name} (${t.twilioSid})`));

    await prisma.$disconnect();
    console.log('\n🎉 Template ownership fixed!');

  } catch (error) {
    console.error('❌ Error fixing template ownership:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixTemplateOwnership();