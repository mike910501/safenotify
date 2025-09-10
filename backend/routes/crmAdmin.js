const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateApiKey } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar autenticación a todas las rutas
// router.use(authenticateApiKey); // Comentado temporalmente para testing

/**
 * 📊 GET /api/crm/customers - Listar todos los clientes
 */
router.get('/customers', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      source, 
      search,
      sortBy = 'lastActivity',
      sortOrder = 'desc' 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Construir filtros WHERE
    const where = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (source) {
      where.source = source;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Obtener clientes con conteo
    const [customers, totalCount] = await Promise.all([
      prisma.customerLead.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          conversations: {
            select: {
              id: true,
              messageCount: true,
              lastActivity: true,
              status: true
            },
            orderBy: { lastActivity: 'desc' },
            take: 1
          }
        }
      }),
      prisma.customerLead.count({ where })
    ]);

    // Enriquecer datos de clientes
    const enrichedCustomers = customers.map(customer => ({
      ...customer,
      totalMessages: customer.conversations.reduce((total, conv) => total + conv.messageCount, 0),
      totalRevenue: 0,
      lastConversation: customer.conversations[0] || null,
      conversationCount: customer.conversations.length
    }));

    res.json({
      success: true,
      customers: enrichedCustomers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalItems: totalCount,
        itemsPerPage: take
      }
    });

    logger.info('Customer list retrieved', {
      totalCustomers: totalCount,
      page: parseInt(page)
    });

  } catch (error) {
    logger.error('Error fetching customers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers'
    });
  }
});

/**
 * 📊 GET /api/crm/customers/stats - Estadísticas de clientes
 */
router.get('/customers/stats', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obtener estadísticas en paralelo
    const [totalCustomers, newLeads, qualifiedLeads, avgScore] = await Promise.all([
      prisma.customerLead.count(),
      prisma.customerLead.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'NEW'
        }
      }),
      prisma.customerLead.count({
        where: {
          qualificationScore: { gte: 70 }
        }
      }),
      prisma.customerLead.aggregate({
        _avg: {
          qualificationScore: true
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalCustomers,
        newLeads,
        qualifiedLeads,
        totalRevenue: 0,
        avgScore: avgScore._avg.qualificationScore || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching customer stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer statistics'
    });
  }
});

/**
 * 👤 GET /api/crm/customers/:id - Obtener cliente específico
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customerLead.findUnique({
      where: { id },
      include: {
        conversations: {
          orderBy: { lastActivity: 'desc' },
          take: 5
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer: {
        ...customer,
        totalMessages: 0,
        totalRevenue: 0,
        conversationCount: customer.conversations.length
      }
    });

  } catch (error) {
    logger.error('Error fetching customer details', { 
      customerId: req.params.id,
      error: error.message 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer details'
    });
  }
});

/**
 * ✏️ PUT /api/crm/customers/:id - Actualizar cliente
 */
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      status,
      qualificationScore,
      tags,
      notes
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.status = status;
    if (qualificationScore !== undefined) updateData.qualificationScore = qualificationScore;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (notes !== undefined) updateData.notes = notes;

    const updatedCustomer = await prisma.customerLead.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      customer: updatedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    logger.error('Error updating customer', {
      customerId: req.params.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    });
  }
});

/**
 * 📄 GET /api/crm/customers/export - Exportar clientes a CSV
 */
router.get('/customers/export', async (req, res) => {
  try {
    const customers = await prisma.customerLead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Generar CSV simple
    const csvHeader = 'ID,Nombre,Teléfono,Email,Estado,Score,Fuente,Tags,Creado';
    const csvRows = customers.map(customer => [
      customer.id,
      customer.name || '',
      customer.phone,
      customer.email || '',
      customer.status,
      customer.qualificationScore,
      customer.source,
      customer.tags.join(';'),
      customer.createdAt.toISOString()
    ].map(field => `"${field}"`).join(','));

    const csvContent = [csvHeader, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    logger.error('Error exporting customers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export customers'
    });
  }
});

module.exports = router;