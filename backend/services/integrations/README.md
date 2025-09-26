# 🔗 Integration Services

Servicios de integración con APIs y servicios externos para SafeNotify.

## Servicios

### 🤖 openaiService.js
- **Propósito**: Integración con OpenAI GPT models
- **Funcionalidades**:
  - Generación de respuestas naturales
  - Soporte para múltiples modelos
  - Fallback para MCP
  - Configuración por agente

### 📱 twilioMessagingService.js
- **Propósito**: Integración con Twilio para WhatsApp Business API
- **Funcionalidades**:
  - Envío de mensajes WhatsApp
  - Gestión de multimedia
  - Webhooks de estados
  - Rate limiting

### 📧 notificationService.js
- **Propósito**: Sistema de notificaciones multi-canal
- **Funcionalidades**:
  - Notificaciones email
  - Notificaciones push
  - Notificaciones SMS
  - Templates personalizables

### 💳 wompiPaymentService.js
- **Propósito**: Integración con Wompi para procesamiento de pagos
- **Funcionalidades**:
  - Procesamiento de transacciones
  - Webhooks de pagos
  - Gestión de métodos de pago
  - Reportes financieros

## Configuración

Cada servicio requiere variables de entorno específicas:

```env
# OpenAI
OPENAI_API_KEY=
OPENAI_ORGANIZATION=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Wompi
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_WEBHOOK_SECRET=
```

## Estado

✅ **PRODUCTION READY** - Todas las integraciones funcionando correctamente