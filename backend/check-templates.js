const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    console.log('🔍 Revisando plantillas en la base de datos...\n');
    
    // Ver todas las plantillas
    const allTemplates = await prisma.template.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    console.log(`📊 Total de plantillas: ${allTemplates.length}\n`);

    if (allTemplates.length === 0) {
      console.log('❌ No hay plantillas en la base de datos');
      console.log('💡 Esto podría explicar por qué no se cargan las plantillas\n');
    } else {
      console.log('📋 Plantillas encontradas:');
      allTemplates.forEach((template, index) => {
        console.log(`\n${index + 1}. ${template.name}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Estado: ${template.status}`);
        console.log(`   Público: ${template.isPublic ? 'Sí' : 'No'}`);
        console.log(`   Categoría: ${template.category}`);
        console.log(`   Variables: [${template.variables.join(', ')}]`);
        console.log(`   Creado por: ${template.user ? template.user.email : 'Sistema'}`);
        console.log(`   Aprobado por IA: ${template.aiApproved ? 'Sí' : 'No'}`);
        console.log(`   Twilio SID: ${template.twilioSid || 'No configurado'}`);
        console.log(`   Usos: ${template.usageCount}`);
        console.log(`   Creado: ${template.createdAt.toISOString()}`);
      });
    }

    // Ver estadísticas por estado
    console.log('\n📊 Estadísticas por estado:');
    const statusStats = await prisma.template.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    statusStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.id} plantillas`);
    });

    // Ver plantillas públicas vs privadas
    console.log('\n📊 Plantillas públicas vs privadas:');
    const publicCount = await prisma.template.count({
      where: { isPublic: true }
    });
    const privateCount = await prisma.template.count({
      where: { isPublic: false }
    });

    console.log(`   Públicas: ${publicCount}`);
    console.log(`   Privadas: ${privateCount}`);

  } catch (error) {
    console.error('❌ Error consultando plantillas:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();