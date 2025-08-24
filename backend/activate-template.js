const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function activateTemplate() {
  try {
    console.log('🔄 Activando plantilla aprobada...');
    
    // Buscar la plantilla aprobada
    const approvedTemplate = await prisma.template.findFirst({
      where: {
        status: 'approved'
      }
    });

    if (!approvedTemplate) {
      console.log('❌ No se encontró ninguna plantilla aprobada');
      
      // Vamos a aprobar y activar una plantilla pending
      const pendingTemplate = await prisma.template.findFirst({
        where: {
          status: 'pending'
        }
      });

      if (pendingTemplate) {
        const updated = await prisma.template.update({
          where: {
            id: pendingTemplate.id
          },
          data: {
            status: 'active',
            isPublic: true,
            adminReviewedBy: 'cmeox7brh0000temwpxd3z1sk', // Tu ID de admin
            adminReviewedAt: new Date(),
            adminNotes: 'Plantilla activada automáticamente para pruebas'
          }
        });

        console.log('✅ Plantilla activada exitosamente!');
        console.log('📋 Nombre:', updated.name);
        console.log('🔄 Estado:', updated.status);
        console.log('🌐 Pública:', updated.isPublic);
      } else {
        console.log('❌ No se encontraron plantillas para activar');
      }
    } else {
      // Activar la plantilla aprobada
      const updated = await prisma.template.update({
        where: {
          id: approvedTemplate.id
        },
        data: {
          status: 'active',
          isPublic: true,
          adminReviewedAt: new Date(),
          adminNotes: 'Plantilla activada automáticamente'
        }
      });

      console.log('✅ Plantilla activada exitosamente!');
      console.log('📋 Nombre:', updated.name);
      console.log('🔄 Estado:', updated.status);
      console.log('🌐 Pública:', updated.isPublic);
    }

    // Mostrar resumen final
    console.log('\n📊 Resumen de plantillas:');
    const summary = await prisma.template.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    summary.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.id} plantillas`);
    });

    const publicCount = await prisma.template.count({
      where: { isPublic: true }
    });
    console.log(`   Públicas: ${publicCount} plantillas`);

  } catch (error) {
    console.error('❌ Error activando plantilla:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

activateTemplate();