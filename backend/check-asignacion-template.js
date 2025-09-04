require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAsignacionTemplate() {
  try {
    const template = await prisma.template.findFirst({
      where: { name: 'asignacion de labores' }
    });

    if (!template) {
      console.log('❌ Template no encontrado');
      return;
    }

    console.log('📋 ANÁLISIS DETALLADO: asignacion de labores\n');
    console.log('Nombre:', template.name);
    console.log('Status:', template.status);
    console.log('Variables definidas:', template.variables);
    console.log('Total variables:', template.variables.length);
    console.log('\nContenido completo:');
    console.log('"' + template.content + '"');

    // Extraer variables del contenido
    const regex = /\{\{([^}]+)\}\}/g;
    const contentVars = [];
    let match;
    
    while ((match = regex.exec(template.content)) !== null) {
      contentVars.push(match[1]);
    }

    console.log('\nVariables en contenido:', contentVars);
    console.log('Total en contenido:', contentVars.length);

    // Contar repeticiones
    const varCount = {};
    contentVars.forEach(variable => {
      varCount[variable] = (varCount[variable] || 0) + 1;
    });

    console.log('\nAnálisis de repeticiones:');
    Object.entries(varCount).forEach(([variable, count]) => {
      console.log(`  ${variable}: ${count} vez(es)${count > 1 ? ' ⚠️ DUPLICADA' : ''}`);
    });

    // Variables únicas
    const uniqueVars = [...new Set(contentVars)];
    console.log('\nVariables únicas:', uniqueVars);
    console.log('Total únicas:', uniqueVars.length);

    if (template.variables.length !== uniqueVars.length) {
      console.log('\n❌ PROBLEMA DETECTADO:');
      console.log(`Array variables: ${template.variables.length}`);
      console.log(`Variables únicas en contenido: ${uniqueVars.length}`);
      console.log('Esto puede causar error 63028');
    } else {
      console.log('\n✅ Variables coinciden - no debería haber error 63028');
    }

    // Verificar si es la plantilla problemática que mencionaste
    const hasEmpresaDuplicated = contentVars.filter(v => v === 'empresa').length > 1;
    if (hasEmpresaDuplicated) {
      console.log('\n🎯 ESTA ES LA PLANTILLA PROBLEMÁTICA');
      console.log('Contiene {{empresa}} duplicada - necesita el fix');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAsignacionTemplate();