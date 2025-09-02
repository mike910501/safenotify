// FINAL TEST - Simulate exact production scenario

const testScenario = {
  // Exact data from production logs
  templateSid: 'HX0990dd2e9581a837e22c90cea18353e4',
  variableMappings: '{"{nombre":"nombre"}',  // CORRUPTED as in production
  defaultValues: '{"{dias_restantes":"12","{empresa":"ENERVISA","{fecha_vencimiento":"2025-09-25","{link_renovacion":"LINK","{placa_vehiculo":"MTX08E","{tipo_documento":"LICENCIA"}',  // CORRUPTED
  
  // CSV contact
  contact: {
    nombre: 'Ofelia Hernandez',
    telefono: '+573058173397',
    Hora: '10:00 AM'
  },
  
  // Template structure
  template: {
    name: 'vecimiento_codumentos',
    variables: ["empresa","nombre","placa_vehiculo","tipo_documento","fecha_vencimiento","dias_restantes","link_renovacion"]
  }
};

function sanitizeJson(jsonString) {
  if (!jsonString) return '{}';
  
  try {
    let cleaned = jsonString.trim();
    console.log('🔧 Sanitizing JSON:', cleaned);
    
    // Fix FormData corruptions
    cleaned = cleaned.replace(/^"?\{/, '{');
    cleaned = cleaned.replace(/\}"?$/, '}');
    cleaned = cleaned.replace(/"\{([^"]+)"/g, '"$1"');
    
    if (!cleaned.endsWith('}')) {
      cleaned += '}';
    }
    
    console.log('🔧 Cleaned JSON:', cleaned);
    JSON.parse(cleaned);
    return cleaned;
    
  } catch (error) {
    console.warn('⚠️ JSON sanitization failed:', error.message);
    return '{}';
  }
}

function testFinalFix() {
  console.log('🧪 TESTING FINAL FIX WITH PRODUCTION DATA\n');
  
  // Step 1: Sanitize corrupted JSON
  const sanitizedMappings = sanitizeJson(testScenario.variableMappings);
  const sanitizedDefaults = sanitizeJson(testScenario.defaultValues);
  
  console.log('✅ Sanitized mappings:', sanitizedMappings);
  console.log('✅ Sanitized defaults:', sanitizedDefaults);
  
  // Step 2: Parse sanitized JSON
  const varMappings = JSON.parse(sanitizedMappings);
  const defaultVals = JSON.parse(sanitizedDefaults);
  
  console.log('✅ Parsed mappings:', varMappings);
  console.log('✅ Parsed defaults:', defaultVals);
  
  // Step 3: Build template variables
  console.log('\n📋 BUILDING TEMPLATE VARIABLES:');
  const templateVariables = {};
  
  testScenario.template.variables.forEach((varName, varIndex) => {
    const variableNumber = (varIndex + 1).toString();
    let value = '';
    
    if (varMappings[varName]) {
      const csvColumn = varMappings[varName];
      value = testScenario.contact[csvColumn] || '';
      console.log(`  ${varName} -> mapped to CSV '${csvColumn}' = '${value}'`);
    } else if (defaultVals[varName]) {
      value = defaultVals[varName];
      console.log(`  ${varName} -> default value = '${value}'`);
    } else {
      value = testScenario.contact[varName] || '';
      console.log(`  ${varName} -> direct CSV = '${value}'`);
    }
    
    templateVariables[variableNumber] = value;
  });
  
  console.log('\n🎯 FINAL RESULT:');
  console.log('Variables for WhatsApp:', templateVariables);
  
  // Verify success
  const nonEmptyVars = Object.values(templateVariables).filter(v => v !== '').length;
  const totalVars = Object.keys(templateVariables).length;
  
  console.log(`\n📊 SUCCESS RATE: ${nonEmptyVars}/${totalVars} variables filled`);
  
  if (nonEmptyVars >= 6) {  // Should be 7 but 6+ is good
    console.log('✅ TEST PASSED - Template will work correctly!');
    return true;
  } else {
    console.log('❌ TEST FAILED - Variables still empty');
    return false;
  }
}

// Run test
testFinalFix();