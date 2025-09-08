const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded for user:', decoded.userId);

    // Get user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planType: true,
        // 🚀 CRM FIELDS FOR USER-CENTRIC CRM
        crmEnabled: true,
        crmPlan: true,
        maxAgents: true,
        maxWhatsAppNumbers: true
      }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: Se requieren permisos de administrador'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Admin verification error:', error.message);
    return res.status(403).json({
      success: false,
      error: 'Error de autorización'
    });
  }
};

module.exports = {
  authenticateToken,
  verifyAdmin
};