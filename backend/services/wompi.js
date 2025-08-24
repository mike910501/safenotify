const axios = require('axios');
const crypto = require('crypto');

class WompiService {
  constructor() {
    this.environment = process.env.WOMPI_ENVIRONMENT || 'test';
    this.publicKey = this.environment === 'test' 
      ? process.env.WOMPI_PUBLIC_KEY_TEST 
      : process.env.WOMPI_PUBLIC_KEY_PROD;
    this.privateKey = this.environment === 'test' 
      ? process.env.WOMPI_PRIVATE_KEY_TEST 
      : process.env.WOMPI_PRIVATE_KEY_PROD;
    this.apiUrl = this.environment === 'test' 
      ? process.env.WOMPI_API_URL_TEST 
      : process.env.WOMPI_API_URL_PROD;
    this.integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    this.eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  }

  // Generar signature para integridad
  generateIntegritySignature(reference, amountInCents, currency = 'COP') {
    if (!this.integritySecret) {
      console.warn('WOMPI_INTEGRITY_SECRET no configurado');
      return null;
    }
    
    const concatenatedString = `${reference}${amountInCents}${currency}${this.integritySecret}`;
    const signature = crypto.createHash('sha256').update(concatenatedString).digest('hex');
    console.log(`Signature generada - String: ${concatenatedString}, Hash: ${signature}`);
    return signature;
  }

  // Verificar signature de webhook
  verifyWebhookSignature(signature, payload) {
    if (!this.eventsSecret) {
      console.warn('WOMPI_EVENTS_SECRET no configurado');
      return false;
    }

    const computedSignature = crypto
      .createHmac('sha256', this.eventsSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === computedSignature;
  }

  // Crear token de tarjeta de crédito
  async tokenizeCard(cardData) {
    try {
      const response = await axios.post(`${this.apiUrl}/tokens/cards`, {
        number: cardData.number,
        cvc: cardData.cvc,
        exp_month: cardData.exp_month,
        exp_year: cardData.exp_year,
        card_holder: cardData.card_holder
      }, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        token: response.data.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Error tokenizando tarjeta:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al tokenizar tarjeta',
        details: error.response?.data
      };
    }
  }

  // Crear transacción
  async createTransaction(transactionData) {
    try {
      const payload = {
        amount_in_cents: transactionData.amount_in_cents,
        currency: transactionData.currency || 'COP',
        signature: transactionData.signature,
        customer_email: transactionData.customer_email,
        reference: transactionData.reference,
        payment_method: transactionData.payment_method,
        redirect_url: transactionData.redirect_url
      };

      // Agregar datos adicionales según el método de pago
      if (transactionData.payment_source_id) {
        payload.payment_source_id = transactionData.payment_source_id;
      }

      if (transactionData.customer_data) {
        payload.customer_data = transactionData.customer_data;
      }

      if (transactionData.shipping_address) {
        payload.shipping_address = transactionData.shipping_address;
      }

      const response = await axios.post(`${this.apiUrl}/transactions`, payload, {
        headers: {
          'Authorization': `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        transaction: response.data.data,
        data: response.data
      };
    } catch (error) {
      console.error('Error creando transacción:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear transacción',
        details: error.response?.data
      };
    }
  }

  // Consultar transacción por ID
  async getTransaction(transactionId) {
    try {
      const response = await axios.get(`${this.apiUrl}/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.privateKey}`
        }
      });

      return {
        success: true,
        transaction: response.data.data,
        data: response.data
      };
    } catch (error) {
      console.error('Error consultando transacción:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al consultar transacción',
        details: error.response?.data
      };
    }
  }

  // Buscar transacciones por referencia
  async getTransactionByReference(reference) {
    try {
      console.log(`🔍 Buscando transacción por referencia: ${reference}`);
      const response = await axios.get(`${this.apiUrl}/transactions`, {
        headers: {
          'Authorization': `Bearer ${this.privateKey}`
        },
        params: {
          reference: reference
        }
      });

      const transactions = response.data.data;
      if (transactions && transactions.length > 0) {
        // Tomar la transacción más reciente
        const latestTransaction = transactions[0];
        console.log(`✅ Transacción encontrada: ${latestTransaction.id}, Estado: ${latestTransaction.status}`);
        
        return {
          success: true,
          transaction: latestTransaction,
          data: response.data
        };
      } else {
        console.log(`⚠️ No se encontraron transacciones para la referencia: ${reference}`);
        return {
          success: false,
          error: 'No se encontraron transacciones para esta referencia'
        };
      }
    } catch (error) {
      console.error('Error buscando transacción por referencia:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al buscar transacción',
        details: error.response?.data
      };
    }
  }

  // Crear fuente de pago con tarjeta tokenizada
  async createCardPaymentSource(tokenId, customerData) {
    try {
      const response = await axios.post(`${this.apiUrl}/payment_sources`, {
        type: 'CARD',
        token: tokenId,
        customer_email: customerData.email,
        acceptance_token: customerData.acceptance_token
      }, {
        headers: {
          'Authorization': `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        payment_source: response.data.data,
        data: response.data
      };
    } catch (error) {
      console.error('Error creando fuente de pago:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear fuente de pago',
        details: error.response?.data
      };
    }
  }

  // Obtener token de aceptación de términos
  async getAcceptanceToken() {
    try {
      const response = await axios.get(`${this.apiUrl}/merchants/${this.publicKey}`, {
        headers: {
          'Authorization': `Bearer ${this.publicKey}`
        }
      });

      return {
        success: true,
        acceptance_token: response.data.data.presigned_acceptance.acceptance_token,
        data: response.data
      };
    } catch (error) {
      console.error('Error obteniendo token de aceptación:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener token de aceptación',
        details: error.response?.data
      };
    }
  }

  // Generar referencia única
  generateReference(userId, planType) {
    const timestamp = Date.now();
    return `SAFE_${userId}_${planType}_${timestamp}`;
  }

  // Obtener URL de checkout web
  getCheckoutUrl(transactionData) {
    const baseUrl = this.environment === 'test' 
      ? 'https://checkout.wompi.co/p/' 
      : 'https://checkout.wompi.co/p/';
    
    const params = new URLSearchParams({
      'public-key': this.publicKey,
      currency: transactionData.currency || 'COP',
      'amount-in-cents': transactionData.amount_in_cents.toString(),
      reference: transactionData.reference,
      'customer-email': transactionData.customer_email
    });

    // Agregar signature de integridad (requerida para producción)
    if (transactionData.signature && this.integritySecret) {
      params.append('signature:integrity', transactionData.signature);
    }

    // Redirect URL para regresar después del pago
    if (transactionData.redirect_url) {
      params.append('redirect-url', transactionData.redirect_url);
    }

    console.log('URL de checkout generada:', `${baseUrl}?${params.toString()}`);
    return `${baseUrl}?${params.toString()}`;
  }

  // Convertir pesos colombianos a centavos
  pesosTocents(pesos) {
    return Math.round(pesos * 100);
  }

  // Convertir centavos a pesos colombianos
  centsToPesos(cents) {
    return cents / 100;
  }

  // Validar configuración
  isConfigured() {
    return !!(this.publicKey && this.privateKey && this.apiUrl);
  }

  // Obtener información de configuración (sin keys sensibles)
  getConfig() {
    return {
      environment: this.environment,
      apiUrl: this.apiUrl,
      hasPublicKey: !!this.publicKey,
      hasPrivateKey: !!this.privateKey,
      hasIntegritySecret: !!this.integritySecret,
      hasEventsSecret: !!this.eventsSecret
    };
  }
}

module.exports = new WompiService();