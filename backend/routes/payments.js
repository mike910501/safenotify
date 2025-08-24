const express = require('express');
const prisma = require('../db');
const { verifyToken } = require('../middleware/auth');
const wompiService = require('../services/wompi');

const router = express.Router();

// Planes disponibles
const PLANS = {
  basic: {
    name: 'Plan Básico',
    price: 25000, // $25,000 COP
    messages: 100,
    duration: 30 // días
  },
  pro: {
    name: 'Plan Pro',
    price: 50000, // $50,000 COP
    messages: 500,
    duration: 30 // días
  },
  enterprise: {
    name: 'Plan Enterprise',
    price: 100000, // $100,000 COP
    messages: 2000,
    duration: 30 // días
  }
};

// Obtener planes disponibles
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: PLANS
  });
});

// Obtener configuración de Wompi para frontend
router.get('/wompi/config', verifyToken, (req, res) => {
  try {
    if (!wompiService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Wompi no está configurado correctamente'
      });
    }

    const config = wompiService.getConfig();
    
    res.json({
      success: true,
      config: {
        environment: config.environment,
        publicKey: wompiService.publicKey,
        configured: config.hasPublicKey && config.hasPrivateKey
      }
    });
  } catch (error) {
    console.error('Error obteniendo configuración de Wompi:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener token de aceptación de términos
router.get('/wompi/acceptance-token', verifyToken, async (req, res) => {
  try {
    const result = await wompiService.getAcceptanceToken();
    
    if (result.success) {
      res.json({
        success: true,
        acceptance_token: result.acceptance_token
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error obteniendo token de aceptación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Crear transacción de pago
router.post('/create-transaction', verifyToken, async (req, res) => {
  try {
    const { planType, paymentMethod, cardData, customerData } = req.body;
    
    // Validar plan
    if (!PLANS[planType]) {
      return res.status(400).json({
        success: false,
        error: 'Plan no válido'
      });
    }

    const plan = PLANS[planType];
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Generar referencia única
    const reference = wompiService.generateReference(user.id, planType);
    const amountInCents = wompiService.pesosTocents(plan.price);
    
    // Generar signature de integridad
    const signature = wompiService.generateIntegritySignature(
      reference, 
      amountInCents, 
      'COP'
    );

    // Crear registro de pago en la base de datos
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        reference: reference,
        amount: plan.price,
        planType: planType,
        status: 'PENDING',
        wompiTransactionId: null
      }
    });

    let transactionData = {
      amount_in_cents: amountInCents,
      currency: 'COP',
      signature: signature,
      customer_email: user.email,
      reference: reference,
      payment_method: paymentMethod,
      redirect_url: `${process.env.CORS_ORIGIN}/dashboard/payment/result?reference=${reference}`,
      customer_data: {
        phone_number: customerData?.phone || '',
        full_name: customerData?.name || user.name
      }
    };

    // Si es pago con tarjeta, tokenizar primero
    if (paymentMethod === 'CARD' && cardData) {
      // Tokenizar tarjeta
      const tokenResult = await wompiService.tokenizeCard({
        number: cardData.number,
        cvc: cardData.cvc,
        exp_month: cardData.exp_month,
        exp_year: cardData.exp_year,
        card_holder: cardData.card_holder
      });

      if (!tokenResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Error al procesar la tarjeta: ' + tokenResult.error
        });
      }

      // Crear fuente de pago
      const paymentSourceResult = await wompiService.createCardPaymentSource(
        tokenResult.token,
        {
          email: user.email,
          acceptance_token: customerData.acceptance_token
        }
      );

      if (!paymentSourceResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Error al crear fuente de pago: ' + paymentSourceResult.error
        });
      }

      transactionData.payment_source_id = paymentSourceResult.payment_source.id;
    }

    // SIEMPRE usar checkout web de Wompi (más simple y seguro)
    // Wompi maneja todo: tarjetas, PSE, Nequi, validaciones, 3D Secure, etc.
    const checkoutUrl = wompiService.getCheckoutUrl(transactionData);
    
    console.log(`Transacción creada - Reference: ${reference}, Amount: ${plan.price} COP, Signature: ${signature}`);
    
    return res.json({
      success: true,
      paymentType: 'redirect',
      checkoutUrl: checkoutUrl,
      reference: reference,
      payment: payment
    });

    // Crear transacción en Wompi
    const transactionResult = await wompiService.createTransaction(transactionData);

    if (transactionResult.success) {
      // Actualizar el pago con el ID de transacción de Wompi
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          wompiTransactionId: transactionResult.transaction.id,
          status: transactionResult.transaction.status || 'PENDING'
        }
      });

      res.json({
        success: true,
        paymentType: 'direct',
        transaction: transactionResult.transaction,
        reference: reference,
        payment: payment
      });
    } else {
      // Actualizar estado del pago a FAILED
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });

      res.status(400).json({
        success: false,
        error: transactionResult.error,
        details: transactionResult.details
      });
    }
  } catch (error) {
    console.error('Error creando transacción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Consultar estado de pago
router.get('/transaction-status/:reference', verifyToken, async (req, res) => {
  try {
    const { reference } = req.params;
    console.log(`🔍 Consultando estado de pago - Reference: ${reference}, User: ${req.user.id}`);
    
    const payment = await prisma.payment.findFirst({
      where: { 
        reference: reference,
        userId: req.user.id 
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    // Si tenemos ID de transacción de Wompi, consultar estado
    if (payment.wompiTransactionId) {
      console.log(`📡 Consultando transacción en Wompi: ${payment.wompiTransactionId}`);
      const transactionResult = await wompiService.getTransaction(payment.wompiTransactionId);
      
      if (transactionResult.success) {
        console.log(`✅ Estado obtenido de Wompi: ${transactionResult.transaction.status}`);
        // Actualizar estado en base de datos
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: transactionResult.transaction.status,
            processedAt: transactionResult.transaction.status === 'APPROVED' 
              ? new Date() 
              : payment.processedAt
          }
        });

        // Si el pago fue aprobado, actualizar plan del usuario
        if (transactionResult.transaction.status === 'APPROVED' && payment.status !== 'APPROVED') {
          console.log(`🎯 Actualizando plan del usuario a: ${payment.planType}`);
          await updateUserPlan(req.user.id, payment.planType);
        }

        res.json({
          success: true,
          payment: updatedPayment,
          transaction: transactionResult.transaction
        });
      } else {
        console.log(`❌ Error consultando Wompi: ${transactionResult.error}`);
        res.json({
          success: true,
          payment: payment,
          transaction: null,
          wompiError: transactionResult.error
        });
      }
    } else {
      // Caso especial: el pago fue creado pero nunca se procesó directamente
      // Esto pasa cuando usamos checkout widget - no tenemos wompiTransactionId
      console.log(`⚠️ Pago sin wompiTransactionId - buscando por referencia en Wompi`);
      
      // Buscar la transacción por referencia en Wompi
      const transactionResult = await wompiService.getTransactionByReference(payment.reference);
      
      if (transactionResult.success) {
        console.log(`🎯 Transacción encontrada por referencia: ${transactionResult.transaction.id}`);
        
        // Actualizar el pago con la información de Wompi
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: transactionResult.transaction.status,
            wompiTransactionId: transactionResult.transaction.id,
            processedAt: transactionResult.transaction.status === 'APPROVED' 
              ? new Date() 
              : payment.processedAt
          }
        });

        // Si el pago fue aprobado, actualizar plan del usuario
        if (transactionResult.transaction.status === 'APPROVED' && payment.status !== 'APPROVED') {
          console.log(`🎯 Actualizando plan del usuario a: ${payment.planType}`);
          await updateUserPlan(req.user.id, payment.planType);
        }

        res.json({
          success: true,
          payment: updatedPayment,
          transaction: transactionResult.transaction
        });
      } else {
        console.log(`⚠️ No se encontró transacción en Wompi para referencia: ${payment.reference}`);
        res.json({
          success: true,
          payment: payment,
          transaction: null,
          note: 'Buscando transacción en Wompi... El pago puede estar siendo procesado.'
        });
      }
    }
  } catch (error) {
    console.error('Error consultando estado de transacción:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Webhook para recibir notificaciones de Wompi
router.post('/wompi/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'] || req.headers['x-wompi-signature'];
    
    if (!wompiService.verifyWebhookSignature(signature, req.body)) {
      console.error('Webhook signature inválida');
      return res.status(401).json({ error: 'Signature inválida' });
    }

    const event = req.body;
    console.log('Webhook recibido:', event);

    if (event.event === 'transaction.updated') {
      const transaction = event.data.transaction;
      
      // Buscar pago por referencia
      const payment = await prisma.payment.findFirst({
        where: { reference: transaction.reference }
      });

      if (payment) {
        // Actualizar estado del pago
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: transaction.status,
            wompiTransactionId: transaction.id,
            processedAt: transaction.status === 'APPROVED' ? new Date() : payment.processedAt
          }
        });

        // Si el pago fue aprobado, actualizar plan del usuario
        if (transaction.status === 'APPROVED') {
          await updateUserPlan(payment.userId, payment.planType);
        }

        console.log('Pago actualizado:', updatedPayment);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función auxiliar para actualizar plan del usuario
async function updateUserPlan(userId, planType) {
  try {
    const plan = PLANS[planType];
    if (!plan) return;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration);

    await prisma.user.update({
      where: { id: userId },
      data: {
        planType: planType,
        messagesLimit: plan.messages,
        messagesUsed: 0, // Resetear mensajes usados
        planExpiry: expiryDate
      }
    });

    console.log(`Plan actualizado para usuario ${userId}: ${planType}`);
  } catch (error) {
    console.error('Error actualizando plan del usuario:', error);
  }
}

// Obtener historial de pagos del usuario
router.get('/history', verifyToken, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      payments: payments
    });
  } catch (error) {
    console.error('Error obteniendo historial de pagos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;