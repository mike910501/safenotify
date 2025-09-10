const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function transferFilesToSofia() {
  console.log('📎 TRANSFIRIENDO ARCHIVOS MULTIMEDIA A SOFIA...\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Find Sofia agent
    console.log('1️⃣ Encontrando agente Sofia...');
    
    const correctUser = await prisma.user.findFirst({
      where: { email: 'mikehuertas91@gmail.com' }
    });
    
    if (!correctUser) {
      console.log('❌ Usuario mikehuertas91@gmail.com no encontrado');
      return { success: false, error: 'Usuario correcto no encontrado' };
    }
    
    const sofia = await prisma.userAIAgent.findFirst({
      where: {
        userId: correctUser.id,
        name: {
          contains: 'sofia',
          mode: 'insensitive'
        }
      }
    });
    
    if (!sofia) {
      console.log('❌ Agente Sofia no encontrado');
      return { success: false, error: 'Sofia no encontrada' };
    }
    
    console.log('✅ Sofia encontrada:', sofia.name);
    console.log('   ID:', sofia.id);
    console.log('   Usuario:', correctUser.email);
    
    // Step 2: Find AGENTE agent and its files
    console.log('\n2️⃣ Encontrando archivos del agente AGENTE...');
    
    const wrongAgent = await prisma.userAIAgent.findFirst({
      where: { name: 'AGENTE' }
    });
    
    if (!wrongAgent) {
      console.log('❌ Agente AGENTE no encontrado');
      return { success: false, error: 'AGENTE no encontrado' };
    }
    
    console.log('✅ Agente AGENTE encontrado:', wrongAgent.id);
    
    // Find multimedia files belonging to wrong agent
    const wrongAgentFiles = await prisma.mediaFile.findMany({
      where: { agentId: wrongAgent.id }
    });
    
    console.log('📁 Archivos encontrados del agente AGENTE:', wrongAgentFiles.length);
    
    if (wrongAgentFiles.length === 0) {
      console.log('⚠️ No hay archivos para transferir');
      return { success: true, message: 'No hay archivos para transferir' };
    }
    
    // List files to transfer
    wrongAgentFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.fileName} (${file.purpose})`);
      console.log(`      📎 ${file.fileType} - ${file.fileSize} bytes`);
      console.log(`      🏷️ Tags: ${file.tags.join(', ')}`);
    });
    
    // Step 3: Transfer files to Sofia
    console.log('\n3️⃣ Transfiriendo archivos a Sofia...');
    
    let transferredCount = 0;
    const transferResults = [];
    
    for (const file of wrongAgentFiles) {
      try {
        const updatedFile = await prisma.mediaFile.update({
          where: { id: file.id },
          data: {
            userId: correctUser.id,
            agentId: sofia.id,
            // Update description to reflect Sofia
            description: file.description?.replace(/AGENTE/gi, 'Sofia') || file.description
          }
        });
        
        transferResults.push({
          id: updatedFile.id,
          fileName: updatedFile.fileName,
          purpose: updatedFile.purpose,
          success: true
        });
        
        transferredCount++;
        console.log(`   ✅ ${file.fileName} transferido exitosamente`);
        
      } catch (error) {
        console.log(`   ❌ Error transfiriendo ${file.fileName}:`, error.message);
        transferResults.push({
          id: file.id,
          fileName: file.fileName,
          purpose: file.purpose,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`\n📊 Transferencia completada: ${transferredCount}/${wrongAgentFiles.length} archivos`);
    
    // Step 4: Verify files are now with Sofia
    console.log('\n4️⃣ Verificando archivos de Sofia...');
    
    const sofiaFiles = await prisma.mediaFile.findMany({
      where: { agentId: sofia.id }
    });
    
    console.log(`📁 Sofia ahora tiene ${sofiaFiles.length} archivos:`);
    sofiaFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.fileName} (${file.purpose})`);
      console.log(`      🌍 URL: ${file.cloudinaryUrl ? 'Cloudinary ✅' : 'Sin URL ❌'}`);
      console.log(`      🏷️ Tags: ${file.tags.join(', ')}`);
    });
    
    // Step 5: Group files by purpose for summary
    const filesByPurpose = {};
    sofiaFiles.forEach(file => {
      if (!filesByPurpose[file.purpose]) {
        filesByPurpose[file.purpose] = 0;
      }
      filesByPurpose[file.purpose]++;
    });
    
    console.log('\n📊 Archivos por tipo:');
    Object.entries(filesByPurpose).forEach(([purpose, count]) => {
      console.log(`   ${purpose}: ${count} archivo(s)`);
    });
    
    // Step 6: Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ARCHIVOS TRANSFERIDOS A SOFIA EXITOSAMENTE!');
    
    console.log('\n✅ RESUMEN DE TRANSFERENCIA:');
    console.log('   📁 Archivos transferidos:', transferredCount);
    console.log('   🤖 Agente destino: Sofia');
    console.log('   👤 Usuario destino:', correctUser.email);
    console.log('   🎯 Total archivos de Sofia:', sofiaFiles.length);
    
    console.log('\n🚀 SOFIA AHORA TIENE ACCESO A:');
    console.log('   📋 Menús automáticos');
    console.log('   📦 Catálogos de productos');
    console.log('   💰 Listas de precios');
    console.log('   📎 Multimedia para envío automático');
    
    console.log('\n💬 SOFIA PUEDE RESPONDER A:');
    console.log('   • "¿Tienen menú?"');
    console.log('   • "Muéstrame sus productos"');
    console.log('   • "¿Cuáles son sus precios?"');
    console.log('   • "¿Qué servicios ofrecen?"');
    
    return {
      success: true,
      transferredFiles: transferredCount,
      totalFilesForSofia: sofiaFiles.length,
      filesByPurpose: filesByPurpose,
      transferResults: transferResults
    };
    
  } catch (error) {
    console.error('❌ Error en transferencia:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

transferFilesToSofia().catch(console.error);