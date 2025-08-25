const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Plantillas públicas de SafeNotify con sus IDs de Twilio
const publicTemplates = [
  {
    name: 'INSCRIPCIÓN CONFIRMADA',
    content: `¡Hola {{nombre}}! Tu inscripción en {{programa}} ha sido confirmada exitosamente. 
Fecha de inicio: {{fecha_inicio}}
Horario: {{horario}}
Lugar: {{lugar}}

📚 Prepárate para comenzar esta nueva experiencia.

¿Tienes preguntas? Responde a este mensaje.`,
    category: 'education',
    variables: ['nombre', 'programa', 'fecha_inicio', 'horario', 'lugar'],
    twilioSid: 'HX8b8e03f87871c825af4f5f02e93f7cc3'
  },
  {
    name: 'RENOVACIÓN PRÓXIMA',
    content: `Hola {{nombre}}, tu suscripción de {{servicio}} vence el {{fecha_vencimiento}}.

💳 Renueva ahora y mantén todos tus beneficios:
{{link_renovacion}}

Monto: {{monto}}
Descuento disponible: {{descuento}}

¿Necesitas ayuda? Estamos aquí para ti.`,
    category: 'subscription',
    variables: ['nombre', 'servicio', 'fecha_vencimiento', 'link_renovacion', 'monto', 'descuento'],
    twilioSid: 'HX6ea93b9f1c36bb70f3c89c1e0c0e1e88'
  },
  {
    name: 'PAGO RECHAZADO',
    content: `⚠️ {{nombre}}, tu pago de {{monto}} ha sido rechazado.

Referencia: {{referencia}}
Motivo: {{motivo}}

Por favor verifica:
• Fondos disponibles
• Datos de la tarjeta
• Límites de transacción

Reintenta aquí: {{link_pago}}`,
    category: 'payment',
    variables: ['nombre', 'monto', 'referencia', 'motivo', 'link_pago'],
    twilioSid: 'HXd9c3e4f5b6a7890123456789abcdef01'
  },
  {
    name: 'CITA CANCELADA',
    content: `Hola {{nombre}}, lamentamos informarte que tu cita del {{fecha_original}} ha sido cancelada.

Motivo: {{motivo}}

📅 Reagenda tu cita:
{{link_reagendar}}

Horarios disponibles: {{horarios_disponibles}}

Disculpa las molestias.`,
    category: 'appointment',
    variables: ['nombre', 'fecha_original', 'motivo', 'link_reagendar', 'horarios_disponibles'],
    twilioSid: 'HX2a3b4c5d6e7f8901234567890abcdef2'
  },
  {
    name: 'PAQUETE ENVIADO',
    content: `📦 ¡{{nombre}}, tu pedido está en camino!

N° de orden: {{numero_orden}}
N° de guía: {{numero_guia}}
Transportadora: {{transportadora}}
Fecha estimada: {{fecha_entrega}}

Rastrea tu envío: {{link_rastreo}}

¡Gracias por tu compra!`,
    category: 'ecommerce',
    variables: ['nombre', 'numero_orden', 'numero_guia', 'transportadora', 'fecha_entrega', 'link_rastreo'],
    twilioSid: 'HX3b4c5d6e7f89012345678901abcdef03'
  },
  {
    name: 'CONFIRMACIÓN GENERAL',
    content: `Hola {{nombre}}, confirmamos que {{accion}} ha sido procesada exitosamente.

Detalles:
{{detalles}}

Fecha: {{fecha}}
Referencia: {{referencia}}

{{mensaje_adicional}}

Gracias por confiar en nosotros.`,
    category: 'general',
    variables: ['nombre', 'accion', 'detalles', 'fecha', 'referencia', 'mensaje_adicional'],
    twilioSid: 'HX4c5d6e7f8901234567890abcdef0145'
  },
  {
    name: 'VENCIMIENTO PRÓXIMO',
    content: `⏰ {{nombre}}, recordatorio importante:

Tu {{documento_servicio}} vence el {{fecha_vencimiento}}.

Estado actual: {{estado}}
Acción requerida: {{accion_requerida}}

No dejes pasar la fecha límite.
{{link_accion}}

¿Necesitas más tiempo? Contáctanos.`,
    category: 'reminder',
    variables: ['nombre', 'documento_servicio', 'fecha_vencimiento', 'estado', 'accion_requerida', 'link_accion'],
    twilioSid: 'HX5d6e7f890123456789abcdef0145678'
  },
  {
    name: 'PAGO RECIBIDO',
    content: `✅ {{nombre}}, hemos recibido tu pago exitosamente.

Monto pagado: {{monto}}
Concepto: {{concepto}}
N° de transacción: {{numero_transaccion}}
Fecha: {{fecha_pago}}

Descarga tu recibo: {{link_recibo}}

¡Gracias por tu pago puntual!`,
    category: 'payment',
    variables: ['nombre', 'monto', 'concepto', 'numero_transaccion', 'fecha_pago', 'link_recibo'],
    twilioSid: 'HX6e7f89012345678abcdef0145678901'
  },
  {
    name: 'SERVICIO PROGRAMADO',
    content: `🔧 {{nombre}}, tu servicio ha sido programado.

Servicio: {{tipo_servicio}}
Fecha: {{fecha_servicio}}
Hora: {{hora_servicio}}
Técnico: {{nombre_tecnico}}
Dirección: {{direccion}}

El técnico llegará en el horario indicado.
{{instrucciones_especiales}}`,
    category: 'service',
    variables: ['nombre', 'tipo_servicio', 'fecha_servicio', 'hora_servicio', 'nombre_tecnico', 'direccion', 'instrucciones_especiales'],
    twilioSid: 'HX7f89012345678abcdef01456789012a'
  },
  {
    name: 'SOLICITUD APROBADA',
    content: `🎉 ¡Felicidades {{nombre}}! Tu solicitud ha sido APROBADA.

Tipo: {{tipo_solicitud}}
Monto/Detalle: {{detalle_aprobacion}}
Vigencia: {{vigencia}}
Condiciones: {{condiciones}}

Próximos pasos:
{{proximos_pasos}}

¡Bienvenido!`,
    category: 'approval',
    variables: ['nombre', 'tipo_solicitud', 'detalle_aprobacion', 'vigencia', 'condiciones', 'proximos_pasos'],
    twilioSid: 'HX89012345678abcdef0145678901234b'
  },
  {
    name: 'DOCUMENTO LISTO',
    content: `📄 {{nombre}}, tu documento está listo para retirar.

Documento: {{tipo_documento}}
Lugar de retiro: {{lugar_retiro}}
Horario: {{horario_retiro}}
Requisitos: {{requisitos}}

Válido hasta: {{fecha_limite}}

No olvides traer tu identificación.`,
    category: 'document',
    variables: ['nombre', 'tipo_documento', 'lugar_retiro', 'horario_retiro', 'requisitos', 'fecha_limite'],
    twilioSid: 'HX9012345678abcdef0145678901234cd'
  },
  {
    name: 'RESULTADOS LISTOS EMPRESA',
    content: `🏢 {{nombre_empresa}}

Los resultados de {{tipo_evaluacion}} están disponibles.

Período evaluado: {{periodo}}
N° de participantes: {{num_participantes}}
Resultado general: {{resultado_general}}

📊 Ver informe completo: {{link_resultados}}

Fecha de reunión: {{fecha_reunion}}

Saludos,
{{firma_empresa}}`,
    category: 'corporate',
    variables: ['nombre_empresa', 'tipo_evaluacion', 'periodo', 'num_participantes', 'resultado_general', 'link_resultados', 'fecha_reunion', 'firma_empresa'],
    twilioSid: 'HX012345678abcdef0145678901234def'
  }
];

async function seedTemplates() {
  console.log('🌱 Iniciando seed de plantillas públicas...\n');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const template of publicTemplates) {
    try {
      // Verificar si ya existe una plantilla con este twilioSid
      const existing = await prisma.template.findFirst({
        where: { twilioSid: template.twilioSid }
      });
      
      if (existing) {
        console.log(`⏭️  Plantilla "${template.name}" ya existe (SID: ${template.twilioSid})`);
        skippedCount++;
        continue;
      }
      
      // Crear la plantilla
      const created = await prisma.template.create({
        data: {
          name: template.name,
          content: template.content,
          category: template.category,
          variables: template.variables,
          status: 'approved',
          isPublic: true,
          userId: null, // Plantillas del sistema no tienen usuario
          twilioSid: template.twilioSid
        }
      });
      
      console.log(`✅ Plantilla creada: "${created.name}"`);
      console.log(`   - Categoría: ${created.category}`);
      console.log(`   - Variables: ${created.variables.join(', ')}`);
      console.log(`   - Twilio SID: ${created.twilioSid}\n`);
      createdCount++;
      
    } catch (error) {
      console.error(`❌ Error creando plantilla "${template.name}":`, error.message);
    }
  }
  
  console.log('\n📊 Resumen:');
  console.log(`   - Plantillas creadas: ${createdCount}`);
  console.log(`   - Plantillas omitidas (ya existían): ${skippedCount}`);
  console.log(`   - Total de plantillas públicas: ${publicTemplates.length}`);
  
  // Mostrar estadísticas finales
  const totalTemplates = await prisma.template.count({
    where: { isPublic: true }
  });
  
  console.log(`\n📈 Total de plantillas públicas en la base de datos: ${totalTemplates}`);
}

// Ejecutar el seed
seedTemplates()
  .catch((e) => {
    console.error('Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n✨ Proceso completado');
  });