const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuración de la plantilla a agregar
// MODIFICA ESTOS VALORES PARA CADA PLANTILLA NUEVA
const NEW_TEMPLATE = {
  name: 'CONFIRMACIÓN DE CITAS V2',  
  twilioSid: 'HXcd93e4b0d65db811a1e8f0f9e06bb721',
  category: 'cita',  
  content: `Hola {{1}},

Confirmamos tu cita en {{2}}:

📋 Tipo: {{3}}
📅 Fecha: {{4}}
📍 Lugar: {{5}}
🕐 Hora: {{6}}

Por favor llega 15 minutos antes. Si necesitas cancelar o reprogramar, comunícate con nosotros con al menos 24 horas de anticipación.

Gracias por tu preferencia.`,
  variables: ['1', '2', '3', '4', '5', '6'],
  status: 'active',
  isPublic: true,  
  aiApproved: true
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
        status: NEW_TEMPLATE.status,
        isPublic: NEW_TEMPLATE.isPublic,
        aiApproved: NEW_TEMPLATE.aiApproved,
        adminReviewedAt: new Date(),
        adminReviewedBy: 'system'
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