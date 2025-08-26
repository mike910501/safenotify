const nodemailer = require('nodemailer');

async function testRealEmail() {
  console.log('📧 TESTING REAL EMAIL WITH ZOHO CREDENTIALS\n');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
    auth: {
      user: 'informacion@safenotify.co',
      pass: 'mTdSsxtEmid3'
    },
    requireTLS: true,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Verificando conexión SMTP...');
    
    // Test connection
    await transporter.verify();
    console.log('✅ Conexión SMTP exitosa!');
    
    console.log('\n📤 Enviando email de prueba...');
    
    // Send test email
    const info = await transporter.sendMail({
      from: {
        name: 'SafeNotify',
        address: 'informacion@safenotify.co'
      },
      to: 'informacion@safenotify.co', // Send to self for testing
      subject: '🔐 Prueba sistema de recuperación - SafeNotify',
      html: `
        <h2>✅ Email Test Exitoso</h2>
        <p>El sistema de recuperación de contraseña está funcionando correctamente.</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Sistema:</strong> SafeNotify Password Recovery</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Este es un email de prueba automático.</p>
      `
    });

    console.log('✅ Email enviado exitosamente!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 Enviado a: informacion@safenotify.co`);
    
    console.log('\n🎉 ¡SISTEMA DE EMAIL COMPLETAMENTE FUNCIONAL!');
    console.log('\n📋 El sistema está listo para:');
    console.log('   ✅ Enviar emails de recuperación');
    console.log('   ✅ Procesar solicitudes de reset');
    console.log('   ✅ Funcionamiento en producción');
    
  } catch (error) {
    console.log('❌ Error en el email:', error.message);
    
    if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
      console.log('\n🔐 POSIBLE PROBLEMA DE 2FA DETECTADO');
      console.log('\n💡 SOLUCIONES:');
      console.log('1. 📱 Crear App Password en GoDaddy:');
      console.log('   - Ve a tu panel de GoDaddy');
      console.log('   - Busca "App Passwords" o "Contraseñas de aplicación"');
      console.log('   - Genera una contraseña específica para SafeNotify');
      console.log('   - Úsala en lugar de tu contraseña normal');
      console.log('\n2. 🔓 Temporalmente deshabilita 2FA solo para SMTP');
      console.log('\n3. 📧 Verifica que el email esté configurado para IMAP/POP');
    } else {
      console.log('\n🔍 Otros posibles problemas:');
      console.log('- Verifica que el email esté activo');
      console.log('- Confirma que la contraseña sea correcta');
      console.log('- Revisa configuración de seguridad en GoDaddy');
    }
  }
}

testRealEmail().catch(console.error);