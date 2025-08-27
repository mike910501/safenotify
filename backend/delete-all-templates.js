const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllTemplates() {
  try {
    console.log('🗑️  Iniciando eliminación de todas las plantillas...');
    
    // First, delete all campaigns that use templates
    const campaignCount = await prisma.campaign.deleteMany({});
    console.log(`✅ ${campaignCount.count} campañas eliminadas`);
    
    // Then delete all templates
    const templateCount = await prisma.template.deleteMany({});
    console.log(`✅ ${templateCount.count} plantillas eliminadas`);
    
    console.log('🎯 Todas las plantillas han sido eliminadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error eliminando plantillas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteAllTemplates();