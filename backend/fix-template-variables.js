const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateVariables() {
  try {
    console.log('🔍 Actualizando variables de plantilla CONFIRMACIÓN DE CITAS V2...\n');
    
    // Buscar la plantilla
    const template = await prisma.template.findFirst({
      where: {
        twilioSid: 'HX164c5aa2918cc699bedbe253ba2bf805'
      }
    });
    
    if (!template) {
      console.log('❌ No se encontró la plantilla');
      return;
    }
    
    console.log('📋 Plantilla encontrada:', template.name);
    console.log('🔢 Variables actuales:', template.variables);
    
    // Actualizar con las variables correctas que espera Twilio
    const correctVariables = ['nombre', 'empresa', 'servicio', 'fecha', 'lugar', 'hora'];
    
    const updated = await prisma.template.update({
      where: { id: template.id },
      data: {
        variables: correctVariables,
        content: `Hola {{nombre}},

Confirmamos tu cita en {{empresa}}:

📋 Tipo: {{servicio}}
📅 Fecha: {{fecha}}
📍 Lugar: {{lugar}}
🕐 Hora: {{hora}}

Por favor llega 15 minutos antes. Si necesitas cancelar o reprogramar, comunícate con nosotros con al menos 24 horas de anticipación.

Gracias por tu preferencia.`,
        adminReviewedAt: new Date(),
        adminReviewedBy: 'system-fix'
      }
    });
    
    console.log('\n✅ Plantilla actualizada exitosamente');
    console.log('📝 Nuevas variables:', updated.variables);
    console.log('\n🔧 Mapeo esperado:');
    console.log('   nombre → Nombre del paciente (del CSV)');
    console.log('   empresa → Nombre de la clínica');
    console.log('   servicio → Tipo de consulta');
    console.log('   fecha → Fecha de la cita');
    console.log('   lugar → Ubicación/dirección');
    console.log('   hora → Hora de la cita (del CSV)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplateVariables();