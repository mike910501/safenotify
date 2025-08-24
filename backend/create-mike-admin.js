// Crear usuario admin para Mike
require('dotenv').config();
const prisma = require('./db');
const bcrypt = require('bcryptjs');

async function createMikeAdmin() {
  try {
    console.log('Creando usuario admin para Mike...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'mikehuertas91@gmail.com',
        password: hashedPassword,
        name: 'Mike Huertas',
        role: 'admin', // Admin con todos los permisos
        planType: 'pro'
      }
    });

    console.log('✅ Usuario admin creado:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      planType: user.planType
    });
    
    console.log('\n🔑 Credenciales:');
    console.log('Email: mikehuertas91@gmail.com');
    console.log('Password: password123');
    console.log('Rol: admin');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️ El usuario ya existe, actualizando a admin...');
      
      // Si ya existe, actualizarlo a admin
      const updatedUser = await prisma.user.update({
        where: { email: 'mikehuertas91@gmail.com' },
        data: {
          role: 'admin',
          planType: 'pro'
        }
      });
      
      console.log('✅ Usuario actualizado a admin:', {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        planType: updatedUser.planType
      });
    } else {
      console.error('Error creando usuario:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createMikeAdmin();