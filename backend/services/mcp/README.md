# 🚀 MCP Core Services

Este directorio contiene los servicios principales del **Model Context Protocol (MCP)** para SafeNotify.

## Servicios

### 📡 functionCallingService.js
- **Propósito**: Core del sistema de Function Calling MCP
- **Funciones**: 8 herramientas MCP principales
  - `send_multimedia`: Envío de archivos multimedia
  - `save_conversation_data`: Guardado de datos de conversación
  - `analyze_customer_intent`: Análisis de intención del cliente
  - `schedule_follow_up`: Programación de seguimientos
  - `check_availability`: Verificación de disponibilidad
  - `book_appointment`: Reserva de citas
  - `send_interactive_message`: Mensajes interactivos
  - `get_upcoming_appointments`: Obtener citas próximas

### 🔄 mcpIntegrationService.js
- **Propósito**: Orquestador principal MCP que integra Function Calling con el sistema existente
- **Funcionalidades**:
  - Detección automática de industria
  - Prompts especializados por sector
  - Fallback a OpenAI estándar
  - Logging de function calls

### 📅 calendarService.js
- **Propósito**: Gestión de calendario y citas MCP-compatible
- **Funcionalidades**:
  - Integración con Google Calendar
  - Gestión de disponibilidad
  - Reserva automática de citas

## Arquitectura MCP

```
Cliente WhatsApp → Webhook → mcpIntegrationService → functionCallingService → Herramientas MCP
```

## Configuración

Cada usuario puede habilitar/deshabilitar MCP a través de la tabla `MCPConfiguration`.

## Estado

✅ **PRODUCTION READY** - MCP v1.0.0 completo y funcional