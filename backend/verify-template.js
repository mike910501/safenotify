const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTemplate() {
  try {
    console.log('🔍 Verificando plantilla actualizada...\n');
    
    const template = await prisma.template.findFirst({
      where: {
        name: {
          contains: 'CONFIRMACIÓN DE CITAS'
        }
      }
    });
    
    if (template) {
      console.log('✅ Plantilla encontrada:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Nombre:', template.name);
      console.log('🆔 ID:', template.id);
      console.log('🔑 Content SID:', template.twilioSid);
      console.log('📂 Categoría:', template.category);
      console.log('📝 Variables:', template.variables.join(', '));
      console.log('✔️  Estado:', template.status);
      console.log('🌍 Pública:', template.isPublic ? 'Sí' : 'No');
      console.log('🤖 Aprobada por IA:', template.aiApproved ? 'Sí' : 'No');
      console.log('📅 Última revisión:', template.adminReviewedAt);
      console.log('👤 Revisada por:', template.adminReviewedBy);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (template.twilioSid === 'HX164c5aa2918cc699bedbe253ba2bf805') {
        console.log('\n✅ ¡CONFIRMADO! El Content SID se actualizó correctamente');
      } else {
        console.log('\n⚠️ ADVERTENCIA: El Content SID no coincide con el esperado');
      }
    } else {
      console.log('❌ No se encontró la plantilla');
    }
    
  } catch (error) {
    console.error('❌ Error verificando plantilla:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
verifyTemplate();