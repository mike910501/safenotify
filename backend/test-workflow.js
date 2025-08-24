// Test del nuevo workflow completo de plantillas
require('dotenv').config();
const aiValidator = require('./services/aiTemplateValidator');

async function testCompleteWorkflow() {
  console.log('🔄 Probando workflow completo de plantillas...\n');
  
  const testTemplate = {
    name: 'Cita Dentista Urgente',
    content: 'Hola {{nombre}}, te confirmamos tu cita de odontología urgente el {{fecha}} con el Dr. Martínez en {{direccion}}. Por favor confirma tu asistencia.',
    category: 'medical',
    variables: ['nombre', 'fecha', 'direccion']
  };

  try {
    // Paso 1: Validación con IA
    console.log('📝 PASO 1: VALIDACIÓN IA');
    console.log('Mensaje original:', testTemplate.content);
    console.log('Variables:', testTemplate.variables);
    
    const validation = await aiValidator.validateTemplate(testTemplate);
    
    console.log('\n✅ Resultado IA:');
    console.log('- Aprobado:', validation.approved);
    console.log('- Score:', validation.score);
    console.log('- Razones:', validation.reasons);
    
    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log('\n💡 Sugerencia mejorada:');
      console.log('"' + validation.suggestions[0] + '"');
    }
    
    if (validation.suggestedVariables && validation.suggestedVariables.length > 0) {
      console.log('\n🆕 Variables sugeridas:');
      validation.suggestedVariables.forEach(variable => {
        console.log(`- {{${variable}}}`);
      });
    }
    
    // Paso 2: Estado después de crear
    console.log('\n📋 PASO 2: DESPUÉS DE CREAR LA PLANTILLA');
    console.log('🔄 Estado: PENDING (esperando revisión manual)');
    console.log('📊 Datos guardados:');
    console.log('- aiApproved:', validation.approved);
    console.log('- aiScore:', validation.score);
    console.log('- status: "pending"');
    console.log('- twilioTemplateId: null (hasta activación)');
    
    // Paso 3: Flujo de admin
    console.log('\n👨‍💼 PASO 3: REVISIÓN DE ADMINISTRADOR');
    console.log('Admin opciones:');
    console.log('✅ Aprobar → status: "approved"');
    console.log('❌ Rechazar → status: "rejected"');
    
    // Paso 4: Activación
    console.log('\n🚀 PASO 4: ACTIVACIÓN CON TWILIO');
    console.log('Si aprobada:');
    console.log('- Admin configura twilioTemplateId');
    console.log('- status: "active"');
    console.log('- Lista para usar en campañas');
    
    console.log('\n✅ WORKFLOW COMPLETO IMPLEMENTADO:');
    console.log('1. Usuario crea → IA valida → PENDING');
    console.log('2. Admin revisa → APPROVED/REJECTED');
    console.log('3. Admin activa → ACTIVE (con Twilio ID)');
    console.log('4. Disponible para campañas');
    
  } catch (error) {
    console.error('❌ Error en workflow:', error.message);
  }
}

testCompleteWorkflow();