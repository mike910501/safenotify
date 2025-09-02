const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCampaignRealFlow() {
  console.log('🧪 TESTING COMPLETE CAMPAIGN FLOW WITH REAL DATA\n');
  
  try {
    // Simulate the exact same flow as the real campaign system
    
    // 1. Get template like the real system does
    const templateSid = 'HX0990dd2e9581a837e22c90cea18353e4'; // vecimiento_codumentos template
    
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
      console.log('❌ Template not found with SID:', templateSid);
      return;
    }
    
    console.log(`✅ Template found: ${template.name}`);
    console.log(`📋 Template variables: ${JSON.stringify(template.variables)}`);
    
    // 2. Simulate contact data (like from CSV)
    const contact = {
      nombre: 'Michael Huertas',
      telefono: '+573133592457',
      Hora: '10:30 AM'
    };
    
    // 3. Simulate user mappings and defaults (like from the frontend)
    const variableMappings = {}; // User didn't map any columns
    const defaultValues = {
      dias_restantes: '10',
      empresa: 'ENERVISA',
      fecha_vencimiento: '25 de Septiembre 2025',
      link_renovacion: 'https://enervisa.gov.co/renovar',
      placa_vehiculo: 'MTX08E',
      tipo_documento: 'Licencia de Conducción'
    };
    
    console.log(`\n📊 Contact data: ${JSON.stringify(contact)}`);
    console.log(`📊 Variable mappings: ${JSON.stringify(variableMappings)}`);
    console.log(`📊 Default values: ${JSON.stringify(defaultValues)}`);
    
    // 4. Apply the EXACT SAME variable mapping logic as simple-server.js
    const templateVariables = {};
    
    template.variables.forEach((varName, varIndex) => {
      const variableNumber = (varIndex + 1).toString();
      let value = '';
      
      console.log(`\n🔍 Processing variable: ${varName}`);
      
      // EXACT same priority logic as in simple-server.js line 1673-1685
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
    
    console.log(`\n✅ Final template variables: ${JSON.stringify(templateVariables, null, 2)}`);
    
    // 5. Verify Content SID selection logic
    const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
    console.log(`\n🔍 Content SID selection:`);
    console.log(`   twilioContentSid: ${template.twilioContentSid || 'null'}`);
    console.log(`   twilioSid: ${template.twilioSid || 'null'}`);
    console.log(`   twilioTemplateId: ${template.twilioTemplateId || 'null'}`);
    console.log(`   Selected: ${contentSid}`);
    
    // 6. Show final message payload that would be sent
    const whatsappNumber = `whatsapp:+${contact.telefono.replace(/^\+/, '')}`;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
      ? process.env.TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    
    const messagePayload = {
      from: fromNumber,
      to: whatsappNumber,
      contentSid: contentSid,
      contentVariables: JSON.stringify(templateVariables)
    };
    
    console.log(`\n📤 Final message payload:`);
    console.log(`   From: ${messagePayload.from}`);
    console.log(`   To: ${messagePayload.to}`);
    console.log(`   ContentSID: ${messagePayload.contentSid}`);
    console.log(`   Variables: ${messagePayload.contentVariables}`);
    
    // 7. Verify all variables are filled
    const filledVars = Object.values(templateVariables).filter(v => v !== '').length;
    const totalVars = template.variables.length;
    
    console.log(`\n📊 VERIFICATION RESULTS:`);
    console.log(`   Total variables: ${totalVars}`);
    console.log(`   Filled variables: ${filledVars}`);
    console.log(`   Success rate: ${Math.round((filledVars / totalVars) * 100)}%`);
    
    if (filledVars === totalVars) {
      console.log(`   ✅ ALL VARIABLES FILLED CORRECTLY!`);
    } else {
      console.log(`   ⚠️  ${totalVars - filledVars} variables are empty`);
    }
    
    // 8. Show what data the user would receive
    console.log(`\n📱 USER WILL RECEIVE:`);
    console.log(`   🏢 Empresa: "${templateVariables['1']}"`);
    console.log(`   👤 Nombre: "${templateVariables['2']}"`);
    console.log(`   🚗 Placa: "${templateVariables['3']}"`);
    console.log(`   📄 Documento: "${templateVariables['4']}"`);
    console.log(`   📅 Vencimiento: "${templateVariables['5']}"`);
    console.log(`   ⏰ Días restantes: "${templateVariables['6']}"`);
    console.log(`   🔗 Link: "${templateVariables['7']}"`);
    
    return {
      success: true,
      templateName: template.name,
      variablesFilled: filledVars,
      totalVariables: totalVars,
      templateVariables
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
  testCampaignRealFlow().catch(console.error);
}

module.exports = { testCampaignRealFlow };