// Crear usuario de prueba
require('dotenv').config();
const prisma = require('./db');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    console.log('Creando usuario de prueba...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'admin@safenotify.com',
        password: hashedPassword,
        name: 'Admin Test',
        role: 'admin', // Este será admin para probar funciones
        planType: 'pro'
      }
    });

    console.log('✅ Usuario creado:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      planType: user.planType
    });
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️ El usuario ya existe');
    } else {
      console.error('Error creando usuario:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();