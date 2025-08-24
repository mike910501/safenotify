const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Buscando usuario: mikehuertas91@gmail.com');
    
    const user = await prisma.user.findUnique({
      where: {
        email: 'mikehuertas91@gmail.com'
      }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Nombre:', user.name);
      console.log('Rol:', user.role);
      console.log('Plan:', user.planType);
      console.log('Mensajes usados:', user.messagesUsed);
      console.log('Límite de mensajes:', user.messagesLimit);
      console.log('Fecha de creación:', user.createdAt);
      console.log('Última actualización:', user.updatedAt);
      if (user.planExpiry) {
        console.log('Expiración del plan:', user.planExpiry);
      }
    } else {
      console.log('❌ Usuario no encontrado en la base de datos');
    }
    
    // También verificar total de usuarios
    const totalUsers = await prisma.user.count();
    console.log(`\n📊 Total de usuarios en la base de datos: ${totalUsers}`);
    
  } catch (error) {
    console.error('❌ Error consultando la base de datos:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();