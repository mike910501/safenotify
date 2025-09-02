const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  console.log('🔍 CHECKING ADMIN USER CONFIGURATION\n');
  
  try {
    // Get all users to see their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        messagesUsed: true,
        messagesLimit: true
      }
    });
    
    console.log(`📊 Total users in database: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('❌ NO USERS FOUND');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Messages: ${user.messagesUsed}/${user.messagesLimit}`);
      console.log(`   Admin Access: ${user.role === 'admin' ? '✅ YES' : '❌ NO'}`);
      console.log('   ---');
    });
    
    const adminUsers = users.filter(u => u.role === 'admin');
    console.log(`\n👨‍💼 Admin users found: ${adminUsers.length}`);
    
    if (adminUsers.length === 0) {
      console.log('\n❌ NO ADMIN USERS FOUND!');
      console.log('To create an admin user, you need to:');
      console.log('1. Update a user\'s role to "admin" in the database');
      console.log('2. Or modify the signup process to create admin users');
      
      // Show how to make the first user admin
      if (users.length > 0) {
        const firstUser = users[0];
        console.log(`\n💡 To make "${firstUser.name}" an admin, run:`);
        console.log(`UPDATE "User" SET role = 'admin' WHERE email = '${firstUser.email}';`);
      }
    } else {
      console.log('\n✅ Admin users configured correctly!');
      adminUsers.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser().catch(console.error);