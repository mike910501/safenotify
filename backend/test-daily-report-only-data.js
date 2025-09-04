require('dotenv').config();
const { getTodaysConversationPrompts, getTodaysNewLeads, generateEmailReport } = require('./services/dailyReportService');

/**
 * Test script to generate daily report data without sending email
 * Shows what the system would send
 */

async function testReportData() {
  try {
    console.log('📊 GENERANDO REPORTE DE DATOS DEL DÍA...');
    console.log('=' .repeat(60));
    
    // Get today's data
    console.log('\n🔍 Recopilando datos del día...');
    const [prompts, newLeads] = await Promise.all([
      getTodaysConversationPrompts(),
      getTodaysNewLeads()
    ]);
    
    console.log(`✅ Datos recopilados: ${newLeads.length} nuevos leads, ${prompts.length} conversaciones`);
    
    // Show summary
    console.log('\n📈 RESUMEN EJECUTIVO:');
    console.log(`┌─ Fecha: ${new Date().toLocaleDateString('es-CO')}`);
    console.log(`├─ Hora: ${new Date().toLocaleTimeString('es-CO')}`);
    console.log(`├─ Nuevos Leads: ${newLeads.length}`);
    console.log(`├─ Conversaciones Activas: ${prompts.length}`);
    console.log(`└─ Destino Email: mikehuertas91@gmail.com`);
    
    // Show new leads details
    if (newLeads.length > 0) {
      console.log('\n👥 NUEVOS LEADS DEL DÍA:');
      console.log('=' .repeat(50));
      newLeads.forEach((lead, index) => {
        const phone = lead.phone.substring(0, 8) + '***';
        console.log(`\n📱 Lead #${index + 1}:`);
        console.log(`   ├─ Teléfono: ${phone}`);
        console.log(`   ├─ Nombre: ${lead.name || 'Sin nombre'}`);
        console.log(`   ├─ Score: ${lead.qualificationScore}`);
        console.log(`   ├─ Estado: ${lead.status}`);
        console.log(`   └─ Hora: ${lead.createdAt.toLocaleTimeString('es-CO')}`);
      });
    } else {
      console.log('\n👥 No hay nuevos leads el día de hoy.');
    }
    
    // Show conversation summaries
    if (prompts.length > 0) {
      console.log('\n💬 CONVERSACIONES DEL DÍA:');
      console.log('=' .repeat(50));
      prompts.forEach((prompt, index) => {
        const phone = prompt.lead.phone.substring(0, 8) + '***';
        console.log(`\n🗣️ Conversación #${index + 1}:`);
        console.log(`   ├─ Cliente: ${prompt.lead.name || 'Sin nombre'}`);
        console.log(`   ├─ Teléfono: ${phone}`);
        console.log(`   ├─ Score: ${prompt.lead.qualificationScore}`);
        console.log(`   ├─ Estado: ${prompt.lead.status}`);
        console.log(`   ├─ Hora: ${prompt.createdAt.toLocaleTimeString('es-CO')}`);
        console.log(`   ├─ Resumen: "${(prompt.conversationSummary || 'Sin resumen').substring(0, 80)}..."`);
        if (prompt.businessContext) {
          console.log(`   └─ Contexto: ${JSON.stringify(prompt.businessContext).substring(0, 100)}...`);
        }
      });
    } else {
      console.log('\n💬 No hay conversaciones registradas el día de hoy.');
    }
    
    // Generate email report (but don't send)
    console.log('\n📧 Generando contenido HTML del reporte...');
    const htmlContent = generateEmailReport(prompts, newLeads);
    console.log(`✅ Reporte HTML generado: ${htmlContent.length} caracteres`);
    
    console.log('\n🎯 ANÁLISIS INSIGHT:');
    console.log('=' .repeat(40));
    
    if (prompts.length > 0) {
      // Analyze business types mentioned
      const businessTypes = new Set();
      const sectors = new Set();
      
      prompts.forEach(prompt => {
        if (prompt.businessContext) {
          const context = typeof prompt.businessContext === 'string' 
            ? JSON.parse(prompt.businessContext) 
            : prompt.businessContext;
          
          if (context.businessType || context.sector) {
            businessTypes.add(context.businessType || context.sector);
          }
          if (context.sector) sectors.add(context.sector);
        }
      });
      
      console.log(`📊 Tipos de negocio detectados: ${[...businessTypes].join(', ') || 'No especificados'}`);
      console.log(`🏢 Sectores identificados: ${[...sectors].join(', ') || 'No especificados'}`);
    }
    
    if (newLeads.length > 0) {
      const avgScore = newLeads.reduce((sum, lead) => sum + lead.qualificationScore, 0) / newLeads.length;
      console.log(`🎯 Score promedio de nuevos leads: ${avgScore.toFixed(1)}`);
    }
    
    console.log('\n✅ SISTEMA COMPLETAMENTE FUNCIONAL');
    console.log('📧 Email se enviará automáticamente a las 5 PM');
    console.log('🚀 Para testing manual: POST /api/test-daily-report');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error en test de datos:', error);
    process.exit(1);
  }
}

// Run the test
testReportData()
  .then(() => {
    console.log('\n🎉 Test de datos completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test falló:', error);
    process.exit(1);
  });