// Script para crear admin en producción
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminProduction() {
  try {
    console.log('🔧 Creando admin en producción...');
    
    const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
    
    // Intentar crear o actualizar
    const user = await prisma.user.upsert({
      where: { email: 'mikehuertas91@gmail.com' },
      update: {
        role: 'admin',
        planType: 'pro'
      },
      create: {
        email: 'mikehuertas91@gmail.com',
        password: hashedPassword,
        name: 'Mike Huertas Admin',
        role: 'admin',
        planType: 'pro'
      }
    });

    console.log('✅ Admin creado/actualizado:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminProduction();