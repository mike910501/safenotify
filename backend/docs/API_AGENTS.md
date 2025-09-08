# 🤖 API DOCUMENTATION - AI Agents CRM

## Descripción General

API REST para gestión de agentes IA personalizables en SafeNotify. Permite crear, configurar y administrar múltiples agentes de inteligencia artificial con personalidades y reglas de negocio específicas.

## 🔐 Autenticación

Todos los endpoints requieren autenticación JWT:
```http
Authorization: Bearer <token>
```

## 📊 Límites por Plan

| Plan | Agentes Permitidos | Características |
|------|-------------------|-----------------|
| Free | 1 | 1 agente personalizado |
| Basic | 1 | 1 agente personalizado |
| Pro | 3 | 3 agentes personalizados |
| Enterprise | Ilimitados | Sin restricciones |

**NOTA:** Sofia es el sistema interno de SafeNotify para vender SafeNotify a prospectos. Los Users del CRM crean sus propios agentes personalizados según su negocio.

## 📋 Endpoints

### 1. GET /api/agents
Obtiene lista de agentes IA del usuario autenticado.

**Request:**
```http
GET /api/agents
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent-id-123",
      "name": "Asistente Dental",
      "description": "Agente especializado en atención de pacientes dentales",
      "role": "assistant",
      "personalityPrompt": "Eres un asistente virtual especializado en atención dental...",
      "businessPrompt": "Esta clínica dental valora la atención personalizada...",
      "objectivesPrompt": "Objetivos: 1. Agendar citas 2. Resolver consultas...",
        "specialization": "SafeNotify Sales Assistant",
        "tone": "professional_friendly",
        "expertise": ["safenotify", "compliance", "sales"]
      },
      "isActive": true,
      "model": "gpt-3.5-turbo",
      "temperature": 0.7,
      "maxTokens": 500,
      "totalConversations": 150,
      "avgResponseTime": 2.3,
      "satisfactionScore": 4.2,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limits": {
    "planType": "pro",
    "maxAgents": 3,
    "currentCount": 1
  }
}
```

### 2. POST /api/agents
Crea un nuevo agente IA personalizado.

**Request:**
```http
POST /api/agents
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "SoporteBot",
  "description": "Agente especializado en soporte técnico",
  "personality": {
    "name": "SoporteBot",
    "specialization": "Technical Support",
    "tone": "helpful_professional",
    "expertise": ["troubleshooting", "technical_issues", "software"]
  },
  "businessRules": {
    "canScheduleDemo": false,
    "canAccessBilling": false,
    "escalateToHuman": true,
    "workingHours": "24/7"
  },
  "triggerConditions": {
    "keywords": ["soporte", "help", "problema", "error"],
    "priority": "high",
    "autoAssign": true
  },
  "model": "gpt-3.5-turbo",
  "temperature": 0.6,
  "maxTokens": 400,
  "responseStyle": {
    "maxLength": 160,
    "useEmojis": true,
    "language": "es_CO"
  }
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "agent-456",
    "name": "SoporteBot",
    "description": "Agente especializado en soporte técnico",
    "personality": { /* ... */ },
    "systemPrompt": "Eres SoporteBot, especializado en...",
    "businessRules": { /* ... */ },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Agente 'SoporteBot' creado exitosamente"
}
```

**Errores Comunes:**
- `400` - Datos inválidos o nombre duplicado
- `403` - Límite de agentes excedido para el plan
- `401` - Token inválido o faltante

### 3. PUT /api/agents/:id
Actualiza configuración de un agente existente.

**Request:**
```http
PUT /api/agents/agent-456
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "description": "Agente mejorado de soporte técnico",
  "personality": {
    "name": "SoporteBot",
    "specialization": "Advanced Technical Support",
    "tone": "friendly_expert"
  },
  "temperature": 0.7,
  "businessRules": {
    "canScheduleDemo": true,
    "workingHours": "9-18"
  }
}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "agent-456",
    "name": "SoporteBot",
    "description": "Agente mejorado de soporte técnico",
    /* campos actualizados */
  },
  "message": "Agente actualizado exitosamente"
}
```

**Restricciones:**
- ℹ️ Los Users crean y personalizan sus propios agentes
- ❌ NO se puede cambiar el `id` del agente
- ✅ Cambios en `personality` o `businessRules` regeneran el system prompt

### 4. DELETE /api/agents/:id
Elimina un agente (soft delete).

**Request:**
```http
DELETE /api/agents/agent-456
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Agente eliminado exitosamente. Las conversaciones activas se reasignaron al agente por defecto del User."
}
```

**Comportamiento:**
- ✅ Soft delete - el agente se marca como `isActive: false`
- ✅ Conversaciones activas se reasignan automáticamente al agente por defecto del User
- ❌ NO se puede eliminar el único agente activo del User

### 5. GET /api/agents/:id/test
Prueba un agente con un mensaje de ejemplo.

**Request:**
```http
GET /api/agents/agent-456/test?message=Hola, tengo un problema con mi cuenta
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "testMessage": "Hola, tengo un problema con mi cuenta",
  "agentResponse": "¡Hola! 👋 Soy SoporteBot y te voy a ayudar con tu cuenta. ¿Podrías contarme más detalles sobre el problema que tienes?",
  "agent": {
    "id": "agent-456",
    "name": "SoporteBot",
    "model": "gpt-3.5-turbo"
  },
  "metadata": {
    "tokensUsed": 45,
    "modelUsed": "gpt-3.5-turbo",
    "testMode": true,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 🚀 Integración con Sistema Existente

### Separación de Sistemas
- ✅ Sofia: Sistema interno SafeNotify para vender SafeNotify
- ✅ User CRM: Sistema independiente para agentes personalizados de Users
- ✅ Sistema de prompts dinámicos preservado
- ✅ Todas las funciones de scoring y qualification mantenidas

### Detección Automática de Agentes
El sistema detecta automáticamente qué agente usar basado en:

1. **Conversación Activa**: Si ya hay un agente asignado
2. **Keywords**: Palabras clave configuradas en `triggerConditions`
3. **Reglas de Negocio**: Horarios, prioridades, tipo de consulta
4. **Default**: Agente por defecto del User si no se encuentra agente específico

### Prompt System Integration
```javascript
// Los agentes personalizados usan el mismo sistema de prompts dinámicos
const dynamicPrompt = await dynamicPromptService.generateInitialPrompt(
  leadId,
  phoneNumber, 
  messageText,
  { agentId: selectedAgent.id } // 🚀 Nuevo parámetro
);

// El sistema combina:
// 1. Prompt base del agente personalizado
// 2. Contexto dinámico generado por IA
// 3. Información del lead y conversación
```

## 📱 Webhook Integration

El webhook de WhatsApp automáticamente:
1. Detecta el agente apropiado
2. Procesa el mensaje con ese agente
3. Envía la respuesta personalizada

```javascript
// Ejemplo de flujo automático
POST /api/webhooks/user-crm
{
  "From": "whatsapp:+573001234567",
  "Body": "Necesito soporte técnico urgente",
  "To": "whatsapp:+573009876543"
}

// El sistema:
// 1. Detecta keyword "soporte" 
// 2. Asigna automáticamente a SoporteBot
// 3. Genera respuesta especializada
// 4. Envía vía WhatsApp
```

## 🔒 Seguridad y Validaciones

### Validaciones de Input
- **Nombre**: Mínimo 2 caracteres, único por organización
- **Personalidad**: Debe incluir `specialization`
- **Prompts**: Sanitización automática, sin código malicioso
- **Límites de Plan**: Verificación en cada operación

### Rate Limiting
- **Creación**: 5 agentes por hora
- **Pruebas**: 20 tests por hora por agente
- **Actualizaciones**: 10 por hora por agente

### Ownership Validation
- ✅ Usuarios solo pueden gestionar sus propios agentes
- ✅ Aislamiento total entre organizaciones
- ✅ Logs de auditoría para cambios críticos

## 📊 Métricas y Monitoreo

### Métricas por Agente
```json
{
  "totalConversations": 150,
  "avgResponseTime": 2.3,
  "satisfactionScore": 4.2,
  "tokensUsed": 45000,
  "costEstimate": 12.50,
  "conversionRate": 0.15
}
```

### Analytics Endpoint (Futuro)
```http
GET /api/agents/:id/analytics?period=7d
```

## 🐛 Error Codes

| Code | Error | Descripción |
|------|-------|-------------|
| 400 | INVALID_AGENT_DATA | Datos de agente inválidos |
| 403 | AGENT_LIMIT_EXCEEDED | Límite de plan alcanzado |
| 403 | CANNOT_DELETE_LAST_AGENT | No se puede eliminar el único agente activo |
| 404 | AGENT_NOT_FOUND | Agente no encontrado |
| 409 | AGENT_NAME_EXISTS | Nombre duplicado |
| 429 | RATE_LIMIT_EXCEEDED | Demasiadas requests |

## 🔄 Ejemplos de Casos de Uso

### Caso 1: Soporte 24/7
```json
{
  "name": "NightSupport",
  "personality": {
    "specialization": "After Hours Support",
    "tone": "calm_helpful"
  },
  "triggerConditions": {
    "timeRange": "18:00-09:00",
    "keywords": ["urgente", "emergency"]
  }
}
```

### Caso 2: Ventas Especializadas
```json
{
  "name": "EnterprisesSales",
  "personality": {
    "specialization": "Enterprise Sales",
    "tone": "professional_consultive"
  },
  "triggerConditions": {
    "leadScore": ">= 70",
    "company": "enterprise"
  }
}
```

### Caso 3: Educación de Producto
```json
{
  "name": "ProductEducator", 
  "personality": {
    "specialization": "Product Education",
    "tone": "educational_friendly"
  },
  "businessRules": {
    "canSendDocuments": true,
    "canScheduleTraining": true
  }
}
```

---

**📞 Soporte**: Para dudas sobre la API, contactar al equipo de desarrollo.
**🔄 Versión**: v1.0.0 - Enero 2024