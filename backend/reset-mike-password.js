const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    // Nueva contraseña simple para testing
    const newPassword = 'SafeNotify2025!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔄 Actualizando contraseña para mikehuertas91@gmail.com...');
    
    const updatedUser = await prisma.user.update({
      where: {
        email: 'mikehuertas91@gmail.com'
      },
      data: {
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planType: true
      }
    });
    
    console.log('✅ Contraseña actualizada exitosamente!');
    console.log('👤 Usuario:', updatedUser.name);
    console.log('📧 Email:', updatedUser.email);
    console.log('🔑 Nueva contraseña:', newPassword);
    console.log('👑 Rol:', updatedUser.role);
    console.log('💎 Plan:', updatedUser.planType);
    console.log('');
    console.log('🚀 Ahora puedes hacer login con:');
    console.log('Email:', updatedUser.email);
    console.log('Contraseña:', newPassword);
    
  } catch (error) {
    console.error('❌ Error actualizando contraseña:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();