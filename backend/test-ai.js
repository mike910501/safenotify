// Test simple para validar que OpenAI funciona
require('dotenv').config();
const aiValidator = require('./services/aiTemplateValidator');

async function testAI() {
  console.log('🤖 Probando validación con IA...');
  
  const testTemplate = {
    name: 'Confirmación de Pedido',
    content: 'Hola {{nombre}}, su pedido de {{producto}} por {{precio}} estará listo el {{fecha}}.',
    category: 'general',
    variables: ['nombre', 'producto', 'precio', 'fecha']
  };

  try {
    const result = await aiValidator.validateTemplate(testTemplate);
    
    console.log('✅ Resultado:', {
      approved: result.approved,
      score: result.score,
      reasons: result.reasons,
      suggestions: result.suggestions
    });
    
    if (result.approved) {
      console.log('🎉 ¡Plantilla aprobada por IA!');
    } else {
      console.log('⚠️ Plantilla necesita mejoras según IA');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAI();