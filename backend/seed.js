const prisma = require('./db');

async function seedTemplates() {
  console.log('🌱 Poblando base de datos con plantillas predeterminadas...');
  
  // Crear plantillas predeterminadas
  const templates = [
    {
      name: 'Confirmación de Citas',
      content: '✅ Hola {nombre}, {negocio} confirma su cita para {servicio} el {fecha} a las {hora} en {ubicacion}. ¡Gracias por confiar en nosotros! 🙏',
      category: 'citas',
      variables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
      isApproved: true,
      isPublic: true,
      twilioSid: 'HX7438a469268dd438c00bd5fe0e74bd00',
      usageCount: 2450,
    },
    {
      name: 'Recordatorio de Citas',
      content: '⏰ {nombre}, {negocio} le recuerda su cita de {servicio} mañana {fecha} a las {hora}. Lo esperamos en {ubicacion} 📍',
      category: 'citas',
      variables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
      isApproved: true,
      isPublic: true,
      twilioSid: 'HX75c882c4b3bc3b2b4874cb137b733010',
      usageCount: 3120,
    },
  ];

  for (const template of templates) {
    const existing = await prisma.template.findFirst({
      where: { twilioSid: template.twilioSid }
    });

    if (!existing) {
      await prisma.template.create({
        data: template
      });
      console.log(`✅ Plantilla creada: ${template.name}`);
    } else {
      console.log(`⏭️ Plantilla ya existe: ${template.name}`);
    }
  }

  console.log('🎉 Base de datos poblada exitosamente');
}

// Ejecutar si el archivo se llama directamente
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('✅ Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en seed:', error);
      process.exit(1);
    });
}

module.exports = { seedTemplates };