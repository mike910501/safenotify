const fs = require('fs');
const path = require('path');

console.log('🔐 Adding password reset functionality to simple-server.js...\n');

const serverPath = path.join(__dirname, 'simple-server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');

// 1. Add nodemailer import
const nodemailerImport = `const nodemailer = require('nodemailer');
const crypto = require('crypto');
`;

// Find where to insert (after twilio import)
const twilioImportIndex = serverCode.indexOf("const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);");
if (twilioImportIndex !== -1) {
  const insertPoint = serverCode.indexOf('\n', twilioImportIndex) + 1;
  serverCode = serverCode.slice(0, insertPoint) + '\n' + nodemailerImport + serverCode.slice(insertPoint);
  console.log('✅ Added nodemailer and crypto imports');
}

// 2. Add email configuration function
const emailConfig = `
// Email configuration for GoDaddy
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
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
  });
};

// Generate secure token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Password reset email template
const createResetEmailHTML = (resetToken, userEmail) => {
  const resetUrl = \`\${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=\${resetToken}\`;
  
  return \`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña - SafeNotify</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #6B46C1, #3B82F6); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px;">📱</span>
            </div>
            <h1 style="color: #1F2937; margin: 0;">SafeNotify</h1>
        </div>
        
        <div style="background: #F9FAFB; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #374151; margin-top: 0;">Restablecer Contraseña</h2>
            <p>Hola,</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en SafeNotify asociada con el email: <strong>\${userEmail}</strong></p>
            <p>Si no realizaste esta solicitud, puedes ignorar este email de forma segura.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="\${resetUrl}" style="background: linear-gradient(135deg, #6B46C1, #3B82F6); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6B7280;">
                Este enlace expirará en 1 hora por motivos de seguridad.
            </p>
            <p style="font-size: 14px; color: #6B7280;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <span style="word-break: break-all;">\${resetUrl}</span>
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            <p>© 2024 SafeNotify. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
  \`;
};
`;

// Find where to insert email config (after JWT utilities)
const jwtUtilitiesEnd = serverCode.indexOf('const verifyToken = (token) => {');
const insertPoint2 = serverCode.indexOf('};', jwtUtilitiesEnd) + 2;
serverCode = serverCode.slice(0, insertPoint2) + '\n' + emailConfig + serverCode.slice(insertPoint2);
console.log('✅ Added email configuration and templates');

// 3. Add password reset endpoints
const passwordResetEndpoints = `
// Password Reset - Request reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔑 Password reset request for:', email);
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'El email es requerido'
      });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      // Security: Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      });
    }
    
    // Generate secure token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Save reset token to database
    await prisma.passwordReset.create({
      data: {
        token: resetToken,
        email: user.email,
        expiresAt,
        userId: user.id
      }
    });
    
    // Send email
    try {
      const transporter = createEmailTransporter();
      const htmlContent = createResetEmailHTML(resetToken, user.email);
      
      await transporter.sendMail({
        from: {
          name: 'SafeNotify',
          address: process.env.SMTP_USER || 'informacion@safenotify.co'
        },
        to: user.email,
        subject: 'Restablecer contraseña - SafeNotify',
        html: htmlContent
      });
      
      console.log('✅ Password reset email sent to:', user.email);
      
      res.json({
        success: true,
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      });
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      
      // Clean up the token since email failed
      await prisma.passwordReset.deleteMany({
        where: { token: resetToken }
      });
      
      res.status(500).json({
        success: false,
        error: 'Error enviando el email. Intente nuevamente.'
      });
    }
    
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Password Reset - Verify token
app.get('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Verifying reset token:', token.substring(0, 10) + '...');
    
    const resetRequest = await prisma.passwordReset.findUnique({
      where: { 
        token,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    if (!resetRequest) {
      return res.status(400).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
    
    res.json({
      success: true,
      email: resetRequest.user.email,
      message: 'Token válido'
    });
    
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando el token'
    });
  }
});

// Password Reset - Complete reset
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    console.log('🔄 Completing password reset for token:', token.substring(0, 10) + '...');
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token y nueva contraseña son requeridos'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Find valid reset request
    const resetRequest = await prisma.passwordReset.findUnique({
      where: { 
        token,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });
    
    if (!resetRequest) {
      return res.status(400).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordReset.update({
        where: { token },
        data: { used: true }
      })
    ]);
    
    console.log('✅ Password successfully reset for user:', resetRequest.user.email);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Password reset completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando la contraseña'
    });
  }
});
`;

// Find where to insert password reset endpoints (after the last auth endpoint)
const profileEndpoint = serverCode.indexOf("app.put('/api/auth/profile'");
const profileEndpointEnd = serverCode.indexOf('});', profileEndpoint) + 3;
serverCode = serverCode.slice(0, profileEndpointEnd) + '\n' + passwordResetEndpoints + serverCode.slice(profileEndpointEnd);
console.log('✅ Added password reset endpoints');

// Write the updated server file
fs.writeFileSync(serverPath, serverCode);
console.log('✅ simple-server.js updated successfully!');

console.log('\n📋 WHAT WAS ADDED:');
console.log('✓ Nodemailer and crypto imports');
console.log('✓ GoDaddy SMTP configuration');  
console.log('✓ Email templates for password reset');
console.log('✓ POST /api/auth/forgot-password - Request reset');
console.log('✓ GET /api/auth/reset-password/:token - Verify token');
console.log('✓ POST /api/auth/reset-password - Complete reset');

console.log('\n🔧 REQUIRED ENVIRONMENT VARIABLES:');
console.log('SMTP_USER=informacion@safenotify.co');
console.log('SMTP_PASS=your_email_password');
console.log('FRONTEND_URL=https://your-frontend-domain.com');

console.log('\n✅ Password reset functionality ready!');