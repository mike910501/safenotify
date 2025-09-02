const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealCampaign() {
  console.log('🧪 TESTING EXACT SAME FLOW AS REAL CAMPAIGN\n');
  
  try {
    // Simulate exactly the same process as a real user campaign
    const templateSid = 'HX0990dd2e9581a837e22c90cea18353e4'; // vecimiento_codumentos
    
    // Find template exactly like the system does
    const template = await prisma.template.findFirst({
      where: {
        OR: [
          { twilioSid: templateSid },
          { twilioContentSid: templateSid },
          { twilioTemplateId: templateSid }
        ],
        status: 'active'
      }
    });
    
    if (!template) {
      console.log('❌ Template not found');
      return;
    }
    
    console.log(`✅ Template found: ${template.name}`);
    console.log(`📋 Template variables: ${JSON.stringify(template.variables)}`);
    console.log(`📋 Content: ${template.content}`);
    
    // Simulate contact from CSV (exactly like real campaign)
    const contact = {
      nombre: 'Michael Huertas',
      telefono: '+573133592457',
      Hora: '10:30 AM'
    };
    
    // Simulate user configuration (exactly like real campaign)
    const variableMappings = {}; // User didn't map anything
    const defaultValues = {
      dias_restantes: '10',
      empresa: 'ENERVISA',
      fecha_vencimiento: '25 de Septiembre 2025',
      link_renovacion: 'https://enervisa.gov.co/renovar',
      placa_vehiculo: 'MTX08E',
      tipo_documento: 'Licencia de Conducción'
    };
    
    console.log(`\n📊 Contact: ${JSON.stringify(contact)}`);
    console.log(`📊 Variable mappings: ${JSON.stringify(variableMappings)}`);
    console.log(`📊 Default values: ${JSON.stringify(defaultValues)}`);
    
    // Apply EXACT same logic as simple-server.js line 1673-1691
    const templateVariables = {};
    
    console.log(`\n🔍 VARIABLE PROCESSING (exact same as real system):`);
    template.variables.forEach((varName, varIndex) => {
      const variableNumber = (varIndex + 1).toString();
      let value = '';
      
      // EXACT same priority logic
      if (variableMappings && variableMappings[varName]) {
        const csvColumn = variableMappings[varName];
        value = contact[csvColumn] || '';
        console.log(`   📋 ${varName} -> mapped to '${csvColumn}' = '${value}'`);
      } else if (defaultValues && defaultValues[varName]) {
        value = defaultValues[varName];
        console.log(`   📋 ${varName} -> default value = '${value}'`);
      } else {
        value = contact[varName] || '';
        console.log(`   📋 ${varName} -> direct CSV = '${value}'`);
      }
      
      templateVariables[variableNumber] = value;
    });
    
    console.log(`\n✅ Final templateVariables: ${JSON.stringify(templateVariables)}`);
    
    // Show exact content SID and variables that will be sent
    const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
    console.log(`\n📨 Will send with ContentSID: ${contentSid}`);
    console.log(`📨 Variables being sent: ${JSON.stringify(templateVariables)}`);
    
    // Show what Twilio will receive
    console.log(`\n📡 TWILIO WILL RECEIVE:`);
    console.log(`   ContentSID: ${contentSid}`);
    console.log(`   ContentVariables: ${JSON.stringify(templateVariables)}`);
    
    // Map variables by position for analysis
    console.log(`\n🔍 VARIABLE ANALYSIS:`);
    Object.keys(templateVariables).forEach(key => {
      const varName = template.variables[parseInt(key) - 1];
      const value = templateVariables[key];
      console.log(`   Position ${key} (${varName}): "${value}"`);
    });
    
    // Check if any variables are empty
    const emptyVars = Object.keys(templateVariables).filter(key => !templateVariables[key]);
    if (emptyVars.length > 0) {
      console.log(`\n⚠️  WARNING: Empty variables at positions: ${emptyVars.join(', ')}`);
      console.log(`    These might be filled with default values from Twilio template`);
    } else {
      console.log(`\n✅ All variables filled successfully`);
    }
    
    console.log(`\n💡 POSSIBLE ISSUE:`);
    console.log(`If you still receive test data, it means the WhatsApp Business template`);
    console.log(`in Twilio has test/sample values configured as defaults that override`);
    console.log(`our contentVariables when variable names don't match exactly.`);
    
    // Show what should be received vs what might be received
    console.log(`\n📱 WHAT YOU SHOULD RECEIVE:`);
    console.log(`   🏢 ${templateVariables['1']} (ENERVISA)`);
    console.log(`   👤 ${templateVariables['2']} (Michael Huertas)`);
    console.log(`   🚗 ${templateVariables['3']} (MTX08E)`);
    console.log(`   📄 ${templateVariables['4']} (Licencia de Conducción)`);
    console.log(`   📅 ${templateVariables['5']} (25 de Septiembre 2025)`);
    console.log(`   ⏰ ${templateVariables['6']} (10)`);
    console.log(`   🔗 ${templateVariables['7']} (https://enervisa.gov.co/renovar)`);
    
    console.log(`\n📱 IF YOU RECEIVE TEST DATA, IT MEANS:`);
    console.log(`   The Twilio template has hardcoded sample values that are overriding`);
    console.log(`   our contentVariables. This needs to be fixed in Twilio Console.`);
    
    return {
      success: true,
      contentSid,
      templateVariables,
      allVariablesFilled: emptyVars.length === 0
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testRealCampaign().catch(console.error);
}

module.exports = { testRealCampaign };