require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://safenotify.co'
  ],
  credentials: true
}));
app.use(express.json());

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Sofia admin conversations endpoint
app.get('/api/admin/sofia/conversations', verifyAdmin, async (req, res) => {
  try {
    console.log('📊 Admin fetching Sofia conversation summaries...');

    // Get all SafeNotify leads with their conversations
    const leads = await prisma.safeNotifyLead.findMany({
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Most recent conversation only
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

    console.log(`✅ Retrieved ${conversationSummaries.length} Sofia conversation summaries`);

    res.json({
      success: true,
      conversations: conversationSummaries,
      total: conversationSummaries.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching Sofia conversation summaries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sofia server running', timestamp: new Date() });
});

app.listen(PORT, async () => {
  console.log(`🚀 Sofia Admin Server running on http://localhost:${PORT}`);
  console.log(`🤖 Sofia Endpoint: http://localhost:${PORT}/api/admin/sofia/conversations`);
  console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Count leads
    const leadCount = await prisma.safeNotifyLead.count();
    console.log(`📊 Sofia leads in database: ${leadCount}`);
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Sofia server shutting down...');
  prisma.$disconnect();
  process.exit(0);
});