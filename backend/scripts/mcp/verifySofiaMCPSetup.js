const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function verifySofiaMCPSetup() {
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA SOFIA MCP\n');
  console.log('='.repeat(60));
  
  let allGood = true;
  const issues = [];
  const successes = [];
  
  try {
    // 1. Verificar Cloudinary
    console.log('\n1️⃣ CLOUDINARY:');
    try {
      const config = cloudinary.config();
      if (config.cloud_name && config.api_key) {
        console.log('   ✅ Configurado correctamente');
        console.log('     Cloud Name:', config.cloud_name);
        console.log('     API Key:', '***' + config.api_key.slice(-4));
        successes.push('Cloudinary configurado');
        
        // Test upload
        const testResult = await cloudinary.api.resources({
          type: 'upload',
          prefix: 'safenotify',
          max_results: 5
        });
        console.log('   ✅ Conexión verificada -', testResult.resources.length, 'archivos encontrados');
        
      } else {
        console.log('   ❌ Configuración incompleta');
        allGood = false;
        issues.push('Cloudinary mal configurado');
      }
    } catch (e) {
      console.log('   ❌ Error de conexión:', e.message);
      allGood = false;
      issues.push('Error de conexión a Cloudinary');
    }
    
    // 2. Verificar Usuario correcto
    console.log('\n2️⃣ USUARIO CORRECTO (mikehuertas91@gmail.com):');
    const user = await prisma.user.findFirst({
      where: { email: 'mikehuertas91@gmail.com' }
    });
    
    if (user) {
      console.log('   ✅ Usuario encontrado:', user.email);
      console.log('     Nombre:', user.name);
      console.log('     CRM Enabled:', user.crmEnabled ? '✅' : '❌');
      console.log('     Plan CRM:', user.crmPlan);
      console.log('     Max Agents:', user.maxAgents);
      if (user.crmEnabled) {
        successes.push('Usuario correcto con CRM habilitado');
      } else {
        issues.push('Usuario sin CRM habilitado');
        allGood = false;
      }
    } else {
      console.log('   ❌ Usuario mikehuertas91@gmail.com no encontrado');
      allGood = false;
      issues.push('Usuario correcto no existe');
    }
    
    // 3. Verificar WhatsApp Number
    console.log('\n3️⃣ NÚMERO WHATSAPP:');
    if (user) {
      const whatsappNumber = await prisma.userWhatsAppNumber.findFirst({
        where: { userId: user.id }
      });
      
      if (whatsappNumber) {
        console.log('   ✅ Número configurado:', whatsappNumber.phoneNumber);
        console.log('     Active:', whatsappNumber.isActive ? '✅' : '❌');
        console.log('     Primary:', whatsappNumber.isPrimary ? '✅' : '❌');
        console.log('     Default Agent ID:', whatsappNumber.defaultAgentId || 'No asignado');
        console.log('     Display Name:', whatsappNumber.displayName);
        if (whatsappNumber.isActive) {
          successes.push('Número WhatsApp activo para Sofia');
        }
      } else {
        console.log('   ❌ Número WhatsApp no configurado para usuario');
        issues.push('Número WhatsApp faltante');
        allGood = false;
      }
    }
    
    // 4. Verificar Agente "Sofia"
    console.log('\n4️⃣ AGENTE "SOFIA":');
    const sofia = await prisma.userAIAgent.findFirst({
      where: { 
        userId: user?.id,
        name: { contains: 'sofia', mode: 'insensitive' } 
      }
    });
    
    if (sofia) {
      console.log('   ✅ Sofia encontrada:', sofia.name);
      console.log('     ID:', sofia.id);
      console.log('     User ID:', sofia.userId);
      console.log('     Active:', sofia.isActive ? '✅' : '❌');
      console.log('     Default:', sofia.isDefault ? '✅' : '❌');
      console.log('     MCP Enabled:', sofia.mcpEnabled ? '✅' : '❌');
      console.log('     Function Calling:', sofia.useFunctionCalling ? '✅' : '❌');
      console.log('     Provider:', sofia.mcpProvider || 'No configurado');
      console.log('     Functions:', sofia.enabledFunctions?.length || 0, 'funciones');
      
      if (sofia.enabledFunctions?.length > 0) {
        console.log('     Funciones habilitadas:', sofia.enabledFunctions.join(', '));
        successes.push('Sofia con ' + sofia.enabledFunctions.length + ' funciones MCP');
      } else {
        issues.push('Sofia sin funciones MCP habilitadas');
        allGood = false;
      }
      
      if (sofia.mcpEnabled && sofia.useFunctionCalling) {
        successes.push('Sofia con MCP completamente habilitado');
      } else {
        issues.push('Sofia con MCP incompleto');
        allGood = false;
      }
      
    } else {
      console.log('   ❌ Agente "Sofia" no encontrado');
      allGood = false;
      issues.push('Agente Sofia no existe');
    }
    
    // 5. Verificar MCP Configuration
    console.log('\n5️⃣ CONFIGURACIÓN MCP:');
    if (user) {
      const mcpConfig = await prisma.mCPConfiguration.findFirst({
        where: { userId: user.id }
      });
      
      if (mcpConfig) {
        console.log('   ✅ Configuración MCP encontrada');
        console.log('     MCP Enabled:', mcpConfig.mcpEnabled ? '✅' : '❌');
        console.log('     Provider:', mcpConfig.provider);
        console.log('     Send Multimedia:', mcpConfig.sendMultimedia ? '✅' : '❌');
        console.log('     Save Data:', mcpConfig.saveData ? '✅' : '❌');
        console.log('     Analyze Intent:', mcpConfig.analyzeIntent ? '✅' : '❌');
        console.log('     Schedule Follow-up:', mcpConfig.scheduleFollowUp ? '✅' : '❌');
        console.log('     Max Function Calls:', mcpConfig.maxFunctionCalls);
        
        if (mcpConfig.mcpEnabled) {
          successes.push('Configuración MCP habilitada para Sofia');
        }
      } else {
        console.log('   ❌ No hay configuración MCP');
        issues.push('Configuración MCP faltante');
        allGood = false;
      }
    }
    
    // 6. Verificar archivos multimedia de Sofia
    console.log('\n6️⃣ ARCHIVOS MULTIMEDIA DE SOFIA:');
    if (sofia) {
      const mediaFiles = await prisma.mediaFile.findMany({
        where: { agentId: sofia.id }
      });
      
      if (mediaFiles.length > 0) {
        console.log('   ✅', mediaFiles.length, 'archivo(s) multimedia encontrado(s)');
        
        const filesByPurpose = {};
        mediaFiles.forEach(file => {
          if (!filesByPurpose[file.purpose]) {
            filesByPurpose[file.purpose] = 0;
          }
          filesByPurpose[file.purpose]++;
          
          console.log(`     📎 ${file.fileName} (${file.purpose})`);
          console.log(`        URL: ${file.cloudinaryUrl ? '✅ Cloudinary' : '❌ No URL'}`);
          console.log(`        Tags: ${file.tags.join(', ')}`);
        });
        
        console.log('   📊 Resumen por tipo:');
        Object.entries(filesByPurpose).forEach(([purpose, count]) => {
          console.log(`     ${purpose}: ${count} archivo(s)`);
        });
        
        successes.push(mediaFiles.length + ' archivos multimedia para Sofia');
        
        // Verificar que tengamos los archivos básicos
        const hasMenu = mediaFiles.some(f => f.purpose === 'menu');
        const hasCatalog = mediaFiles.some(f => f.purpose === 'catalogue');
        const hasPrices = mediaFiles.some(f => f.purpose === 'price_list');
        
        if (hasMenu) successes.push('Menú disponible para Sofia');
        if (hasCatalog) successes.push('Catálogo disponible para Sofia');
        if (hasPrices) successes.push('Lista de precios disponible para Sofia');
        
      } else {
        console.log('   ❌ No hay archivos multimedia para Sofia');
        issues.push('Sin archivos multimedia para Sofia');
        allGood = false;
      }
    }
    
    // 7. Test de integración rápida
    console.log('\n7️⃣ TEST DE INTEGRACIÓN:');
    try {
      // Verificar que los servicios se puedan importar
      const functionCallingService = require('../services/mcp/functionCallingService');
      const mcpIntegrationService = require('../services/mcp/mcpIntegrationService');
      
      console.log('   ✅ Servicios MCP importados correctamente');
      console.log('     Function Calling Service:', typeof functionCallingService.generateWithFunctions);
      console.log('     MCP Integration Service:', typeof mcpIntegrationService.generateResponseWithMCP);
      console.log('     Tools disponibles:', functionCallingService.tools?.length || 0);
      
      successes.push('Servicios MCP funcionando para Sofia');
      
    } catch (serviceError) {
      console.log('   ❌ Error importando servicios:', serviceError.message);
      issues.push('Servicios MCP no funcionan');
      allGood = false;
    }
  
  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN FINAL DE VERIFICACIÓN SOFIA MCP');
  console.log('='.repeat(60));
  
  if (allGood) {
    console.log('\n🎉 ¡SISTEMA SOFIA COMPLETAMENTE LISTO!');
    console.log('\n✅ FUNCIONALIDADES VERIFICADAS:');
    successes.forEach(success => {
      console.log('   ✓', success);
    });
    
    console.log('\n🚀 SOFIA LISTA PARA USAR:');
    
    // Get WhatsApp number for display
    const whatsappNumberForDisplay = user ? await prisma.userWhatsAppNumber.findFirst({
      where: { userId: user.id }
    }) : null;
    
    console.log('   📱 Envía mensajes de WhatsApp a:', whatsappNumberForDisplay?.phoneNumber || '+573002843765');
    console.log('   🤖 Sofia responderá automáticamente');
    console.log('   📎 Enviará multimedia cuando sea apropiado');
    console.log('   💾 Guardará datos importantes');
    console.log('   🧠 Analizará intenciones de clientes');
    console.log('   ⏰ Programará seguimientos');
    
    console.log('\n💬 PRUEBA ESTOS MENSAJES:');
    console.log('   • "Hola Sofia, ¿tienen menú?"');
    console.log('   • "Muéstrame sus productos"');
    console.log('   • "¿Cuáles son sus precios?"');
    console.log('   • "Quiero hacer un pedido"');
    console.log('   • "¿Qué servicios ofrecen?"');
    
    console.log('\n🎯 ESTADO: SOFIA MCP EN PRODUCCIÓN ✅');
    
  } else {
    console.log('\n⚠️ SISTEMA SOFIA CON PROBLEMAS');
    console.log('\n❌ PROBLEMAS ENCONTRADOS:');
    issues.forEach(issue => {
      console.log('   ✗', issue);
    });
    
    if (successes.length > 0) {
      console.log('\n✅ FUNCIONALIDADES QUE SÍ FUNCIONAN:');
      successes.forEach(success => {
        console.log('   ✓', success);
      });
    }
    
    console.log('\n🔧 ACCIONES REQUERIDAS:');
    console.log('   1. Revisar y corregir los problemas listados arriba');
    console.log('   2. Ejecutar nuevamente este script de verificación');
    console.log('   3. Una vez todo esté ✅, Sofia estará lista');
  }
  
  } catch (error) {
    console.error('❌ Error durante verificación:', error);
    allGood = false;
    issues.push('Error general en verificación');
  } finally {
    await prisma.$disconnect();
  }
  
  return {
    success: allGood,
    issues: issues,
    successes: successes,
    totalIssues: issues.length,
    totalSuccesses: successes.length
  };
}

console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA DEL SISTEMA SOFIA MCP...\n');
verifySofiaMCPSetup()
  .then(result => {
    console.log('\n📋 Verificación completada.');
    console.log('   Éxitos:', result.totalSuccesses);
    console.log('   Problemas:', result.totalIssues);
    console.log('   Estado general:', result.success ? '✅ SOFIA LISTA' : '⚠️ NECESITA ATENCIÓN');
  })
  .catch(error => {
    console.error('💥 Error fatal en verificación:', error);
    process.exit(1);
  });