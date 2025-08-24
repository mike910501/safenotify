const jwt = require('jsonwebtoken');
const prisma = require('../db');

// Generar JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your-default-secret-key-change-this',
    { expiresIn: '7d' }
  );
};

// Middleware para verificar JWT
const verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header Authorization o de cookies
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado - Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key-change-this');
    
    // Obtener usuario de la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planType: true,
        messagesUsed: true,
        messagesLimit: true,
        planExpiry: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Agregar usuario al request
    req.user = user;
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

// Middleware opcional - continúa si hay token válido o no
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret-key-change-this');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planType: true,
          messagesUsed: true,
          messagesLimit: true
        }
      });
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Si hay error con el token, continuar sin usuario
    next();
  }
};

// Verificar límites del plan
const checkPlanLimits = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado'
      });
    }

    // Verificar si el plan ha expirado
    if (req.user.planExpiry && new Date(req.user.planExpiry) < new Date()) {
      // Resetear a plan gratuito
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          planType: 'free',
          messagesLimit: 10,
          messagesUsed: 0
        }
      });
      req.user.planType = 'free';
      req.user.messagesLimit = 10;
    }

    // Verificar límite de mensajes
    if (req.user.messagesUsed >= req.user.messagesLimit) {
      return res.status(403).json({
        success: false,
        error: 'Límite de mensajes alcanzado',
        limit: req.user.messagesLimit,
        used: req.user.messagesUsed,
        planType: req.user.planType
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando límites del plan:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando límites del plan'
    });
  }
};

// Middleware para verificar permisos de admin
const verifyAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado'
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado - Permisos de administrador requeridos'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando permisos de admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  optionalAuth,
  checkPlanLimits,
  verifyAdmin
};