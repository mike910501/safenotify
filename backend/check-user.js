// Verificar usuario en base de datos
require('dotenv').config();
const prisma = require('./db');

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@safenotify.com' }
    });

    console.log('Usuario completo:', user);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();