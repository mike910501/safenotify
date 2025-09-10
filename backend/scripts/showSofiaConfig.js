const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showSofiaConfig() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'mikehuertas91@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const sofia = await prisma.userAIAgent.findFirst({
      where: {
        userId: user.id,
        name: { contains: 'sofia', mode: 'insensitive' }
      }
    });
    
    if (!sofia) {
      console.log('❌ Sofia no encontrada');
      return;
    }
    
    console.log('🤖 CONFIGURACIÓN ACTUAL DE SOFIA:');
    console.log('='.repeat(50));
    console.log('📋 INFORMACIÓN BÁSICA:');
    console.log('   ID:', sofia.id);
    console.log('   Nombre:', sofia.name);
    console.log('   Descripción:', sofia.description);
    console.log('   Rol:', sofia.role);
    console.log('   Usuario:', user.email);
    console.log('   Activo:', sofia.isActive);
    console.log('   Por defecto:', sofia.isDefault);
    
    console.log('\n🎭 PROMPTS:');
    console.log('   Personalidad:');
    console.log('     ' + (sofia.personalityPrompt || 'No configurado').substring(0, 80) + '...');
    console.log('   Negocio:');
    console.log('     ' + (sofia.businessPrompt || 'No configurado').substring(0, 80) + '...');
    console.log('   Objetivos:');
    console.log('     ' + (sofia.objectivesPrompt || 'No configurado').substring(0, 80) + '...');
    
    console.log('\n🧠 CONFIGURACIÓN AI:');
    console.log('   Modelo:', sofia.model);
    console.log('   Temperatura:', sofia.temperature);
    console.log('   Max Tokens:', sofia.maxTokensPerMessage);
    console.log('   Reasoning Effort:', sofia.reasoningEffort || 'No configurado');
    console.log('   Verbosity:', sofia.verbosity || 'No configurado');
    
    console.log('\n🛠️ CONFIGURACIÓN MCP:');
    console.log('   MCP Enabled:', sofia.mcpEnabled ? '✅' : '❌');
    console.log('   Function Calling:', sofia.useFunctionCalling ? '✅' : '❌');
    console.log('   Provider:', sofia.mcpProvider || 'No configurado');
    console.log('   Functions:', sofia.enabledFunctions?.length || 0);
    
    if (sofia.enabledFunctions?.length > 0) {
      console.log('   Enabled Functions:');
      sofia.enabledFunctions.forEach((fn, i) => {
        console.log('     ' + (i + 1) + '. ' + fn);
      });
    }
    
    console.log('\n📁 ARCHIVOS MULTIMEDIA:');
    const files = await prisma.mediaFile.findMany({
      where: { agentId: sofia.id }
    });
    
    console.log('   Total archivos:', files.length);
    files.forEach((file, i) => {
      console.log('     ' + (i + 1) + '. ' + file.fileName + ' (' + file.purpose + ')');
      console.log('        URL: ' + (file.cloudinaryUrl ? 'Cloudinary ✅' : 'Local ❌'));
      console.log('        Tags:', file.tags.join(', '));
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showSofiaConfig();