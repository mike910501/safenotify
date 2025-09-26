// ============================================================================
// 🚨 FORCE DEPLOY SYNC - Verificar y forzar sincronización con GitHub
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('🚨 FORCE DEPLOY SYNC SCRIPT');
console.log('=' + '='.repeat(50));

// Verificar archivos críticos MCP
const criticalFiles = [
  'backend/services/mcp/functionCallingService.js',
  'backend/services/mcp/mcpIntegrationService.js',
  'backend/services/mcp/calendarService.js',
  'backend/routes/crmWebhook.js'
];

console.log('\n📁 VERIFICANDO ARCHIVOS CRÍTICOS:');
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - EXISTE`);
  } else {
    console.log(`❌ ${file} - NO EXISTE`);
  }
});

// Verificar imports específicos
console.log('\n🔍 VERIFICANDO IMPORTS ESPECÍFICOS:');

try {
  const mcpIntegrationContent = fs.readFileSync('backend/services/mcp/mcpIntegrationService.js', 'utf8');

  if (mcpIntegrationContent.includes("require('./functionCallingService')")) {
    console.log('✅ mcpIntegrationService.js tiene import correcto: ./functionCallingService');
  } else if (mcpIntegrationContent.includes("require('./mcp/functionCallingService')")) {
    console.log('❌ mcpIntegrationService.js tiene import INCORRECTO: ./mcp/functionCallingService');
    console.log('🔧 NECESITA CORRECCIÓN');
  } else {
    console.log('⚠️ mcpIntegrationService.js - import no encontrado');
  }

} catch (error) {
  console.log('❌ Error leyendo mcpIntegrationService.js:', error.message);
}

try {
  const crmWebhookContent = fs.readFileSync('backend/routes/crmWebhook.js', 'utf8');

  if (crmWebhookContent.includes("require('../services/mcp/mcpIntegrationService')")) {
    console.log('✅ crmWebhook.js tiene import correcto: ../services/mcp/mcpIntegrationService');
  } else {
    console.log('❌ crmWebhook.js - import incorrecto o no encontrado');
  }

} catch (error) {
  console.log('❌ Error leyendo crmWebhook.js:', error.message);
}

console.log('\n🎯 RESUMEN:');
console.log('Si todos los imports están correctos pero Render falla:');
console.log('1. Problema de caché en Render');
console.log('2. Diferencia entre GitHub y local');
console.log('3. Necesario force push o commit vacío');

console.log('\n✅ VERIFICACIÓN COMPLETADA');
console.log('Timestamp: ' + new Date().toISOString());