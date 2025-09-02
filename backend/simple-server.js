require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Import routes and services
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const templatesAIRoutes = require('./routes/templatesAI');
const campaignProgressRoutes = require('./routes/campaignProgress');
const scheduledCampaignsRoutes = require('./routes/scheduledCampaigns');
const blacklistRoutes = require('./routes/blacklist');
const analyticsRoutes = require('./routes/analytics');
const schedulerService = require('./services/schedulerService');
const blacklistService = require('./services/blacklistService');

// Import WebSocket and Queue systems
let CampaignProgressTracker;
try {
  CampaignProgressTracker = require('./websocket/campaignProgress');
  console.log('✅ WebSocket module loaded');
} catch (error) {
  console.log('⚠️ WebSocket module skipped:', error.message);
  CampaignProgressTracker = null;
}
const http = require('http');

// Database connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple Twilio client
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3005;

// Test template endpoint - FOR DEBUGGING ONLY
app.post('/api/test-template-debug', async (req, res) => {
  try {
    console.log('🔍 TEST TEMPLATE DEBUG ENDPOINT');
    
    // Hardcoded test values
    const testPhone = '+573108800753';
    const contentSid = 'HX164c5aa2918cc699bedbe253ba2bf805';
    const contentVariables = {
      "1": "Juan TEST",
      "2": "Clínica TEST",
      "3": "Consulta TEST",
      "4": "28 Agosto TEST",
      "5": "Calle TEST",
      "6": "10:00 TEST"
    };
    
    console.log('📋 Test Configuration:');
    console.log('   Account SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('   WhatsApp:', process.env.TWILIO_WHATSAPP_NUMBER);
    console.log('   Content SID:', contentSid);
    console.log('   Variables:', JSON.stringify(contentVariables));
    
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${testPhone}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify(contentVariables)
    });
    
    console.log('✅ TEST MESSAGE SENT:', message.sid);
    
    res.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
      to: testPhone
    });
    
  } catch (error) {
    console.error('❌ TEST TEMPLATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo
    });
  }
});

// JWT utilities
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  console.log('🔑 Generate Token - JWT_SECRET env value:', process.env.JWT_SECRET);
  console.log('🔑 Generate Token - JWT_SECRET exists:', !!process.env.JWT_SECRET);
  console.log('🔑 Generate Token - Using secret:', secret.substring(0, 10) + '...');
  console.log('🔑 Generate Token - Full secret first 20 chars:', secret.substring(0, 20));
  return jwt.sign({ userId }, secret, { 
    expiresIn: '7d' 
  });
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  console.log('🔓 Verify Token - JWT_SECRET env value:', process.env.JWT_SECRET);
  console.log('🔓 Verify Token - JWT_SECRET exists:', !!process.env.JWT_SECRET);
  console.log('🔓 Verify Token - Using secret:', secret.substring(0, 10) + '...');
  console.log('🔓 Verify Token - Full secret first 20 chars:', secret.substring(0, 20));
  return jwt.verify(token, secret);
};

// Email configuration for Zoho
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'informacion@safenotify.co',
      pass: process.env.SMTP_PASS
    },
    requireTLS: true,
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
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  return `
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
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en SafeNotify asociada con el email: <strong>${userEmail}</strong></p>
            <p>Si no realizaste esta solicitud, puedes ignorar este email de forma segura.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #6B46C1, #3B82F6); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <p style="font-size: 14px; color: #6B7280;">
                Este enlace expirará en 1 hora por motivos de seguridad.
            </p>
            <p style="font-size: 14px; color: #6B7280;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <span style="word-break: break-all;">${resetUrl}</span>
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            <p>© 2024 SafeNotify. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
  `;
};


// Middleware - CORS configurado para desarrollo y producción
app.use(cors({
  origin: [
    // Desarrollo - todos los puertos locales comunes
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    // Producción - Render y dominios custom
    process.env.FRONTEND_URL,
    // Cualquier subdominio de onrender.com para Render
    /^https:\/\/.*\.onrender\.com$/,
    // Dominios de producción adicionales si los hay
    process.env.PRODUCTION_DOMAIN
  ].filter(Boolean), // Filtra valores undefined/null
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(cookieParser());
app.use(express.json());

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SafeNotify Backend API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: PORT
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'SafeNotify Backend API v1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api': 'This documentation',
      'POST /api/test-message': 'Send test message',
      'GET /api/templates': 'List templates'
    }
  });
});

// Get templates
app.get('/api/templates', (req, res) => {
  const templates = [
    {
      sid: process.env.TEMPLATE_APPOINTMENT_CONFIRMATION,
      name: 'Confirmación de Citas',
      variables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
      status: 'approved'
    },
    {
      sid: process.env.TEMPLATE_APPOINTMENT_REMINDER,
      name: 'Recordatorio de Citas', 
      variables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
      status: 'approved'
    }
  ];
  
  res.json({
    success: true,
    templates: templates.filter(t => t.sid)
  });
});

// Test message endpoint
app.post('/api/test-message', (req, res) => {
  const { to, templateSid, variables } = req.body;
  
  console.log('Sending test message:', { to, templateSid, variables });
  
  // For now, just simulate success
  res.json({
    success: true,
    message: 'Message would be sent successfully',
    data: { to, templateSid, variables }
  });
});

// Real auth endpoints using PostgreSQL
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔑 Login attempt for:', email);
    console.log('🚀 LOGIN - JWT_SECRET from env:', process.env.JWT_SECRET);
    console.log('🚀 LOGIN - Will use secret for token:', (process.env.JWT_SECRET || 'fallback-secret').substring(0, 20));
    
    // Validación básica
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }
    
    // Buscar usuario en PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        planType: true,
        planExpiry: true,
        messagesUsed: true,
        messagesLimit: true
      }
    });
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    console.log('✅ User found:', user.email, 'Role:', user.role);
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    console.log('✅ Password valid for user:', email);
    
    // Generar token real
    const token = generateToken(user.id);
    
    // Set cookie for authentication
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // No enviar contraseña en la respuesta
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      token
    });
    
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('🔐 Register attempt for:', email);
    
    // Validación básica
    if (!email || !password || !name) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Nombre, email y contraseña son requeridos'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(409).json({
        success: false,
        error: 'Este email ya está registrado'
      });
    }
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
        planType: 'free',
        messagesLimit: 10,
        messagesUsed: 0
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        planType: true,
        planExpiry: true,
        messagesUsed: true,
        messagesLimit: true
      }
    });
    
    console.log('✅ User created successfully:', newUser.email, 'ID:', newUser.id);
    
    // Generar token JWT con el ID real del usuario
    const token = generateToken(newUser.id);
    
    // Set cookie for authentication
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Respuesta exitosa con datos reales del usuario
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        planType: newUser.planType,
        messagesUsed: newUser.messagesUsed,
        messagesLimit: newUser.messagesLimit,
        planExpiry: newUser.planExpiry,
        createdAt: newUser.createdAt
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Error in registration:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Middleware to verify JWT from cookie or header
const authenticateToken = async (req, res, next) => {
  console.log('🔐 Authentication middleware hit for:', req.method, req.path);
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    console.log('🔑 Token found:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }
    
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId };
    console.log('✅ Authentication successful for user:', decoded.userId);
    next();
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planType: true,
        messagesUsed: true,
        messagesLimit: true,
        planExpiry: true,
        createdAt: true,
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            sentCount: true,
            errorCount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Calcular estadísticas
    const totalCampaigns = await prisma.campaign.count({
      where: { userId: req.user.id }
    });

    const totalMessagesSent = await prisma.campaign.aggregate({
      where: { userId: req.user.id },
      _sum: {
        sentCount: true
      }
    });

    const stats = {
      totalCampaigns,
      totalMessagesSent: totalMessagesSent._sum.sentCount || 0,
      messagesRemaining: user.messagesLimit - user.messagesUsed,
      percentageUsed: user.messagesLimit > 0 
        ? Math.round((user.messagesUsed / user.messagesLimit) * 100)
        : 0
    };

    res.json({
      success: true,
      user,
      stats
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información del usuario'
    });
  }
});

// Templates AI endpoints
// Get user's own templates (for "My Templates" section)
app.get('/api/templates-ai/my-templates', authenticateToken, async (req, res) => {
  try {
    const userTemplates = await prisma.template.findMany({
      where: {
        userId: req.user.id,
        status: {
          in: ['approved', 'active', 'pending']
        }
      },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        variables: true,
        status: true,
        twilioSid: true,
        twilioTemplateId: true,
        createdAt: true,
        usageCount: true
      }
    });

    console.log(`📋 Returning ${userTemplates.length} user templates for user ${req.user.id}`);
    res.json({
      success: true,
      templates: userTemplates
    });

  } catch (error) {
    console.error('Error fetching user templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las plantillas del usuario'
    });
  }
});

// Get all available templates (user + public system templates for campaign creation)
app.get('/api/templates-ai/approved', authenticateToken, async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: {
        OR: [
          { status: 'approved' },
          { status: 'active' },
          { isPublic: true }
        ]
      },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        variables: true,
        status: true,
        isPublic: true,
        usageCount: true,
        createdAt: true,
        twilioSid: true,
        twilioTemplateId: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Returning ${templates.length} approved templates`);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching approved templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plantillas aprobadas'
    });
  }
});

app.get('/api/templates-ai', authenticateToken, async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: {
        userId: req.user.id
      },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        variables: true,
        status: true,
        isPublic: true,
        aiApproved: true,
        aiScore: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Returning ${templates.length} user templates for ${req.user.id}`);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plantillas del usuario'
    });
  }
});

// Import the new validation function
const validateTemplateWithAI = require('./validate-endpoint.js');

// Template validation with AI
app.post('/api/templates-ai/validate', authenticateToken, validateTemplateWithAI);

// Create template with AI validation
app.post('/api/templates-ai/create', authenticateToken, async (req, res) => {
  try {
    const { name, content, category, variables, validationData } = req.body;
    
    if (!name || !content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, content and category are required'
      });
    }

    // Create template in database
    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        category: category,
        variables: variables || [],
        status: 'pending', // Starts as pending for manual review
        userId: req.user.id,
        isPublic: false,
        aiScore: validationData?.score || 0,
        adminNotes: validationData?.score >= 90 
          ? 'Alta calidad - Revisión prioritaria' 
          : 'Pendiente de revisión manual'
      }
    });

    // Generate professional message based on AI score
    let message;
    const score = validationData?.score || 0;
    
    if (score >= 90) {
      message = `Plantilla "${name}" registrada con éxito. Score de calidad: ${score}/100. Procesamiento prioritario en las próximas 24 horas.`;
    } else if (score >= 80) {
      message = `Plantilla "${name}" enviada para revisión. Score: ${score}/100. Tiempo estimado de aprobación: 24-48 horas.`;
    } else if (score >= 70) {
      message = `Plantilla "${name}" recibida. Score: ${score}/100. Nuestro equipo revisará y podría sugerir mejoras. Tiempo estimado: 48-72 horas.`;
    } else {
      message = `Plantilla "${name}" en proceso de revisión manual. Score: ${score}/100. Le notificaremos el resultado en 72 horas.`;
    }

    res.json({
      success: true,
      message,
      template: {
        id: template.id,
        name: template.name,
        status: template.status,
        score: score,
        estimatedTime: score >= 90 ? '24 horas' : score >= 80 ? '24-48 horas' : '48-72 horas'
      }
    });
    
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating template'
    });
  }
});

// OLD VALIDATION CODE - TO BE REMOVED
app.post('/api/templates-ai/validate-old', authenticateToken, async (req, res) => {
  try {
    const { content, category } = req.body;
    
    if (!content || !category) {
      return res.status(400).json({
        success: false,
        error: 'Content and category are required'
      });
    }

    // Extract variables from template
    const variablePattern = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variablePattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    // Call OpenAI API for intelligent analysis
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `Eres un experto en marketing por SMS y WhatsApp. Tu tarea es mejorar plantillas de mensajes.
              
              IMPORTANTE:
              1. Mantén TODAS las variables que el usuario ya creó (formato {{variable}})
              2. Mejora el mensaje haciéndolo más profesional y efectivo
              3. Agrega emojis apropiados para mejor engagement
              4. Incluye un llamado a la acción claro
              5. El mensaje debe ser conciso (máximo 320 caracteres ideal)
              6. Si es un recordatorio, debe incluir forma de confirmar
              7. Si es promoción, debe crear urgencia
              8. Responde SOLO con el mensaje mejorado, sin explicaciones adicionales`
            },
            {
              role: 'user',
              content: `Mejora esta plantilla de ${category}:
              
              Mensaje original: ${content}
              Variables detectadas: ${variables.join(', ')}
              
              Devuelve SOLO el mensaje mejorado usando TODAS las variables detectadas.`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      let improvedContent = content;
      let aiSuggestions = [];
      
      if (openAIResponse.ok) {
        const aiData = await openAIResponse.json();
        if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
          improvedContent = aiData.choices[0].message.content.trim();
        }
      }
      
      // Generate smart suggestions based on analysis
      const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(improvedContent);
      const hasCallToAction = /\b(llamar|confirmar|responder|contactar|visitar|clic|agenda|reserva)\b/i.test(improvedContent);
      
      let aiScore = 85;
      
      if (hasEmojis) aiScore += 5;
      if (hasCallToAction) aiScore += 10;
      if (variables.length > 0) aiScore += 5;
      
      // Generate suggestions
      if (!hasEmojis) {
        aiSuggestions.push('😊 Considera agregar emojis para mejorar el engagement');
      }
      
      if (!variables.includes('nombre')) {
        aiSuggestions.push('👤 Agrega {{nombre}} para personalizar el saludo');
      }
      
      if (category === 'recordatorio' && !variables.includes('fecha')) {
        aiSuggestions.push('📅 Incluye {{fecha}} para especificar cuándo es la cita');
      }
      
      if (!hasCallToAction) {
        aiSuggestions.push('📢 Agrega un llamado a la acción claro');
      }
      
      aiScore = Math.min(100, aiScore);
      
      // Use the AI-improved content and suggestions
      suggestions = aiSuggestions;
      
    } catch (aiError) {
      console.error('OpenAI API Error:', aiError);
      // Fallback to basic improvement if AI fails
      improvedContent = content;
      
      // Add basic improvements as fallback
      if (!content.includes('{{nombre}}')) {
        improvedContent = `Hola {{nombre}}! ${content}`;
      }
      if (category === 'recordatorio' && !content.includes('confirmar')) {
        improvedContent += '\n\nPara confirmar responde SI.';
      }
      
      suggestions.push('⚠️ La IA no pudo procesar. Usando mejoras básicas.');
      aiScore = 75;
    }
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(content);
    const hasCallToAction = /\b(llamar|confirmar|responder|contactar|visitar|clic|agenda)\b/i.test(content);
    const hasProfessionalTone = /\b(estimado|cordial|atentamente|gracias|favor)\b/i.test(content);
    
    // Score adjustments
    if (hasPersonalization) aiScore += 5;
    if (hasEmojis) aiScore += 3;
    if (hasCallToAction) aiScore += 5;
    if (hasProfessionalTone) aiScore += 2;
    
    // Length analysis
    if (content.length < 50) {
      aiScore -= 10;
      suggestions.push('⚠️ Mensaje muy corto. Agrega más contexto para mayor claridad.');
    } else if (content.length > 320) {
      aiScore -= 5;
      suggestions.push('📏 Mensaje largo. Los SMS de más de 160 caracteres se dividen en múltiples partes.');
    }
    
    // Improve the user's template based on their content and variables
    improvedContent = content;
    
    // Add emoji at the beginning if missing
    if (!hasEmojis) {
      if (category === 'recordatorio' || category === 'reminder') {
        improvedContent = '🔔 ' + improvedContent;
      } else if (category === 'promocion' || category === 'promotion') {
        improvedContent = '🎉 ' + improvedContent;
      } else if (category === 'confirmacion' || category === 'confirmation') {
        improvedContent = '✅ ' + improvedContent;
      } else {
        improvedContent = '💬 ' + improvedContent;
      }
    }
    
    // Add personalization if missing
    if (!variables.includes('nombre')) {
      // If content starts with generic greeting, replace it
      improvedContent = improvedContent.replace(/^(Hola|Buenos días|Buenas tardes)/i, '$1 {{nombre}}');
      // If no greeting, add one
      if (!improvedContent.match(/^(Hola|Buenos días|Buenas tardes)/i)) {
        improvedContent = `Hola {{nombre}}! ${improvedContent}`;
      }
    }
    
    // Category-specific improvements
    if (category === 'recordatorio' || category === 'reminder') {
      // Add call to action if missing
      if (!hasCallToAction) {
        improvedContent += '\n\nPara confirmar responde SI o llama al {{telefono_contacto}}.';
      }
      
      // Suggestions based on missing elements
      if (!variables.includes('fecha')) {
        suggestions.push('📆 Agrega {{fecha}} para especificar cuándo es la cita.');
      }
      if (!variables.includes('hora')) {
        suggestions.push('⏰ Incluye {{hora}} para indicar el horario exacto.');
      }
      if (!content.toLowerCase().includes('cita') && !content.toLowerCase().includes('servicio')) {
        suggestions.push('📅 Menciona el tipo de servicio o que es una "cita" para mayor claridad.');
      }
    }
    
    if (category === 'promocion' || category === 'promotion') {
      // Add urgency if missing
      if (!content.toLowerCase().includes('limit') && !content.toLowerCase().includes('hasta')) {
        improvedContent += '\n\n⏰ Oferta por tiempo limitado.';
      }
      
      // Add call to action if missing
      if (!hasCallToAction) {
        improvedContent += '\n\n📲 Reserva ahora respondiendo QUIERO o llamando al {{telefono}}.';
      }
      
      // Suggestions
      if (!variables.includes('descuento') && !variables.includes('oferta')) {
        suggestions.push('💰 Considera agregar {{descuento}} para personalizar el valor de la oferta.');
      }
      if (!hasEmojis || !improvedContent.includes('💥')) {
        suggestions.push('🎯 Usa más emojis para destacar la promoción (💥, 🎁, 🔥).');
      }
    }
    
    if (category === 'confirmacion' || category === 'confirmation') {
      // Ensure confirmation language
      if (!content.toLowerCase().includes('confirm')) {
        improvedContent = improvedContent.replace(/tu (cita|reserva|pedido)/i, 'tu $1 está confirmada');
      }
      
      // Add reference number if missing
      if (!variables.includes('codigo') && !variables.includes('numero')) {
        improvedContent += '\n\nNúmero de confirmación: {{codigo_confirmacion}}';
      }
      
      suggestions.push('✅ Asegúrate de incluir detalles claros de lo que está confirmado.');
    }
    
    // Add signature if missing
    if (!variables.includes('empresa') && !variables.includes('nombre_empresa')) {
      improvedContent += '\n\n{{nombre_empresa}} 💙';
    }
    
    // Polish the improved content
    improvedContent = improvedContent.trim();
    
    // Only show improved template if it's actually different
    if (improvedContent === content) {
      improvedContent = null;
    }
    
    // General suggestions based on analysis
    if (!hasPersonalization && !variables.includes('nombre')) {
      aiScore -= 15;
      suggestions.push('🚨 Agrega {{nombre}} para personalizar el mensaje.');
    }
    
    if (!hasEmojis) {
      suggestions.push('😊 Los emojis mejoran la tasa de apertura en un 20%.');
    }
    
    if (!hasCallToAction) {
      suggestions.push('📢 Incluye un llamado a la acción claro (responder, llamar, visitar).');
    }
    
    if (content.length > 320) {
      suggestions.push('📏 Mensaje largo. Se enviará en múltiples SMS (160 caracteres cada uno).');
    }
    
    if (variables.length === 0) {
      suggestions.push('⚡ Sin variables de personalización. Agrega al menos {{nombre}}.');
    }
    
    // Generate Excel format suggestion
    const excelColumns = [];
    
    // Always include basic columns
    excelColumns.push({ column: 'nombre', description: 'Nombre completo del cliente', example: 'María García' });
    excelColumns.push({ column: 'telefono', description: 'Número con código de país', example: '+573001234567' });
    
    // Add columns based on detected variables
    variables.forEach(variable => {
      if (variable === 'fecha') {
        excelColumns.push({ column: 'fecha', description: 'Fecha en formato DD/MM/YYYY', example: '25/01/2024' });
      } else if (variable === 'hora') {
        excelColumns.push({ column: 'hora', description: 'Hora en formato HH:MM', example: '14:30' });
      } else if (variable === 'servicio') {
        excelColumns.push({ column: 'servicio', description: 'Tipo de servicio o producto', example: 'Consulta Médica' });
      } else if (variable === 'doctor' || variable === 'profesional') {
        excelColumns.push({ column: variable, description: 'Nombre del profesional', example: 'Dr. Juan Pérez' });
      } else if (variable === 'ubicacion' || variable === 'direccion') {
        excelColumns.push({ column: variable, description: 'Dirección o sede', example: 'Sede Centro - Calle 50 #20-30' });
      } else if (variable === 'descuento' || variable === 'oferta') {
        excelColumns.push({ column: variable, description: 'Porcentaje o valor', example: '20' });
      } else if (!['nombre', 'telefono'].includes(variable)) {
        excelColumns.push({ column: variable, description: 'Valor personalizado', example: 'Texto ejemplo' });
      }
    });
    
    // Cap score at 100
    aiScore = Math.min(Math.max(aiScore, 0), 100);
    
    // Cost calculation
    const messageSegments = Math.ceil(improvedContent.length / 160);
    const estimatedCost = `$${(0.01 * messageSegments).toFixed(2)} por mensaje (${messageSegments} segmento${messageSegments > 1 ? 's' : ''})`;

    const response = {
      success: true,
      validation: {
        isValid: aiScore >= 70,
        score: aiScore,
        variables,
        characterCount: content.length,
        messageSegments,
        suggestions,
        estimatedCost,
        improvedTemplate: improvedContent !== content ? improvedContent : null,
        excelFormat: {
          description: '📊 Formato sugerido para tu archivo Excel/CSV:',
          columns: excelColumns,
          example: '💡 Primera fila debe contener los nombres de las columnas exactamente como aparecen.',
          downloadUrl: null
        },
        tips: [
          '💬 Mantén los mensajes bajo 160 caracteres para un solo SMS',
          '🎯 Usa variables para personalización masiva',
          '⏰ Programa envíos en horarios comerciales (9am-7pm)',
          '✅ Siempre incluye forma de contacto o respuesta'
        ]
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({
      success: false,
      error: 'Error validating template'
    });
  }
});

app.get('/api/templates-ai/stats/user', authenticateToken, async (req, res) => {
  try {
    const statusStats = await prisma.template.groupBy({
      by: ['status'],
      where: {
        userId: req.user.id
      },
      _count: {
        id: true
      }
    });

    const categoryStats = await prisma.template.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id
      },
      _count: {
        id: true
      }
    });

    const totalTemplates = await prisma.template.count({
      where: { userId: req.user.id }
    });

    const result = {
      total: totalTemplates,
      byStatus: {},
      categories: {}
    };

    statusStats.forEach(stat => {
      result.byStatus[stat.status] = stat._count.id;
    });

    categoryStats.forEach(stat => {
      result.categories[stat.category] = stat._count.id;
    });

    console.log(`📊 Returning stats: ${totalTemplates} total, ${statusStats.length} status types, ${categoryStats.length} categories`);

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de plantillas'
    });
  }
});

// UPDATE template endpoint - was missing!
app.put('/api/templates-ai/:id', authenticateToken, async (req, res) => {
  try {
    const templateId = req.params.id;
    const { name, content, category, variables } = req.body;

    // Verify that the template belongs to the user
    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: req.user.id
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    // Update template
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        ...(name && { name }),
        ...(content && { content }),
        ...(category && { category }),
        ...(variables && { variables }),
        // If content is modified, requires new approval
        ...(content && content !== existingTemplate.content && { 
          status: 'pending',
          aiApproved: false 
        })
      }
    });

    console.log(`✅ Template actualizada: ${updatedTemplate.name}`);

    res.json({
      success: true,
      template: updatedTemplate,
      message: content && content !== existingTemplate.content 
        ? 'Template actualizada - requiere nueva validación IA' 
        : 'Template actualizada'
    });

  } catch (error) {
    console.error('Error actualizando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET specific template endpoint
app.get('/api/templates-ai/:id', authenticateToken, async (req, res) => {
  try {
    const templateId = req.params.id;

    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId: req.user.id },
          { isPublic: true }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    res.json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('Error obteniendo template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// DELETE template endpoint - was missing!
app.delete('/api/templates-ai/:id', authenticateToken, async (req, res) => {
  try {
    const templateId = req.params.id;

    // Verify that the template belongs to the user
    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: req.user.id
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    // Check if template is being used in active campaigns
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        templateId: templateId,
        status: {
          in: ['draft', 'sending']
        }
      }
    });

    if (activeCampaigns.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una template que está siendo usada en campañas activas'
      });
    }

    // Delete template
    await prisma.template.delete({
      where: { id: templateId }
    });

    console.log(`🗑️ Template eliminada: ${existingTemplate.name}`);

    res.json({
      success: true,
      message: 'Template eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Admin functionality moved to routes/admin.js

// Campaign endpoints
// File upload setup for campaigns
const campaignUpload = multer({ dest: 'uploads/' });

// Import campaign queue system
const { addCampaignJob } = require('./jobs/campaignQueue');

// Create campaign - Enhanced with queue system
app.post('/api/campaigns/create', authenticateToken, campaignUpload.single('csvFile'), async (req, res) => {
  console.log('🚀 Enhanced Campaign create endpoint hit');
  try {
    const { name, templateSid, variableMappings, defaultValues } = req.body;
    const csvFile = req.file;
    console.log('📋 Request body:', { name, templateSid, variableMappings, defaultValues });

    // IMPROVED JSON sanitization for FormData corruption
    const sanitizeJson = (jsonString) => {
      if (!jsonString) return '{}';
      
      try {
        let cleaned = jsonString.trim();
        console.log('🔧 Sanitizing JSON:', cleaned);
        
        // Fix common FormData corruptions
        cleaned = cleaned.replace(/^"?\{/, '{');        // Remove opening quotes
        cleaned = cleaned.replace(/\}"?$/, '}');        // Remove closing quotes
        cleaned = cleaned.replace(/"\{([^"]+)"/g, '"$1"'); // Fix key corruption
        
        // Ensure proper closing
        if (!cleaned.endsWith('}')) {
          cleaned += '}';
        }
        
        console.log('🔧 Cleaned JSON:', cleaned);
        
        // Validate
        JSON.parse(cleaned);
        return cleaned;
        
      } catch (error) {
        console.warn('⚠️ JSON sanitization failed, using fallback:', jsonString);
        return '{}';
      }
    };

    const sanitizedVariableMappings = sanitizeJson(variableMappings);
    const sanitizedDefaultValues = sanitizeJson(defaultValues);
    
    console.log('✅ Final sanitized mappings:', sanitizedVariableMappings);
    console.log('✅ Final sanitized defaults:', sanitizedDefaultValues);
    console.log('📁 File:', csvFile ? 'Present' : 'Missing');

    if (!csvFile) {
      return res.status(400).json({
        success: false,
        error: 'Archivo CSV es requerido'
      });
    }

    // Read and validate CSV file with enhanced error handling
    const fs = require('fs');
    let totalContactsToSend = 0;
    let csvBuffer = null;
    
    try {
      csvBuffer = fs.readFileSync(csvFile.path);
      const csvContent = csvBuffer.toString('utf8');
      const csvLines = csvContent.split('\n').filter(line => line.trim());
      
      if (csvLines.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'El archivo CSV debe contener al menos una fila de datos'
        });
      }
      
      const headers = csvLines[0].split(',').map(h => h.trim());
      
      // Build contacts array and validate against blacklist
      const contacts = [];
      const phoneNumbers = [];
      
      for (let i = 1; i < csvLines.length; i++) {
        const values = csvLines[i].split(',').map(v => v.trim());
        const contact = {};
        headers.forEach((header, index) => {
          contact[header] = values[index] || '';
        });
        
        const phoneNumber = contact.telefono || contact.phone || contact.Phone || contact.celular;
        if (phoneNumber) {
          contacts.push(contact);
          phoneNumbers.push(phoneNumber);
        }
      }
      
      console.log(`📊 Total contacts found: ${contacts.length}`);
      
      if (contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No se encontraron contactos válidos en el archivo CSV'
        });
      }
      
      // Validate against blacklist
      console.log('🛡️ Validating contacts against blacklist...');
      const blacklistValidation = await blacklistService.validateNumbers(phoneNumbers);
      
      console.log(`🛡️ Blacklist validation results:`, {
        total: blacklistValidation.total,
        valid: blacklistValidation.valid,
        blacklisted: blacklistValidation.blacklisted
      });
      
      if (blacklistValidation.blacklisted > 0) {
        console.log(`⚠️ Found ${blacklistValidation.blacklisted} blacklisted numbers`);
        
        // Log blacklisted numbers for admin review
        blacklistValidation.blacklistedNumbers.forEach(blocked => {
          console.log(`🚫 Blacklisted: ${blocked.phoneNumber} - Reason: ${blocked.reason}`);
        });
        
        // Option 1: Block entire campaign if any blacklisted numbers found (strict)
        // Uncomment this for strict mode:
        /*
        return res.status(400).json({
          success: false,
          error: `Se encontraron ${blacklistValidation.blacklisted} números en lista negra. Revisa y remueve estos números del archivo CSV.`,
          blacklistedNumbers: blacklistValidation.blacklistedNumbers
        });
        */
        
        // Option 2: Continue with valid numbers only (permissive - current implementation)
        totalContactsToSend = blacklistValidation.valid;
        console.log(`✅ Continuing with ${totalContactsToSend} valid numbers, skipping ${blacklistValidation.blacklisted} blacklisted`);
      } else {
        totalContactsToSend = blacklistValidation.total;
      }
      
      if (totalContactsToSend === 0) {
        return res.status(400).json({
          success: false,
          error: 'Todos los números están en lista negra. No se puede proceder con el envío.',
          blacklistedNumbers: blacklistValidation.blacklistedNumbers
        });
      }
      
    } catch (error) {
      console.error('Error reading CSV file:', error);
      return res.status(400).json({
        success: false,
        error: 'Error al procesar archivo CSV. Verifica que el formato sea correcto.'
      });
    }

    // Validate user plan limits with enhanced messaging
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        name: true,
        messagesUsed: true,
        messagesLimit: true,
        planType: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const messagesAvailable = currentUser.messagesLimit - currentUser.messagesUsed;
    
    console.log(`📋 Plan validation:`, {
      planType: currentUser.planType,
      messagesUsed: currentUser.messagesUsed,
      messagesLimit: currentUser.messagesLimit,
      messagesAvailable: messagesAvailable,
      contactsToSend: totalContactsToSend
    });

    if (totalContactsToSend > messagesAvailable) {
      console.log('🚫 LÍMITE EXCEDIDO - BLOQUEANDO ENVÍO');
      return res.status(403).json({
        success: false,
        error: 'Límite de mensajes excedido',
        details: {
          required: totalContactsToSend,
          available: messagesAvailable,
          planType: currentUser.planType,
          messagesUsed: currentUser.messagesUsed,
          messagesLimit: currentUser.messagesLimit,
          suggestion: messagesAvailable > 0 
            ? `Puedes enviar hasta ${messagesAvailable} mensajes con tu plan actual` 
            : 'Actualiza tu plan para enviar más mensajes'
        }
      });
    }

    if (!templateSid) {
      return res.status(400).json({
        success: false,
        error: 'Template SID es requerido'
      });
    }

    // Find template with enhanced search
    const template = await prisma.template.findFirst({
      where: {
        OR: [
          { twilioSid: templateSid },
          { twilioContentSid: templateSid },
          { twilioTemplateId: templateSid },
          { name: templateSid }
        ],
        AND: {
          OR: [
            { isPublic: true },
            { userId: req.user.id }
          ]
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada o no disponible'
      });
    }

    console.log('📋 Template found:', `${template.name} (${template.id})`);

    // Create campaign record in 'queued' status
    const campaign = await prisma.campaign.create({
      data: {
        name: name || `Campaign ${new Date().toLocaleString()}`,
        templateId: template.id,
        userId: req.user.id,
        status: 'queued',
        totalContacts: totalContactsToSend,
        sentCount: 0,
        errorCount: 0,
        sentAt: new Date()
      }
    });

    console.log(`📝 Campaign created in queue: ${campaign.name} (${campaign.id})`);

    // Add job to queue for background processing with priority
    const jobOptions = {
      delay: 1000, // Start processing in 1 second
      priority: currentUser.planType === 'enterprise' ? 1 : 
                currentUser.planType === 'pro' ? 2 : 3, // Enterprise gets highest priority
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 5, // Keep last 5 completed jobs
      removeOnFail: 20     // Keep last 20 failed jobs
    };

    // Try to use queue system, fallback to immediate processing if queue is unavailable
    let useQueue = true;
    let job = null;
    
    try {
      console.log('🔄 Attempting to add job to Bull Queue...');
      job = await addCampaignJob({
        campaignId: campaign.id,
        csvBuffer: csvBuffer,
        template: template,
        userId: req.user.id,
        userName: currentUser.name || 'Usuario',
        variableMappings: JSON.parse(sanitizedVariableMappings),
        defaultValues: JSON.parse(sanitizedDefaultValues)
      }, jobOptions);
      
      console.log(`⏳ Campaign job queued: ${job.id} with priority ${jobOptions.priority}`);
      
    } catch (queueError) {
      console.error('⚠️ Queue system unavailable, falling back to immediate processing:', queueError.message);
      useQueue = false;
    }

    // Clean up uploaded file immediately for security
    try {
      fs.unlinkSync(csvFile.path);
      console.log('🗑️ CSV file deleted for security');
    } catch (cleanupError) {
      console.error('⚠️ Could not delete CSV file:', cleanupError.message);
    }

    if (useQueue && job) {
      // Return immediate response - processing will happen in background
      res.json({
        success: true,
        message: 'Campaña agregada a la cola de procesamiento. Comenzará el envío en unos segundos.',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: 'queued',
          totalContacts: totalContactsToSend,
          template: template.name,
          jobId: job.id,
          estimatedStartTime: new Date(Date.now() + jobOptions.delay).toISOString(),
          priority: jobOptions.priority
        }
      });
    } else {
      // Fallback: Process immediately like the old system
      console.log('🔄 Processing campaign immediately (queue unavailable)...');
      
      // Update campaign status to processing
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'processing' }
      });
      
      // Process CSV and send messages immediately
      let sentCount = 0;
      let errorCount = 0;
      
      try {
        const csvContent = csvBuffer.toString('utf8');
        const csvLines = csvContent.split('\n').filter(line => line.trim());
        const headers = csvLines[0].split(',').map(h => h.trim());
        
        console.log('📋 CSV Headers for immediate processing:', headers);
        
        // Process each contact
        for (let i = 1; i < csvLines.length; i++) {
          const values = csvLines[i].split(',').map(v => v.trim());
          const contact = {};
          headers.forEach((header, index) => {
            contact[header] = values[index] || '';
          });
          
          if (contact.telefono || contact.phone || contact.Phone || contact.celular) {
            console.log(`📤 Processing contact ${i}: ${contact.nombre || 'Unknown'} - ${contact.telefono || contact.phone}`);
            
            try {
              const phoneNumber = contact.telefono || contact.phone || contact.Phone || contact.celular;
              const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+57${phoneNumber}`;
              const whatsappNumber = `whatsapp:${formattedPhone}`;

              // Build template variables using PROPER MAPPING LOGIC
              const templateVariables = {};
              let defaultVals = {};
              let varMappings = {};
              
              try {
                defaultVals = JSON.parse(sanitizedDefaultValues);
                varMappings = JSON.parse(sanitizedVariableMappings);
                console.log('🔧 Using mappings:', varMappings);
                console.log('🔧 Using defaults:', defaultVals);
              } catch (e) {
                console.error('⚠️ Could not parse variables:', e.message);
                defaultVals = {};
                varMappings = {};
              }
              
              if (template.variables && Array.isArray(template.variables)) {
                template.variables.forEach((varName) => {
                  let value = '';
                  
                  // Priority: userMapping -> defaultValue -> csvColumn -> empty
                  if (varMappings[varName]) {
                    // User mapped this variable to a CSV column
                    const csvColumn = varMappings[varName];
                    value = contact[csvColumn] || '';
                    console.log(`📋 ${varName} -> mapped to CSV '${csvColumn}' = '${value}'`);
                  } else if (defaultVals[varName]) {
                    // Use default value
                    value = defaultVals[varName];
                    console.log(`📋 ${varName} -> default value = '${value}'`);
                  } else {
                    // Fallback to direct mapping
                    value = contact[varName] || '';
                    console.log(`📋 ${varName} -> direct CSV = '${value}'`);
                  }
                  
                  // Use variable NAME as key, not number - Twilio expects variable names
                  templateVariables[varName] = value;
                });
              }
              
              console.log('📋 Variables for WhatsApp:', templateVariables);
              
              // Send message via Twilio
              const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
                ? process.env.TWILIO_WHATSAPP_NUMBER 
                : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
              
              // Use proper Content SID with fallback priority
              const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
              console.log(`📨 Sending with ContentSID: ${contentSid}`);
              console.log(`📨 Variables being sent: ${JSON.stringify(templateVariables)}`);
              
              const message = await client.messages.create({
                from: fromNumber,
                to: whatsappNumber,
                contentSid: contentSid,
                contentVariables: JSON.stringify(templateVariables)
              });

              console.log(`✅ Message sent: ${message.sid}`);
              sentCount++;
              
              // Rate limiting - wait 1 second between messages
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (msgError) {
              console.error(`❌ Error sending to ${contact.telefono || contact.phone}:`, msgError.message);
              errorCount++;
            }
          }
        }
        
      } catch (processingError) {
        console.error('❌ Error processing CSV immediately:', processingError.message);
        errorCount = totalContactsToSend;
      }
      
      // Update user message count
      if (sentCount > 0) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            messagesUsed: {
              increment: sentCount
            }
          }
        });
      }
      
      // Update campaign with final results
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'completed',
          sentCount: sentCount,
          errorCount: errorCount
        }
      });

      console.log(`🎉 Campaign completed immediately: ${campaign.name} - ${sentCount}/${totalContactsToSend} sent`);

      res.json({
        success: true,
        message: `Campaña procesada inmediatamente: ${sentCount} mensajes enviados exitosamente de ${totalContactsToSend} contactos.`,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: 'completed',
          totalContacts: totalContactsToSend,
          sentCount: sentCount,
          errorCount: errorCount,
          template: template.name,
          processedImmediately: true
        }
      });
    }

  } catch (error) {
    console.error('Error creating campaign:', error);
    
    // Clean up file in case of error
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up file after error');
      } catch (cleanupError) {
        console.error('Could not delete file after error:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al crear campaña'
    });
  }
});

// Get user campaigns
app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        template: {
          select: {
            name: true,
            twilioSid: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log(`📊 Returning ${campaigns.length} campaigns for user ${req.user.id}`);

    res.json({
      success: true,
      campaigns
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener campañas'
    });
  }
});

// Send campaign
app.post('/api/campaigns/:campaignId/send', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    console.log(`📤 Sending campaign: ${campaignId} for user ${req.user.id}`);

    // Find campaign
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: req.user.id
      },
      include: {
        template: {
          select: {
            name: true,
            twilioSid: true,
            content: true,
            variables: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaña no encontrada'
      });
    }

    if (!campaign.template) {
      return res.status(400).json({
        success: false,
        error: 'Plantilla no encontrada para esta campaña'
      });
    }

    if (!campaign.template.twilioSid) {
      return res.status(400).json({
        success: false,
        error: 'La plantilla no tiene un SID de Twilio asignado'
      });
    }

    // Parse CSV data and send real messages via Twilio
    let contacts = [];
    let sentCount = 0;
    let errorCount = 0;
    const errorDetails = [];

    // Messages already sent when campaign was created
    console.log(`📊 Campaign already completed with results:`);
    console.log(`   - Total contacts: ${campaign.totalContacts}`);
    console.log(`   - Messages sent: ${campaign.sentCount}`);
    console.log(`   - Errors: ${campaign.errorCount}`);

    res.json({
      success: true,
      message: `Campaña ya enviada: ${campaign.sentCount} mensajes procesados`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sentCount: campaign.sentCount,
        errorCount: campaign.errorCount,
        totalContacts: campaign.totalContacts,
        template: campaign.template.name,
        twilioSid: campaign.template.twilioSid
      }
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar campaña'
    });
  }
});

// Get campaign details
app.get('/api/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: req.user.id
      },
      include: {
        template: {
          select: {
            name: true,
            twilioSid: true
          }
        },
        messages: {
          select: {
            id: true,
            phone: true,
            status: true,
            error: true,
            sentAt: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaña no encontrada'
      });
    }

    console.log(`📊 Returning campaign details: ${campaign.name}`);

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener campaña'
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// Update user profile and password endpoint
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, currentPassword, newPassword } = req.body;

    console.log('🔧 Profile update request for user:', userId);
    console.log('📋 Fields to update:', { name: !!name, passwordChange: !!currentPassword });
    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    let updateData = {};

    // Update basic profile fields
    if (name !== undefined) updateData.name = name;

    // Handle password change
    if (currentPassword && newPassword) {
      console.log('🔑 Processing password change...');
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual incorrecta'
        });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      updateData.password = hashedNewPassword;
      
      console.log('✅ Password updated successfully');
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true
      }
    });

    console.log('✅ Profile updated successfully for user:', userId);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Password Reset - Request reset
console.log('🔥 DEBUG: Registering forgot-password endpoint');
app.post('/api/auth/forgot-password', async (req, res) => {
  console.log('🔥 DEBUG: forgot-password endpoint HIT!');
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
console.log('🔥 DEBUG: Registering reset-password GET endpoint');
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
console.log('🔥 DEBUG: Registering reset-password POST endpoint');
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

// Graceful shutdown for Prisma
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Mount payment routes
app.use('/api/payments', paymentRoutes);

// Mount admin routes (includes WhatsApp Business functionality)
app.use('/api/admin', adminRoutes);

// Sofia Admin Dashboard
const sofiaAdminRoutes = require('./routes/adminDashboard');
app.use('/api/admin/sofia', sofiaAdminRoutes);

// Mount campaign progress routes
app.use('/api/progress', campaignProgressRoutes);

// Mount templates AI routes
app.use('/api/templates-ai', templatesAIRoutes);

// Mount scheduled campaigns routes
app.use('/api/scheduled-campaigns', scheduledCampaignsRoutes);

// Mount blacklist routes
app.use('/api/blacklist', blacklistRoutes);

// Mount analytics routes
app.use('/api/analytics', analyticsRoutes);

// Mount Sofia AI webhook routes
const sofiaWebhookRoutes = require('./routes/sofiaWebhook');
app.use('/api/webhooks', sofiaWebhookRoutes);

// Export user data endpoint
app.get('/api/user/export-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        planType: true,
        messagesUsed: true,
        messagesLimit: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Obtener plantillas del usuario
    const templates = await prisma.template.findMany({
      where: { userId: userId },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        status: true,
        createdAt: true
      }
    });

    // Obtener pagos del usuario
    const payments = await prisma.payment.findMany({
      where: { userId: userId },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        status: true,
        planType: true,
        createdAt: true
      }
    });

    // Preparar datos para exportación
    const exportData = {
      user: user,
      templates: templates,
      payments: payments,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('❌ Error exporting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Delete user account endpoint
app.delete('/api/user/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🗑️ Deleting account for user: ${userId}`);

    // Eliminar en orden para evitar conflictos de foreign keys
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar pagos
      await tx.payment.deleteMany({
        where: { userId: userId }
      });

      // 2. Eliminar plantillas
      await tx.template.deleteMany({
        where: { userId: userId }
      });

      // 3. Eliminar usuario
      await tx.user.delete({
        where: { id: userId }
      });
    });

    console.log(`✅ Account deleted successfully for user: ${userId}`);

    res.json({
      success: true,
      message: 'Cuenta eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🚨 SOFIA ADMIN ENDPOINT - DIRECTO PARA ARREGLAR 404
app.get('/api/admin/sofia/conversations', verifyToken, async (req, res) => {
  try {
    console.log('🤖 SOFIA ADMIN: Fetching conversations for admin...');

    // Verificar admin role
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all SafeNotify leads with their conversations
    const leads = await prisma.safeNotifyLead.findMany({
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastActivity: 'desc' }
    });

    // Format data for admin dashboard
    const conversationSummaries = leads.map(lead => {
      const recentConversation = lead.conversations[0];
      
      return {
        id: lead.id,
        phone: lead.phone,
        name: lead.name || 'Sin nombre',
        email: lead.email || 'Sin email',
        specialty: lead.specialty || 'No identificada',
        qualificationScore: lead.qualificationScore,
        grade: lead.grade,
        status: lead.status,
        lastActivity: lead.lastActivity,
        messageCount: recentConversation?.messageCount || 0,
        createdAt: lead.createdAt
      };
    });

    console.log(`✅ SOFIA ADMIN: Retrieved ${conversationSummaries.length} conversation summaries`);

    res.json({
      success: true,
      conversations: conversationSummaries,
      total: conversationSummaries.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SOFIA ADMIN ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Sofia conversations',
      message: error.message
    });
  }
});

// Sofia admin routes - Already mounted above at line 2262
console.log('🤖 Sofia admin routes already mounted at /api/admin/sofia');

// Create HTTP server for WebSocket integration
const server = http.createServer(app);

// Initialize WebSocket progress tracker - SKIP for Sofia fix
if (CampaignProgressTracker) {
  try {
    const campaignProgressTracker = new CampaignProgressTracker(server);
    global.campaignProgressTracker = campaignProgressTracker;
    console.log('✅ WebSocket initialized successfully');
  } catch (error) {
    console.log('⚠️ WebSocket failed to initialize:', error.message);
    global.campaignProgressTracker = null;
  }
} else {
  console.log('⚠️ WebSocket skipped - module not available');
  global.campaignProgressTracker = null;
}

server.listen(PORT, async () => {
  console.log(`🚀 SafeNotify Backend server running on http://localhost:${PORT} - Enhanced with WebSocket`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 Templates: http://localhost:${PORT}/api/templates`);
  console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
  console.log(`📊 Progress Tracking: http://localhost:${PORT}/api/progress`);
  console.log(`📅 Scheduled Campaigns: http://localhost:${PORT}/api/scheduled-campaigns`);
  console.log(`📡 WebSocket Server: Initialized for real-time updates`);
  
  // Initialize scheduler service
  try {
    // await schedulerService.initialize();
    console.log(`⏰ Scheduler Service: Skipped for Sofia admin fix`);
  } catch (error) {
    console.error('❌ Failed to initialize Scheduler Service:', error);
  }
  
  // Check if templates exist
  try {
    const templateCount = await prisma.template.count();
    console.log(`📊 Templates in database: ${templateCount}`);
    
    if (templateCount === 0) {
      console.log('⚠️ No templates found. Consider running seed script.');
    }
  } catch (error) {
    console.error('Error checking templates:', error.message);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});