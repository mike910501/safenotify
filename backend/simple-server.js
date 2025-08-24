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

// Database connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple Twilio client
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
const PORT = process.env.PORT || 3005;

// JWT utilities
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', { 
    expiresIn: '7d' 
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
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
const validateTemplateWithAI = require('./validate-endpoint');

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

// Admin endpoints
const requireAdmin = async (req, res, next) => {
  try {
    // First authenticate the token
    await authenticateToken(req, res, () => {});
    
    // Then check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// Get all templates for admin review
app.get('/api/admin/templates', requireAdmin, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    
    const where = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Filter by category if provided  
    if (category && category !== 'all') {
      where.category = category;
    }
    
    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.template.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`👑 Admin fetching templates: ${templates.length} found with filters:`, { status, category, search });

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error fetching admin templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plantillas para administrador'
    });
  }
});

// Get admin stats
app.get('/api/admin/templates/stats', requireAdmin, async (req, res) => {
  try {
    const totalTemplates = await prisma.template.count();
    
    const statusStats = await prisma.template.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const categoryStats = await prisma.template.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    });

    const recentActivity = await prisma.template.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    const result = {
      total: totalTemplates,
      byStatus: {},
      byCategory: {},
      recentActivity
    };

    statusStats.forEach(stat => {
      result.byStatus[stat.status] = stat._count.id;
    });

    categoryStats.forEach(stat => {
      result.byCategory[stat.category] = stat._count.id;
    });

    console.log('👑 Admin stats:', result);

    res.json({
      success: true,
      stats: result
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de administrador'
    });
  }
});

// Approve template
app.post('/api/admin/templates/:templateId/approve', requireAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { notes } = req.body;

    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        status: 'approved',
        adminReviewedBy: req.user.id,
        adminReviewedAt: new Date(),
        adminNotes: notes || 'Aprobada desde panel admin'
      }
    });

    console.log(`👑 Admin approved template: ${updatedTemplate.name}`);

    res.json({
      success: true,
      message: 'Plantilla aprobada exitosamente',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Error approving template:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aprobar plantilla'
    });
  }
});

// Reject template
app.post('/api/admin/templates/:templateId/reject', requireAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { notes } = req.body;

    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        status: 'rejected',
        adminReviewedBy: req.user.id,
        adminReviewedAt: new Date(),
        adminNotes: notes || 'No cumple con políticas de WhatsApp'
      }
    });

    console.log(`👑 Admin rejected template: ${updatedTemplate.name}`);

    res.json({
      success: true,
      message: 'Plantilla rechazada',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Error rejecting template:', error);
    res.status(500).json({
      success: false,
      error: 'Error al rechazar plantilla'
    });
  }
});

// Activate template
app.post('/api/admin/templates/:templateId/activate', requireAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;

    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        status: 'active',
        isPublic: true,
        adminReviewedBy: req.user.id,
        adminReviewedAt: new Date(),
        adminNotes: 'Plantilla activada y disponible públicamente'
      }
    });

    console.log(`👑 Admin activated template: ${updatedTemplate.name}`);

    res.json({
      success: true,
      message: 'Plantilla activada exitosamente',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Error activating template:', error);
    res.status(500).json({
      success: false,
      error: 'Error al activar plantilla'
    });
  }
});

// Update Twilio SID for template
app.post('/api/admin/templates/:templateId/twilio-sid', requireAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { twilioSid, twilioTemplateId } = req.body;

    if (!twilioSid) {
      return res.status(400).json({
        success: false,
        error: 'Twilio SID es requerido'
      });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        twilioSid: twilioSid.trim(),
        twilioTemplateId: twilioTemplateId?.trim() || null,
        adminReviewedBy: req.user.id,
        adminReviewedAt: new Date(),
        adminNotes: `Twilio SID asignado: ${twilioSid}`,
        updatedAt: new Date()
      }
    });

    console.log(`👑 Admin assigned Twilio SID ${twilioSid} to template: ${updatedTemplate.name}`);

    res.json({
      success: true,
      message: 'Twilio SID asignado exitosamente',
      template: updatedTemplate
    });

  } catch (error) {
    console.error('Error updating Twilio SID:', error);
    res.status(500).json({
      success: false,
      error: 'Error al asignar Twilio SID'
    });
  }
});

// Get template details for admin
app.get('/api/admin/templates/:templateId', requireAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    console.log(`👑 Admin viewing template details: ${template.name}`);

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error fetching template details:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener detalles de la plantilla'
    });
  }
});

// Campaign endpoints
// File upload setup for campaigns
const campaignUpload = multer({ dest: 'uploads/' });

// Create campaign
app.post('/api/campaigns/create', authenticateToken, campaignUpload.single('csvFile'), async (req, res) => {
  console.log('🚀 Campaign create endpoint hit');
  try {
    const { name, templateSid, variableMappings, defaultValues } = req.body;
    const csvFile = req.file;
    console.log('📋 Request body:', { name, templateSid, variableMappings, defaultValues });
    console.log('📁 File:', csvFile ? 'Present' : 'Missing');

    console.log('📤 Creating campaign:', {
      name,
      templateSid,
      userId: req.user.id,
      hasFile: !!csvFile
    });

    if (!csvFile) {
      return res.status(400).json({
        success: false,
        error: 'Archivo CSV es requerido'
      });
    }

    if (!templateSid) {
      return res.status(400).json({
        success: false,
        error: 'Template SID es requerido'
      });
    }

    // Find template by twilioSid OR by name (fallback)
    console.log('🔍 Looking for template with SID:', templateSid);
    const template = await prisma.template.findFirst({
      where: {
        OR: [
          { twilioSid: templateSid },
          { name: templateSid } // fallback if frontend sends name instead of SID
        ],
        AND: {
          OR: [
            { isPublic: true },
            { userId: req.user.id }
          ]
        }
      }
    });
    
    console.log('📋 Template found:', template ? `${template.name} (${template.id})` : 'NOT FOUND');

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada o no disponible'
      });
    }

    // Process and send immediately for maximum security (no data storage)
    let sentCount = 0;
    let errorCount = 0;
    let totalContacts = 0;
    const sendResults = [];
    
    if (csvFile && csvFile.path) {
      const fs = require('fs');
      try {
        const csvContent = fs.readFileSync(csvFile.path, 'utf8');
        console.log('📄 CSV file read for immediate processing');
        
        // Parse CSV and send messages immediately
        const csvLines = csvContent.split('\n').filter(line => line.trim());
        const headers = csvLines[0].split(',').map(h => h.trim());
        console.log('📋 CSV Headers:', headers);
        
        // Process each contact and send immediately
        for (let i = 1; i < csvLines.length; i++) {
          const values = csvLines[i].split(',').map(v => v.trim());
          const contact = {};
          headers.forEach((header, index) => {
            contact[header] = values[index] || '';
          });
          
          if (contact.telefono || contact.phone) {
            totalContacts++;
            console.log(`📤 Processing contact ${i}: ${contact.nombre || 'Unknown'} - ${contact.telefono || contact.phone}`);
            console.log(`🔍 Template variables value:`, template.variables, typeof template.variables);
            
            try {
              const phoneNumber = contact.telefono || contact.phone;
              const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+57${phoneNumber}`;
              const whatsappNumber = `whatsapp:${formattedPhone}`;

              // Parse template variables
              let templateVariables = {};
              if (template.variables) {
                if (Array.isArray(template.variables)) {
                  // Variables is already an array
                  console.log('📋 Variables are array, processing...');
                  // Parse defaultValues from frontend
                  let frontendDefaults = {};
                  if (req.body.defaultValues) {
                    try {
                      let rawDefaults = JSON.parse(req.body.defaultValues);
                      console.log('📝 Raw frontend defaults:', rawDefaults);
                      
                      // Clean up malformed keys (remove extra { characters)
                      Object.keys(rawDefaults).forEach(key => {
                        const cleanKey = key.replace(/^\{+/, ''); // Remove leading {
                        frontendDefaults[cleanKey] = rawDefaults[key];
                      });
                      
                      console.log('🧹 Cleaned frontend defaults:', frontendDefaults);
                    } catch (e) {
                      console.log('⚠️ Could not parse defaultValues:', req.body.defaultValues);
                    }
                  }

                  template.variables.forEach(varName => {
                    // Priority: CSV value → Frontend default → Built-in default
                    if (contact[varName] !== undefined && contact[varName] !== '') {
                      templateVariables[varName] = contact[varName];
                    } else if (frontendDefaults[varName]) {
                      templateVariables[varName] = frontendDefaults[varName];
                    } else {
                      // Fallback defaults
                      switch(varName) {
                        case 'nombre':
                          templateVariables[varName] = contact.nombre || 'Cliente';
                          break;
                        case 'negocio':
                          templateVariables[varName] = 'Tu tienda favorita';
                          break;
                        case 'link':
                          templateVariables[varName] = 'https://ejemplo.com';
                          break;
                        default:
                          templateVariables[varName] = 'N/A';
                      }
                    }
                  });
                } else if (typeof template.variables === 'string') {
                  try {
                    // Try to parse as JSON array first
                    const variableNames = JSON.parse(template.variables);
                    if (Array.isArray(variableNames)) {
                      variableNames.forEach(varName => {
                        templateVariables[varName] = contact[varName] || '';
                      });
                    }
                  } catch (e) {
                    // If not JSON, treat as comma-separated string
                    console.log('📋 Variables are comma-separated string, parsing...');
                    const variableNames = template.variables.split(',').map(v => v.trim());
                    variableNames.forEach(varName => {
                      templateVariables[varName] = contact[varName] || '';
                    });
                  }
                }
              } else {
                console.log('⚠️ No template variables found');
              }
              
              console.log('🔧 Template variables:', templateVariables);

              console.log(`📱 Sending to ${formattedPhone} with template ${template.twilioSid}`);
              
              // Send message via Twilio immediately
              const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
                ? process.env.TWILIO_WHATSAPP_NUMBER 
                : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
              
              console.log(`📞 From: ${fromNumber}, To: ${whatsappNumber}`);
              
              const message = await client.messages.create({
                from: fromNumber,
                to: whatsappNumber,
                contentSid: template.twilioSid,
                contentVariables: JSON.stringify(templateVariables)
              });

              console.log(`✅ Message sent: ${message.sid}`);
              sentCount++;
              
              // Wait 1 second between messages (rate limiting)
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (msgError) {
              console.error(`❌ Error sending to ${contact.telefono || contact.phone}:`, msgError.message);
              errorCount++;
            }
          }
        }
        
        // IMMEDIATELY delete file after processing
        fs.unlinkSync(csvFile.path);
        console.log('🗑️ CSV file securely deleted after processing');
        
      } catch (error) {
        console.error('❌ Error processing CSV file:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Error al procesar el archivo CSV'
        });
      }
    }

    // Create campaign record with final results
    const campaign = await prisma.campaign.create({
      data: {
        name: name || `Campaign ${new Date().toLocaleString()}`,
        templateId: template.id,
        userId: req.user.id,
        status: 'completed', // Already completed
        totalContacts: totalContacts,
        sentCount: sentCount,
        errorCount: errorCount,
        sentAt: new Date()
        // NO csvData stored for security/privacy
      }
    });

    console.log(`🎉 Campaign completed: ${campaign.name} (${campaign.id}) - ${sentCount}/${totalContacts} sent`);

    res.json({
      success: true,
      message: `Campaña procesada: ${sentCount} mensajes enviados exitosamente`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sentCount: sentCount,
        errorCount: errorCount,
        totalContacts: totalContacts,
        template: template.name,
        twilioSid: template.twilioSid
      }
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear campaña'
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

// Graceful shutdown for Prisma
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Mount payment routes
app.use('/api/payments', paymentRoutes);

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

const server = app.listen(PORT, () => {
  console.log(`🚀 SafeNotify Backend server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 Templates: http://localhost:${PORT}/api/templates`);
  console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});