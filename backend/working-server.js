require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

// Twilio client
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Database and authentication
const prisma = require('./db');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const templatesAIRoutes = require('./routes/templatesAI');
const adminRoutes = require('./routes/admin');
const { verifyToken, checkPlanLimits } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', // Next.js development
    'http://localhost:3001', // Next.js alternative port
    'http://localhost:3002', // Next.js alternative port
    'http://localhost:3006', // Next.js when 3000-3005 are occupied
    process.env.CORS_ORIGIN
  ].filter(Boolean), // Remove undefined values
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload setup
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In-memory storage for campaigns (in production, use database)
const campaigns = new Map();
const messageLogs = new Map();

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

// Debug endpoint to test CORS
app.post('/api/test-cors', (req, res) => {
  console.log('🔍 Test CORS request received from:', req.get('Origin'));
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔍 Body:', req.body);
  
  res.json({
    success: true,
    message: 'CORS test successful',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.use('/api/auth', (req, res, next) => {
  console.log(`🌐 AUTH Route: ${req.method} ${req.originalUrl} from ${req.get('Origin') || 'no-origin'}`);
  console.log('🔍 Request body:', req.body);
  next();
}, authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/templates-ai', templatesAIRoutes);
app.use('/api/admin', adminRoutes);

// Sofia admin routes for lead management
const sofiaAdminRoutes = require('./routes/adminDashboard');
app.use('/api/admin/sofia', sofiaAdminRoutes);

// API documentation
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'SafeNotify Backend API v1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api': 'This documentation',
      // Auth endpoints
      'POST /api/auth/register': 'Register new user',
      'POST /api/auth/login': 'Login user',
      'POST /api/auth/logout': 'Logout user',
      'GET /api/auth/me': 'Get current user',
      'PUT /api/auth/profile': 'Update profile',
      // Campaign endpoints
      'POST /api/campaigns/create': 'Create campaign with CSV upload',
      'POST /api/campaigns/:id/send': 'Send campaign messages',
      'GET /api/campaigns/:id/stats': 'Get campaign statistics',
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

// Create campaign endpoint (requires authentication)
app.post('/api/campaigns/create', verifyToken, checkPlanLimits, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('📥 Creating campaign:', req.body);
    console.log('📄 CSV file:', req.file);

    const { name, templateSid, variableMappings, defaultValues } = req.body;
    
    if (!name || !templateSid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, templateSid'
      });
    }

    const campaignId = uuidv4();
    let contacts = [];

    // Process CSV if uploaded
    if (req.file) {
      const csvData = fs.readFileSync(req.file.path, 'utf8');
      const lines = csvData.split('\n'); // Use single backslash
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const contact = {};
          headers.forEach((header, index) => {
            contact[header] = values[index] || '';
          });
          contacts.push(contact);
        }
      }
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
    }

    // Store campaign
    const campaign = {
      id: campaignId,
      name,
      templateSid,
      variableMappings: JSON.parse(variableMappings || '{}'),
      defaultValues: JSON.parse(defaultValues || '{}'),
      contacts,
      status: 'created',
      totalContacts: contacts.length,
      createdAt: new Date().toISOString()
    };

    campaigns.set(campaignId, campaign);

    console.log('✅ Campaign created:', {
      id: campaignId,
      name,
      totalContacts: contacts.length,
      templateSid
    });

    res.json({
      success: true,
      campaign: {
        id: campaignId,
        name,
        templateSid,
        totalContacts: contacts.length,
        status: 'created'
      }
    });

  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send campaign messages
app.post('/api/campaigns/:id/send', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = campaigns.get(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('🚀 Starting to send messages for campaign:', campaignId);
    console.log('📊 Total contacts:', campaign.contacts.length);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Send messages to all contacts
    for (const contact of campaign.contacts) {
      try {
        // Prepare variables for template
        const templateVariables = {};
        
        // Map CSV columns to template variables
        Object.entries(campaign.variableMappings).forEach(([templateVar, csvColumn]) => {
          if (csvColumn && contact[csvColumn]) {
            templateVariables[templateVar] = contact[csvColumn];
          }
        });

        // Add default values
        Object.entries(campaign.defaultValues).forEach(([templateVar, defaultValue]) => {
          if (defaultValue && !templateVariables[templateVar]) {
            templateVariables[templateVar] = defaultValue;
          }
        });

        // Format phone number (ensure it has country code)
        let phoneNumber = contact.telefono || contact.phone || contact.numero;
        if (!phoneNumber) {
          console.log('⚠️  No phone number for contact:', contact);
          continue;
        }

        // Ensure Colombian format
        if (!phoneNumber.startsWith('+')) {
          phoneNumber = '+57' + phoneNumber.replace(/^57/, '');
        }

        console.log('📱 Sending message to:', phoneNumber);
        console.log('📝 Template variables:', templateVariables);

        // For Content Templates, variables must be passed as an ordered array
        // Template format: {{1}}, {{2}}, {{3}}, {{4}}, {{5}}, {{6}}
        // Order: nombre, negocio, servicio, fecha, hora, ubicacion
        const contentVariables = JSON.stringify({
          "1": templateVariables.nombre || 'N/A',
          "2": templateVariables.negocio || 'N/A', 
          "3": templateVariables.servicio || 'N/A',
          "4": templateVariables.fecha || 'N/A',
          "5": templateVariables.hora || 'N/A',
          "6": templateVariables.ubicacion || 'N/A'
        });

        console.log('📝 Formatted content variables for Twilio:', contentVariables);

        // Send WhatsApp message via Twilio
        const message = await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${phoneNumber}`,
          contentSid: campaign.templateSid,
          contentVariables: contentVariables
        });

        console.log('✅ Message sent successfully:', {
          messageSid: message.sid,
          to: phoneNumber,
          status: message.status
        });

        successCount++;
        results.push({
          phone: phoneNumber,
          messageSid: message.sid,
          status: 'sent',
          timestamp: new Date().toISOString()
        });

        // Add delay between messages (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error('❌ Error sending message to:', contact, error);
        errorCount++;
        results.push({
          phone: contact.telefono || 'unknown',
          error: error.message,
          status: 'failed',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Update campaign status
    campaign.status = 'completed';
    campaign.sentAt = new Date().toISOString();
    campaign.results = {
      total: campaign.contacts.length,
      success: successCount,
      errors: errorCount
    };

    // Store message logs
    messageLogs.set(campaignId, results);

    console.log('🎉 Campaign sending completed:', {
      campaignId,
      total: campaign.contacts.length,
      success: successCount,
      errors: errorCount
    });

    res.json({
      success: true,
      results: {
        campaignId,
        total: campaign.contacts.length,
        sent: successCount,
        errors: errorCount,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('❌ Error sending campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get campaign statistics
app.get('/api/campaigns/:id/stats', (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = campaigns.get(campaignId);
    const logs = messageLogs.get(campaignId) || [];

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalContacts: campaign.totalContacts,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt,
        results: campaign.results,
        logs: logs.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get campaign messages/logs
app.get('/api/campaigns/:id/messages', (req, res) => {
  try {
    const campaignId = req.params.id;
    const logs = messageLogs.get(campaignId) || [];

    res.json({
      success: true,
      messages: logs
    });

  } catch (error) {
    console.error('❌ Error getting campaign messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 SafeNotify Backend server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 Templates: http://localhost:${PORT}/api/templates`);
  console.log('');
  console.log('🔧 Twilio Configuration:');
  console.log('   Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing');
  console.log('   Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Configured' : '❌ Missing');
  console.log('   WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER || '❌ Missing');
  console.log('   Template Confirmation:', process.env.TEMPLATE_APPOINTMENT_CONFIRMATION || '❌ Missing');
  console.log('   Template Reminder:', process.env.TEMPLATE_APPOINTMENT_REMINDER || '❌ Missing');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});