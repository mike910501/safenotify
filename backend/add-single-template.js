const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración de la plantilla a agregar
// MODIFICA ESTOS VALORES PARA CADA PLANTILLA NUEVA
const NEW_TEMPLATE = {
  name: 'NOMBRE_DE_LA_PLANTILLA',  // Ejemplo: 'INSCRIPCIÓN CONFIRMADA'
  twilioSid: 'HX_CONTENT_SID_DE_TWILIO',  // Ejemplo: 'HX8b8e03f87871c825af4f5f02e93f7cc3'
  category: 'general',  // Opciones: 'cita', 'recordatorio', 'pago', 'envio', 'general', etc.
  content: `Contenido de la plantilla aquí`,  // El contenido completo con {{variables}}
  variables: ['variable1', 'variable2'],  // Ejemplo: ['nombre', 'fecha', 'hora']
  isPublic: true,  // true para plantillas públicas
  isActive: true,  // true para activar la plantilla
  adminApproved: true  // true si está aprobada
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