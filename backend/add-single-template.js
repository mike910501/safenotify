const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración de la plantilla a agregar
// MODIFICA ESTOS VALORES PARA CADA PLANTILLA NUEVA
const NEW_TEMPLATE = {
  name: 'CONFIRMACIÓN DE CITAS',  
  twilioSid: 'AQUI_PONES_EL_CONTENT_SID_DE_TWILIO',  // Necesitas el Content SID que te da Twilio
  category: 'cita',  
  content: `Hola {{nombre}}, confirmamos tu cita en {{empresa}}.

📅 Fecha: {{fecha}}
🏥 Sede: {{sede}}
📋 Tipo de cita: {{tipo}}

Por favor llega 15 minutos antes. Si necesitas cancelar, comunícate al menos 24 horas antes.

Gracias por confiar en nosotros.`,
  variables: ['nombre', 'empresa', 'fecha', 'sede', 'tipo'],
  isPublic: true,  
  isActive: true,  
  adminApproved: true  
};

async function addTemplate() {
  try {
    console.log('➕ Agregando nueva plantilla...');
    console.log('📋 Nombre:', NEW_TEMPLATE.name);
    console.log('🔑 Twilio SID:', NEW_TEMPLATE.twilioSid);
    
    const template = await prisma.template.create({
      data: {
        name: NEW_TEMPLATE.name,
        twilioSid: NEW_TEMPLATE.twilioSid,
        category: NEW_TEMPLATE.category,
        content: NEW_TEMPLATE.content,
        variables: NEW_TEMPLATE.variables,
        isPublic: NEW_TEMPLATE.isPublic,
        isActive: NEW_TEMPLATE.isActive,
        adminApproved: NEW_TEMPLATE.adminApproved,
        adminReviewedAt: NEW_TEMPLATE.adminApproved ? new Date() : null
      }
    });
    
    console.log('✅ Plantilla agregada exitosamente');
    console.log('🆔 ID:', template.id);
    console.log('📝 Variables:', template.variables.join(', '));
    
  } catch (error) {
    console.error('❌ Error agregando plantilla:', error);
    if (error.code === 'P2002') {
      console.error('⚠️  Ya existe una plantilla con este nombre o Twilio SID');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
addTemplate();

/* 
INSTRUCCIONES DE USO:
==================
1. Modifica los valores de NEW_TEMPLATE arriba con los datos de tu plantilla
2. Ejecuta: node add-single-template.js
3. Repite para cada plantilla nueva

CATEGORÍAS DISPONIBLES:
- 'cita' (para citas y confirmaciones)
- 'recordatorio' (para recordatorios)
- 'pago' (para pagos y transacciones)
- 'envio' (para envíos y paquetes)
- 'educacion' (para inscripciones y cursos)
- 'suscripcion' (para renovaciones)
- 'general' (para uso general)
- 'servicio' (para servicios)
- 'aprobacion' (para aprobaciones)
- 'documento' (para documentos)
- 'corporativo' (para empresas)

EJEMPLO DE PLANTILLA COMPLETA:
==============================
const NEW_TEMPLATE = {
  name: 'INSCRIPCIÓN CONFIRMADA',
  twilioSid: 'HX8b8e03f87871c825af4f5f02e93f7cc3',
  category: 'educacion',
  content: `¡Hola {{nombre}}! Tu inscripción en {{programa}} ha sido confirmada exitosamente. 
Fecha de inicio: {{fecha_inicio}}
Horario: {{horario}}
Lugar: {{lugar}}

📚 Prepárate para comenzar esta nueva experiencia.

¿Tienes preguntas? Responde a este mensaje.`,
  variables: ['nombre', 'programa', 'fecha_inicio', 'horario', 'lugar'],
  isPublic: true,
  isActive: true,
  adminApproved: true
};
*/