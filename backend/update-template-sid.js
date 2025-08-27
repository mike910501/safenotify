const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplateSid() {
  try {
    console.log('🔍 Buscando plantilla CONFIRMACIÓN DE CITAS...');
    
    // Buscar la plantilla por nombre
    const templates = await prisma.template.findMany({
      where: {
        name: {
          contains: 'CONFIRMACIÓN DE CITAS'
        }
      }
    });
    
    console.log(`📋 Plantillas encontradas: ${templates.length}`);
    templates.forEach(t => {
      console.log(`  - ${t.name} (ID: ${t.id}, SID actual: ${t.twilioSid})`);
    });
    
    if (templates.length === 0) {
      console.log('❌ No se encontró ninguna plantilla con ese nombre');
      return;
    }
    
    // Actualizar el twilioSid
    const newSid = 'HX164c5aa2918cc699bedbe253ba2bf805'; // SID correcto sin subcuenta
    
    for (const template of templates) {
      console.log(`\n📝 Actualizando plantilla: ${template.name}`);
      console.log(`   SID anterior: ${template.twilioSid}`);
      console.log(`   SID nuevo: ${newSid}`);
      
      const updated = await prisma.template.update({
        where: { id: template.id },
        data: { 
          twilioSid: newSid,
          adminReviewedAt: new Date(),
          adminReviewedBy: 'system-update'
        }
      });
      
      console.log(`✅ Plantilla actualizada exitosamente`);
      console.log(`   ID: ${updated.id}`);
      console.log(`   Nombre: ${updated.name}`);
      console.log(`   Nuevo SID: ${updated.twilioSid}`);
    }
    
  } catch (error) {
    console.error('❌ Error actualizando plantilla:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
updateTemplateSid();