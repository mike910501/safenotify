-- SQL Script para crear las 12 plantillas públicas de SafeNotify
-- Estas plantillas estarán disponibles para todos los usuarios

-- 1. INSCRIPCIÓN CONFIRMADA
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'INSCRIPCIÓN CONFIRMADA',
    '¡Hola {{nombre}}! Tu inscripción en {{programa}} ha sido confirmada exitosamente. 
Fecha de inicio: {{fecha_inicio}}
Horario: {{horario}}
Lugar: {{lugar}}

📚 Prepárate para comenzar esta nueva experiencia.

¿Tienes preguntas? Responde a este mensaje.',
    'education',
    ARRAY['nombre', 'programa', 'fecha_inicio', 'horario', 'lugar'],
    'approved',
    true,
    NULL,
    'HX8b8e03f87871c825af4f5f02e93f7cc3',
    NOW(),
    NOW()
);

-- 2. RENOVACIÓN PRÓXIMA
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'RENOVACIÓN PRÓXIMA',
    'Hola {{nombre}}, tu suscripción de {{servicio}} vence el {{fecha_vencimiento}}.

💳 Renueva ahora y mantén todos tus beneficios:
{{link_renovacion}}

Monto: {{monto}}
Descuento disponible: {{descuento}}

¿Necesitas ayuda? Estamos aquí para ti.',
    'subscription',
    ARRAY['nombre', 'servicio', 'fecha_vencimiento', 'link_renovacion', 'monto', 'descuento'],
    'approved',
    true,
    NULL,
    'HX6ea93b9f1c36bb70f3c89c1e0c0e1e88',
    NOW(),
    NOW()
);

-- 3. PAGO RECHAZADO
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'PAGO RECHAZADO',
    '⚠️ {{nombre}}, tu pago de {{monto}} ha sido rechazado.

Referencia: {{referencia}}
Motivo: {{motivo}}

Por favor verifica:
• Fondos disponibles
• Datos de la tarjeta
• Límites de transacción

Reintenta aquí: {{link_pago}}',
    'payment',
    ARRAY['nombre', 'monto', 'referencia', 'motivo', 'link_pago'],
    'approved',
    true,
    NULL,
    'HXd9c3e4f5b6a7890123456789abcdef01',
    NOW(),
    NOW()
);

-- 4. CITA CANCELADA
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'CITA CANCELADA',
    'Hola {{nombre}}, lamentamos informarte que tu cita del {{fecha_original}} ha sido cancelada.

Motivo: {{motivo}}

📅 Reagenda tu cita:
{{link_reagendar}}

Horarios disponibles: {{horarios_disponibles}}

Disculpa las molestias.',
    'appointment',
    ARRAY['nombre', 'fecha_original', 'motivo', 'link_reagendar', 'horarios_disponibles'],
    'approved',
    true,
    NULL,
    'HX2a3b4c5d6e7f8901234567890abcdef2',
    NOW(),
    NOW()
);

-- 5. PAQUETE ENVIADO
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'PAQUETE ENVIADO',
    '📦 ¡{{nombre}}, tu pedido está en camino!

N° de orden: {{numero_orden}}
N° de guía: {{numero_guia}}
Transportadora: {{transportadora}}
Fecha estimada: {{fecha_entrega}}

Rastrea tu envío: {{link_rastreo}}

¡Gracias por tu compra!',
    'ecommerce',
    ARRAY['nombre', 'numero_orden', 'numero_guia', 'transportadora', 'fecha_entrega', 'link_rastreo'],
    'approved',
    true,
    NULL,
    'HX3b4c5d6e7f89012345678901abcdef03',
    NOW(),
    NOW()
);

-- 6. CONFIRMACIÓN GENERAL
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'CONFIRMACIÓN GENERAL',
    'Hola {{nombre}}, confirmamos que {{accion}} ha sido procesada exitosamente.

Detalles:
{{detalles}}

Fecha: {{fecha}}
Referencia: {{referencia}}

{{mensaje_adicional}}

Gracias por confiar en nosotros.',
    'general',
    ARRAY['nombre', 'accion', 'detalles', 'fecha', 'referencia', 'mensaje_adicional'],
    'approved',
    true,
    NULL,
    'HX4c5d6e7f8901234567890abcdef0145',
    NOW(),
    NOW()
);

-- 7. VENCIMIENTO PRÓXIMO
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'VENCIMIENTO PRÓXIMO',
    '⏰ {{nombre}}, recordatorio importante:

Tu {{documento_servicio}} vence el {{fecha_vencimiento}}.

Estado actual: {{estado}}
Acción requerida: {{accion_requerida}}

No dejes pasar la fecha límite.
{{link_accion}}

¿Necesitas más tiempo? Contáctanos.',
    'reminder',
    ARRAY['nombre', 'documento_servicio', 'fecha_vencimiento', 'estado', 'accion_requerida', 'link_accion'],
    'approved',
    true,
    NULL,
    'HX5d6e7f890123456789abcdef0145678',
    NOW(),
    NOW()
);

-- 8. PAGO RECIBIDO
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'PAGO RECIBIDO',
    '✅ {{nombre}}, hemos recibido tu pago exitosamente.

Monto pagado: {{monto}}
Concepto: {{concepto}}
N° de transacción: {{numero_transaccion}}
Fecha: {{fecha_pago}}

Descarga tu recibo: {{link_recibo}}

¡Gracias por tu pago puntual!',
    'payment',
    ARRAY['nombre', 'monto', 'concepto', 'numero_transaccion', 'fecha_pago', 'link_recibo'],
    'approved',
    true,
    NULL,
    'HX6e7f89012345678abcdef0145678901',
    NOW(),
    NOW()
);

-- 9. SERVICIO PROGRAMADO
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'SERVICIO PROGRAMADO',
    '🔧 {{nombre}}, tu servicio ha sido programado.

Servicio: {{tipo_servicio}}
Fecha: {{fecha_servicio}}
Hora: {{hora_servicio}}
Técnico: {{nombre_tecnico}}
Dirección: {{direccion}}

El técnico llegará en el horario indicado.
{{instrucciones_especiales}}',
    'service',
    ARRAY['nombre', 'tipo_servicio', 'fecha_servicio', 'hora_servicio', 'nombre_tecnico', 'direccion', 'instrucciones_especiales'],
    'approved',
    true,
    NULL,
    'HX7f89012345678abcdef01456789012a',
    NOW(),
    NOW()
);

-- 10. SOLICITUD APROBADA
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'SOLICITUD APROBADA',
    '🎉 ¡Felicidades {{nombre}}! Tu solicitud ha sido APROBADA.

Tipo: {{tipo_solicitud}}
Monto/Detalle: {{detalle_aprobacion}}
Vigencia: {{vigencia}}
Condiciones: {{condiciones}}

Próximos pasos:
{{proximos_pasos}}

¡Bienvenido!',
    'approval',
    ARRAY['nombre', 'tipo_solicitud', 'detalle_aprobacion', 'vigencia', 'condiciones', 'proximos_pasos'],
    'approved',
    true,
    NULL,
    'HX89012345678abcdef0145678901234b',
    NOW(),
    NOW()
);

-- 11. DOCUMENTO LISTO
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'DOCUMENTO LISTO',
    '📄 {{nombre}}, tu documento está listo para retirar.

Documento: {{tipo_documento}}
Lugar de retiro: {{lugar_retiro}}
Horario: {{horario_retiro}}
Requisitos: {{requisitos}}

Válido hasta: {{fecha_limite}}

No olvides traer tu identificación.',
    'document',
    ARRAY['nombre', 'tipo_documento', 'lugar_retiro', 'horario_retiro', 'requisitos', 'fecha_limite'],
    'approved',
    true,
    NULL,
    'HX9012345678abcdef0145678901234cd',
    NOW(),
    NOW()
);

-- 12. RESULTADOS LISTOS EMPRESA
INSERT INTO "Template" (
    id,
    name,
    content,
    category,
    variables,
    status,
    "isPublic",
    "userId",
    "twilioSid",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'RESULTADOS LISTOS EMPRESA',
    '🏢 {{nombre_empresa}}

Los resultados de {{tipo_evaluacion}} están disponibles.

Período evaluado: {{periodo}}
N° de participantes: {{num_participantes}}
Resultado general: {{resultado_general}}

📊 Ver informe completo: {{link_resultados}}

Fecha de reunión: {{fecha_reunion}}

Saludos,
{{firma_empresa}}',
    'corporate',
    ARRAY['nombre_empresa', 'tipo_evaluacion', 'periodo', 'num_participantes', 'resultado_general', 'link_resultados', 'fecha_reunion', 'firma_empresa'],
    'approved',
    true,
    NULL,
    'HX012345678abcdef0145678901234def',
    NOW(),
    NOW()
);

-- Verificar que todas las plantillas se crearon correctamente
SELECT name, "twilioSid", array_length(variables, 1) as num_variables, status, "isPublic"
FROM "Template" 
WHERE "isPublic" = true 
ORDER BY "createdAt" DESC
LIMIT 12;