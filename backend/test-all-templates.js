const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// TEST DATA - simulating what user sends
const testData = {
  variableMappings: '{"{nombre":"nombre"}',  // CORRUPTED
  defaultValues: '{"{dias_restantes":"12","{empresa":"ENERVISA","{fecha_vencimiento":"2025-09-25","{link_renovacion":"LINK","{placa_vehiculo":"MTX08E","{tipo_documento":"LICENCIA"}'  // CORRUPTED
};

const csvContact = {
  nombre: 'Ofelia Hernandez',
  telefono: '+573058173397',
  Hora: '10:00 AM'
};

// IMPROVED JSON sanitizer
function sanitizeJson(jsonString) {
  if (!jsonString) return '{}';
  
  try {
    let cleaned = jsonString.trim();
    
    // Fix common FormData corruptions
    console.log('🔧 Original:', cleaned);
    
    // Remove extra quotes and braces
    cleaned = cleaned.replace(/^"?\{/, '{');
    cleaned = cleaned.replace(/\}"?$/, '}');
    
    // Fix key corruption like "{dias_restantes" -> "dias_restantes"
    cleaned = cleaned.replace(/"\{([^"]+)"/g, '"$1"');
    
    // Ensure proper closing if missing
    if (!cleaned.endsWith('}')) {
      cleaned += '}';
    }
    
    console.log('🔧 Cleaned:', cleaned);
    
    // Test parse
    const parsed = JSON.parse(cleaned);
    console.log('✅ Parsed successfully:', parsed);
    return cleaned;
    
  } catch (error) {
    console.error('❌ JSON sanitization failed:', error.message);
    console.error('   Input was:', jsonString);
    return '{}';
  }
}

async function testAllTemplates() {
  console.log('🧪 TESTING ALL TEMPLATES WITH REAL DATA\n');
  
  try {
    // Test JSON sanitization first
    console.log('📋 TESTING JSON SANITIZATION:');
    const sanitizedMappings = sanitizeJson(testData.variableMappings);
    const sanitizedDefaults = sanitizeJson(testData.defaultValues);
    
    const varMappings = JSON.parse(sanitizedMappings);
    const defaultVals = JSON.parse(sanitizedDefaults);
    
    console.log('Final mappings:', varMappings);
    console.log('Final defaults:', defaultVals);
    console.log('\n');
    
    // Get all templates
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        variables: true,
        twilioSid: true
      }
    });
    
    console.log(`📊 TESTING ${templates.length} TEMPLATES:\n`);
    
    templates.forEach((template, index) => {
      console.log(`${index + 1}. TESTING: ${template.name}`);
      console.log(`   Variables needed: ${JSON.stringify(template.variables)}`);
      
      // Build variables like the system should
      const templateVariables = {};
      
      if (template.variables && Array.isArray(template.variables)) {
        template.variables.forEach((varName, varIndex) => {
          const variableNumber = (varIndex + 1).toString();
          let value = '';
          
          // Priority: userMapping -> defaultValue -> csvColumn -> empty
          if (varMappings[varName]) {
            const csvColumn = varMappings[varName];
            value = csvContact[csvColumn] || '';
            console.log(`     ${varName} -> mapped to CSV column '${csvColumn}' = '${value}'`);
          } else if (defaultVals[varName]) {
            value = defaultVals[varName];
            console.log(`     ${varName} -> default value = '${value}'`);
          } else if (csvContact[varName]) {
            value = csvContact[varName];
            console.log(`     ${varName} -> direct CSV column = '${value}'`);
          } else {
            console.log(`     ${varName} -> NO VALUE FOUND`);
          }
          
          templateVariables[variableNumber] = value;
        });
      }
      
      console.log(`   Final variables: ${JSON.stringify(templateVariables)}`);
      console.log('   ---\n');
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAllTemplates().catch(console.error);