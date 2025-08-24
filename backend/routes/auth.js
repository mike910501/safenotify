const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Registro de nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con plan gratuito
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        planType: 'free',
        messagesLimit: 10,
        messagesUsed: 0
      },
      select: {
        id: true,
        email: true,
        name: true,
        planType: true,
        messagesLimit: true,
        createdAt: true
      }
    });

    // Generar token
    const token = generateToken(user.id);

    // Enviar respuesta con cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    res.json({
      success: true,
      user,
      token
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar usuario'
    });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
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

    // Buscar usuario
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

    // Generar token
    const token = generateToken(user.id);

    // Enviar respuesta con cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    // No enviar contraseña en la respuesta
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// Obtener usuario actual con estadísticas
router.get('/me', verifyToken, async (req, res) => {
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

// Actualizar perfil
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updateData = {};

    // Actualizar nombre si se proporciona
    if (name) {
      updateData.name = name;
    }

    // Cambiar contraseña si se proporciona
    if (currentPassword && newPassword) {
      // Obtener usuario con contraseña
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual incorrecta'
        });
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
      }

      // Hashear nueva contraseña
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        planType: true,
        messagesUsed: true,
        messagesLimit: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      user: updatedUser,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar perfil'
    });
  }
});

module.exports = router;