const fs = require('fs');
const path = require('path');

const updates = [
  {
    old: '../services/mcp/functionCallingService',
    new: '../services/mcp/functionCallingService'
  },
  {
    old: './mcp/functionCallingService',
    new: './mcp/functionCallingService'
  },
  {
    old: '../services/mcp/mcpIntegrationService',
    new: '../services/mcp/mcpIntegrationService'
  },
  {
    old: './mcp/mcpIntegrationService',
    new: './mcp/mcpIntegrationService'
  },
  {
    old: '../services/mcp/calendarService',
    new: '../services/mcp/calendarService'
  },
  {
    old: './mcp/calendarService',
    new: './mcp/calendarService'
  },
  {
    old: '../services/integrations/openaiService',
    new: '../services/integrations/openaiService'
  },
  {
    old: './integrations/openaiService',
    new: './integrations/openaiService'
  },
  {
    old: '../services/integrations/twilioMessagingService',
    new: '../services/integrations/twilioMessagingService'
  },
  {
    old: './integrations/twilioMessagingService',
    new: './integrations/twilioMessagingService'
  },
  {
    old: '../services/integrations/notificationService',
    new: '../services/integrations/notificationService'
  },
  {
    old: './integrations/notificationService',
    new: './integrations/notificationService'
  },
  {
    old: '../services/crm/conversationManagementService',
    new: '../services/crm/conversationManagementService'
  },
  {
    old: './crm/conversationManagementService',
    new: './crm/conversationManagementService'
  },
  {
    old: '../services/crm/conversationEventsService',
    new: '../services/crm/conversationEventsService'
  },
  {
    old: './crm/conversationEventsService',
    new: './crm/conversationEventsService'
  },
  {
    old: '../services/crm/conversationMetricsService',
    new: '../services/crm/conversationMetricsService'
  },
  {
    old: './crm/conversationMetricsService',
    new: './crm/conversationMetricsService'
  },
  {
    old: '../services/crm/humanTakeoverService',
    new: '../services/crm/humanTakeoverService'
  },
  {
    old: './crm/humanTakeoverService',
    new: './crm/humanTakeoverService'
  },
  {
    old: '../services/crm/collaborationMetricsService',
    new: '../services/crm/collaborationMetricsService'
  },
  {
    old: './crm/collaborationMetricsService',
    new: './crm/collaborationMetricsService'
  }
];

let totalFilesUpdated = 0;
let totalUpdatesApplied = 0;

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    let updatesInFile = 0;

    updates.forEach(update => {
      const regex = new RegExp(update.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, update.new);
        updated = true;
        updatesInFile += matches.length;
        console.log(`   📝 ${update.old} → ${update.new} (${matches.length} occurrences)`);
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated imports in ${filePath} (${updatesInFile} updates)`);
      totalFilesUpdated++;
      totalUpdatesApplied += updatesInFile;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function findAndUpdateFiles(dir, basePath = '') {
  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(basePath, file);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() &&
            !file.includes('node_modules') &&
            !file.includes('.next') &&
            !file.includes('.git') &&
            !file.includes('uploads')) {
          findAndUpdateFiles(filePath, relativePath);
        } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          updateImportsInFile(filePath);
        }
      } catch (statError) {
        console.warn(`⚠️ Could not stat ${filePath}:`, statError.message);
      }
    });
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error.message);
  }
}

console.log('🔄 ACTUALIZANDO IMPORTS DESPUÉS DE REORGANIZACIÓN MCP...\n');
console.log('=' + '='.repeat(60));

// Actualizar backend
console.log('\n📁 ACTUALIZANDO IMPORTS EN BACKEND...');
findAndUpdateFiles('./backend');

// Actualizar app/frontend
console.log('\n📁 ACTUALIZANDO IMPORTS EN APP/FRONTEND...');
if (fs.existsSync('./app')) {
  findAndUpdateFiles('./app');
}

// Actualizar components si existe
console.log('\n📁 ACTUALIZANDO IMPORTS EN COMPONENTS...');
if (fs.existsSync('./components')) {
  findAndUpdateFiles('./components');
}

// Actualizar lib si existe
console.log('\n📁 ACTUALIZANDO IMPORTS EN LIB...');
if (fs.existsSync('./lib')) {
  findAndUpdateFiles('./lib');
}

console.log('\n' + '=' + '='.repeat(60));
console.log('✅ ACTUALIZACIÓN DE IMPORTS COMPLETADA');
console.log(`📊 ESTADÍSTICAS:`);
console.log(`   Archivos modificados: ${totalFilesUpdated}`);
console.log(`   Total de imports actualizados: ${totalUpdatesApplied}`);

if (totalFilesUpdated === 0) {
  console.log('ℹ️  No se encontraron imports que necesiten actualización');
} else {
  console.log('🎉 Imports actualizados exitosamente para nueva estructura MCP');
}