require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeTemplateVariables() {
  console.log('🔍 ANÁLISIS DE VARIABLES DE PLANTILLAS - ERROR 63028\n');
  
  try {
    // Buscar la plantilla problemática
    console.log('📋 TODAS LAS PLANTILLAS ACTIVAS:\n');
    
    const templates = await prisma.template.findMany({
      where: {
        status: 'approved'
      },
      orderBy: { updatedAt: 'desc' }
    });

    templates.forEach((template, index) => {
      console.log(`${index + 1}. 📋 Template: ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Status: ${template.status}`);
      console.log(`   Twilio SID: ${template.twilioSid || 'None'}`);
      console.log(`   Twilio Content SID: ${template.twilioContentSid || 'None'}`);
      console.log(`   Content:`);
      console.log(`   "${template.content}"`);
      console.log(`   Variables array: [${template.variables.join(', ')}]`);
      console.log(`   Total variables: ${template.variables.length}`);
      
      // Analizar variables en el contenido
      const contentVariables = [];
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = regex.exec(template.content)) !== null) {
        contentVariables.push(match[1]);
      }
      
      console.log(`   Variables en contenido: [${contentVariables.join(', ')}]`);
      console.log(`   Variables en contenido (count): ${contentVariables.length}`);
      
      // Variables mapping
      if (template.variablesMapping) {
        console.log(`   Variables mapping: ${JSON.stringify(template.variablesMapping)}`);
      }
      
      // Detectar discrepancias
      const discrepancy = template.variables.length !== contentVariables.length;
      if (discrepancy) {
        console.log(`   ❌ DISCREPANCIA DETECTADA:`);
        console.log(`      Array variables: ${template.variables.length}`);
        console.log(`      Contenido variables: ${contentVariables.length}`);
      } else {
        console.log(`   ✅ Variables coinciden`);
      }
      
      console.log('   ---\n');
    });

    // Analizar específicamente la plantilla con el problema
    console.log('\n🎯 ANÁLISIS ESPECÍFICO DE LA PLANTILLA PROBLEMÁTICA:\n');
    
    const problematicContent = "📅 ¡Hola, {{nombre}}! {{empresa}} te espera el {{fecha}} en {{direccion}}. Por favor, asegúrate de llevar todos tus documentos. 📁\n\nSaludos, {{empresa}}";
    
    console.log('Contenido problemático:');
    console.log(`"${problematicContent}"`);
    
    // Extraer variables del contenido
    const extractedVars = [];
    const varRegex = /\{\{([^}]+)\}\}/g;
    let varMatch;
    while ((varMatch = varRegex.exec(problematicContent)) !== null) {
      extractedVars.push(varMatch[1]);
    }
    
    console.log(`\nVariables extraídas: [${extractedVars.join(', ')}]`);
    console.log(`Total variables extraídas: ${extractedVars.length}`);
    
    // Contar variables únicas
    const uniqueVars = [...new Set(extractedVars)];
    console.log(`Variables únicas: [${uniqueVars.join(', ')}]`);
    console.log(`Total variables únicas: ${uniqueVars.length}`);
    
    // Análisis de repeticiones
    const varCount = {};
    extractedVars.forEach(variable => {
      varCount[variable] = (varCount[variable] || 0) + 1;
    });
    
    console.log('\nAnálisis de repeticiones:');
    Object.entries(varCount).forEach(([variable, count]) => {
      console.log(`  ${variable}: ${count} vez(es)${count > 1 ? ' ⚠️ REPETIDA' : ''}`);
    });
    
    console.log('\n💡 POSIBLES PROBLEMAS:');
    console.log('1. Twilio espera parámetros únicos, pero "empresa" aparece 2 veces');
    console.log('2. El orden puede no coincidir con el definido en Twilio Content');
    console.log('3. Podría haber variables duplicadas causando el error 63028');
    
    // Buscar template que coincida con este contenido
    const matchingTemplate = templates.find(t => 
      t.content.includes('{{nombre}}') && 
      t.content.includes('{{empresa}}') && 
      t.content.includes('{{fecha}}') && 
      t.content.includes('{{direccion}}')
    );
    
    if (matchingTemplate) {
      console.log(`\n🎯 TEMPLATE COINCIDENTE ENCONTRADO:`);
      console.log(`   Nombre: ${matchingTemplate.name}`);
      console.log(`   Variables definidas: [${matchingTemplate.variables.join(', ')}]`);
      console.log(`   Total definidas: ${matchingTemplate.variables.length}`);
      console.log(`   Content SID: ${matchingTemplate.twilioContentSid}`);
      
      // Proponer corrección
      console.log(`\n🔧 CORRECCIÓN SUGERIDA:`);
      console.log(`   Twilio espera: ${uniqueVars.length} parámetros únicos`);
      console.log(`   Orden sugerido: [${uniqueVars.join(', ')}]`);
      console.log(`   Para el contenido con "empresa" duplicada, necesitamos enviar:`);
      console.log(`   [nombre, empresa, fecha, direccion]`);
      console.log(`   Y Twilio repetirá "empresa" automáticamente en la segunda posición.`);
    }

  } catch (error) {
    console.error('❌ Error analizando plantillas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTemplateVariables().catch(console.error);