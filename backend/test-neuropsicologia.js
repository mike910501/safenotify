// Test específico para el template de neuropsicología
require('dotenv').config();
const aiValidator = require('./services/aiTemplateValidator');

async function testNeuropsicologia() {
  console.log('🧠 Probando template de neuropsicología...');
  
  const testTemplate = {
    name: 'Cita Neuropsicología',
    content: 'Hola {{nombre}}, te confirmamos tu cita para neuropsicología el {{fecha}} con el Dr. García en {{direccion}}.',
    category: 'medical',
    variables: ['nombre', 'fecha', 'direccion']
  };

  try {
    console.log('\n📝 MENSAJE ORIGINAL:');
    console.log(`"${testTemplate.content}"`);
    console.log('\n🔍 VARIABLES:', testTemplate.variables);
    
    const result = await aiValidator.validateTemplate(testTemplate);
    
    console.log('\n✅ RESULTADO IA:');
    console.log('Aprobado:', result.approved);
    console.log('Score:', result.score);
    console.log('Razones:', result.reasons);
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log('\n💡 SUGERENCIA MEJORADA:');
      console.log(`"${result.suggestions[0]}"`);
      
      console.log('\n🔄 COMPARACIÓN:');
      console.log('ORIGINAL:', testTemplate.content);
      console.log('MEJORADA:', result.suggestions[0]);
    }
    
    if (result.suggestedVariables && result.suggestedVariables.length > 0) {
      console.log('\n🆕 VARIABLES SUGERIDAS:');
      result.suggestedVariables.forEach(variable => {
        console.log(`- {{${variable}}}`);
      });
    }
    
    console.log('\n📊 EXCEL REQUERIRÁ:');
    console.log(result.excelRequirements);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNeuropsicologia();