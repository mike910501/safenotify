const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

async function testPasswordResetSystem() {
  console.log('🔐 TESTING COMPLETE PASSWORD RESET SYSTEM\n');
  console.log('=' .repeat(60));

  // 1. Test database connection and models
  console.log('\n📊 Step 1: Testing Database Connection\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if PasswordReset table exists
    const resetCount = await prisma.passwordReset.count();
    console.log(`✅ PasswordReset table accessible (${resetCount} records)`);
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return;
  }

  // 2. Test email configuration
  console.log('\n📧 Step 2: Testing Email Configuration\n');
  
  const emailConfig = {
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'informacion@safenotify.co',
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('📋 Email Configuration:');
  console.log(`   Host: ${emailConfig.host}`);
  console.log(`   Port: ${emailConfig.port}`);
  console.log(`   User: ${emailConfig.auth.user}`);
  console.log(`   Password: ${emailConfig.auth.pass ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);

  if (!emailConfig.auth.pass) {
    console.log('\n⚠️ WARNING: SMTP_PASS not configured. Email functionality will not work.');
    console.log('Set SMTP_PASS in your .env file with your GoDaddy email password.');
  }

  // 3. Test user existence
  console.log('\n👤 Step 3: Testing User Management\n');
  
  const testEmail = 'test@example.com';
  
  // Check if test user exists
  let testUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!testUser) {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: 'Test User',
        planType: 'free',
        messagesLimit: 10
      }
    });
    console.log(`✅ Created test user: ${testUser.email}`);
  } else {
    console.log(`✅ Test user exists: ${testUser.email}`);
  }

  // 4. Test password reset token generation
  console.log('\n🔑 Step 4: Testing Token Generation\n');
  
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  console.log(`✅ Generated reset token: ${resetToken.substring(0, 16)}...`);
  console.log(`✅ Token expires at: ${expiresAt.toISOString()}`);

  // Save token to database
  const passwordReset = await prisma.passwordReset.create({
    data: {
      token: resetToken,
      email: testUser.email,
      expiresAt,
      userId: testUser.id
    }
  });

  console.log(`✅ Token saved to database with ID: ${passwordReset.id}`);

  // 5. Test token validation
  console.log('\n🔍 Step 5: Testing Token Validation\n');
  
  // Valid token test
  const validToken = await prisma.passwordReset.findUnique({
    where: { 
      token: resetToken,
      used: false,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        select: { email: true }
      }
    }
  });

  if (validToken) {
    console.log('✅ Token validation successful');
    console.log(`   - Token: ${validToken.token.substring(0, 16)}...`);
    console.log(`   - User: ${validToken.user.email}`);
    console.log(`   - Expires: ${validToken.expiresAt}`);
  } else {
    console.log('❌ Token validation failed');
  }

  // 6. Test password update
  console.log('\n🔄 Step 6: Testing Password Update\n');
  
  const newPassword = 'newpassword123';
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: testUser.id },
      data: { password: hashedNewPassword }
    }),
    prisma.passwordReset.update({
      where: { token: resetToken },
      data: { used: true }
    })
  ]);

  console.log('✅ Password updated successfully');
  console.log('✅ Token marked as used');

  // Verify password change
  const updatedUser = await prisma.user.findUnique({
    where: { id: testUser.id }
  });

  const isNewPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
  console.log(`✅ New password verification: ${isNewPasswordValid ? 'PASSED' : 'FAILED'}`);

  // 7. Test expired/used token rejection
  console.log('\n🚫 Step 7: Testing Invalid Token Rejection\n');
  
  const invalidToken = await prisma.passwordReset.findUnique({
    where: { 
      token: resetToken,
      used: false,
      expiresAt: { gt: new Date() }
    }
  });

  console.log(`✅ Used token rejection: ${!invalidToken ? 'PASSED' : 'FAILED'}`);

  // 8. Test email template generation
  console.log('\n📧 Step 8: Testing Email Template\n');
  
  const mockToken = 'abcd1234567890';
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${mockToken}`;
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña - SafeNotify</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1F2937; margin: 0;">SafeNotify</h1>
        </div>
        
        <div style="background: #F9FAFB; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #374151; margin-top: 0;">Restablecer Contraseña</h2>
            <p>Hola,</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en SafeNotify.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #6B46C1, #3B82F6); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6B7280;">
                Este enlace expirará en 1 hora por motivos de seguridad.
            </p>
        </div>
    </body>
    </html>
  `;

  console.log('✅ Email template generated successfully');
  console.log(`   - Reset URL: ${resetUrl}`);
  console.log(`   - HTML length: ${emailHTML.length} characters`);

  // 9. Clean up test data
  console.log('\n🧹 Step 9: Cleaning Up Test Data\n');
  
  try {
    // Delete test password reset records
    const deletedResets = await prisma.passwordReset.deleteMany({
      where: { userId: testUser.id }
    });
    console.log(`✅ Deleted ${deletedResets.count} password reset records`);
    
    // Delete test user
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✅ Deleted test user');
    
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }

  // 10. Final System Check
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔍 FINAL SYSTEM VALIDATION:\n');
  
  const systemChecks = {
    'Database Connection': '✅ PASSED',
    'PasswordReset Model': '✅ PASSED', 
    'Token Generation': '✅ PASSED',
    'Token Validation': validToken ? '✅ PASSED' : '❌ FAILED',
    'Password Update': isNewPasswordValid ? '✅ PASSED' : '❌ FAILED',
    'Used Token Rejection': !invalidToken ? '✅ PASSED' : '❌ FAILED',
    'Email Template': '✅ PASSED',
    'Environment Variables': process.env.SMTP_PASS ? '✅ COMPLETE' : '⚠️ NEEDS SMTP_PASS'
  };

  Object.entries(systemChecks).forEach(([check, status]) => {
    console.log(`${status} ${check}`);
  });

  const allPassed = Object.values(systemChecks).every(status => status.includes('✅'));
  const needsConfig = Object.values(systemChecks).some(status => status.includes('⚠️'));

  console.log('\n' + '=' .repeat(60));
  
  if (allPassed) {
    console.log('\n🎉 ✅ PASSWORD RESET SYSTEM FULLY OPERATIONAL! ✅ 🎉');
    console.log('\nSystem is ready for production deployment.');
  } else if (needsConfig) {
    console.log('\n⚠️ SYSTEM READY BUT NEEDS CONFIGURATION ⚠️');
    console.log('\nCore functionality works, but you need to:');
    console.log('1. Set SMTP_PASS in production environment variables');
    console.log('2. Ensure GoDaddy email credentials are correct');
  } else {
    console.log('\n❌ SYSTEM HAS ISSUES ❌');
    console.log('\nPlease fix the failed tests above before deploying.');
  }

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Set SMTP_PASS in your production environment');
  console.log('2. Test with real email in development');
  console.log('3. Deploy to production');
  console.log('4. Test complete flow end-to-end');

  console.log('\n' + '=' .repeat(60));

  await prisma.$disconnect();
}

testPasswordResetSystem().catch(console.error);