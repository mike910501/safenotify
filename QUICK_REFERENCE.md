# SafeNotify - Referencia Rápida

## Comandos Útiles

**Iniciar desarrollo:**
```bash
# Frontend
npm run dev

# Backend  
cd backend && npm start
# o con nodemon
cd backend && npm run dev
```

**Build producción:**
```bash
# Frontend
npm run build
npm run start

# Backend
cd backend && npm run build
```

**Correr tests:**
```bash
# Tests no implementados aún
cd backend && npm test
```

**Ver logs:**
```bash
# Logs desarrollo
tail -f backend/logs/*.log

# Docker production
docker logs safenotify-backend --tail=100
```

## Ubicaciones Clave

### Configuración Crítica
- **JWT Secret:** `backend/simple-server.js:136` ⚠️ Cambiar default
- **GPT Model Config:** `backend/services/openaiService.js:369` 
- **Max tokens setting:** `backend/services/openaiService.js:145`
- **Webhook handler:** `backend/routes/crmWebhook.js:22`
- **Auth middleware:** `backend/simple-server.js:537`
- **Database schema:** `backend/prisma/schema.prisma:1`

### Endpoints Importantes
- **Login:** `POST /api/auth/login` (simple-server.js:345)
- **CRM Webhook:** `POST /api/webhooks/user-crm` (crmWebhook.js:22)
- **Admin Dashboard:** `GET /api/admin/sofia/conversations` (simple-server.js:2494)
- **Create Campaign:** `POST /api/campaigns/create` (simple-server.js:1378)

## Flujos Principales

### Flujo de mensaje WhatsApp:
1. **Cliente envía mensaje** → Twilio Webhook
2. **Webhook recibido** → `backend/routes/crmWebhook.js:26`
3. **Identifica usuario** → `findUserWhatsAppNumber()` (línea 126)
4. **Crea/actualiza lead** → `findOrCreateCustomerLead()` (línea 155)
5. **Determina agente IA** → `determineUserAgent()` (línea 197)
6. **Genera respuesta** → `generateUserAgentResponse()` (línea 315)
7. **Envía WhatsApp** → `sendWhatsAppMessage()` (línea 406)

### Flujo de autenticación:
1. **Usuario ingresa credenciales** → `app/login/page.tsx`
2. **POST a /api/auth/login** → `backend/simple-server.js:345`
3. **Verifica con Prisma** → línea 363
4. **Genera JWT** → `generateToken()` línea 135
5. **Almacena en localStorage** → ⚠️ INSEGURO
6. **Middleware verifica token** → línea 537

## Solución Rápida a Problemas Comunes

### 🚨 Respuestas vacías de GPT:
- **Archivo:** `backend/services/openaiService.js`
- **Línea:** 222-233
- **Síntoma:** GPT retorna string vacío o muy corto
- **Solución:** Verificar parámetros GPT-5:
  ```javascript
  // INCORRECTO (causa respuestas vacías)
  max_tokens: 500
  
  // CORRECTO para GPT-5
  max_completion_tokens: 500
  ```
- **Fix urgente:** Líneas 178-199 - usar max_completion_tokens para modelos GPT-5

### 🔐 Error de autenticación:
- **Archivo:** `backend/simple-server.js`
- **Verificar:** JWT_SECRET en variables de entorno
- **Línea:** 136-153 (generación token)
- **Common issue:** Fallback secret being used
- **Fix:** Establecer `JWT_SECRET` en .env

### 💾 Error de base de datos:
- **Archivo:** `backend/simple-server.js`  
- **Línea:** 2596-2625 (database connection)
- **Verificar:** DATABASE_URL correcto
- **Retry:** Automático con max 3 intentos
- **Manual:** `npx prisma generate && npx prisma db push`

### 📱 WhatsApp no responde:
- **Archivo:** `backend/routes/crmWebhook.js`
- **Línea:** 56 - verificar número existe en UserWhatsAppNumber
- **Verificar:** 
  - Twilio credentials correctos
  - Número WhatsApp activo (`isActive: true`)
  - Usuario tiene CRM habilitado (`crmEnabled: true`)

### 🤖 Agente IA no encontrado:
- **Archivo:** `backend/routes/crmWebhook.js`
- **Línea:** 197-268 (determineUserAgent)
- **Verificar:**
  - Usuario tiene agente activo (`isActive: true`)
  - Agente default configurado (`isDefault: true`)
  - Keywords correctos en `triggerKeywords`

### 💰 Error en campañas (límite excedido):
- **Archivo:** `backend/simple-server.js`  
- **Línea:** 1544-1570
- **Error:** "Límite de mensajes excedido"
- **Verificar:** 
  - `messagesUsed` vs `messagesLimit` del usuario
  - Plan type y límites correctos
- **Fix temporal:** Aumentar `messagesLimit` en BD

## Configuración Rápida

### Variables de entorno esenciales (.env):
```env
# Database
DATABASE_URL="postgresql://..."

# Twilio  
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="+1..."

# OpenAI
OPENAI_API_KEY="sk-..."

# JWT (⚠️ CAMBIAR DEFAULT)
JWT_SECRET="tu-secret-super-seguro-aqui"

# Email
SMTP_USER="..."
SMTP_PASS="..."
```

### Configuración Frontend (.env.local):
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:3005"
```

### Configuración Producción (.env.production):
```env
NEXT_PUBLIC_BACKEND_URL="https://safenotify-backend.onrender.com"
```

## Debug Rápido

### Verificar sistema completo:
```bash
# 1. BD conectada
npx prisma db pull

# 2. Backend responde  
curl http://localhost:3005/health

# 3. Frontend carga
curl http://localhost:3000

# 4. Twilio webhook accesible (producción)
curl -X POST https://tu-backend.com/api/webhooks/user-crm
```

### Logs importantes para monitorear:
```javascript
// GPT-5 response debug
console.log('🤖 GPT RESPONSE DEBUG:', {
  hasContent: !!rawContent,
  length: rawContent?.length || 0,
  finishReason: completion.choices[0]?.finish_reason
}); // openaiService.js:211

// Auth debug  
console.log('🔑 Token found:', token ? 'Yes' : 'No'); // simple-server.js:541

// Webhook debug
console.log('📨 Incoming User CRM message:', From, To, Body); // crmWebhook.js:40
```

## Emergency Fixes

### 🆘 Sistema caído - Checklist rápido:
1. **¿Backend responde?** → `curl /health`
2. **¿BD conectada?** → `npx prisma studio`  
3. **¿Variables env correctas?** → verificar JWT_SECRET, DATABASE_URL
4. **¿Twilio webhook funciona?** → logs incoming messages
5. **¿GPT-5 responde?** → verificar OPENAI_API_KEY y parámetros

### 🔧 Restart rápido:
```bash
# Development
pkill -f "node.*3005"  # Backend
pkill -f "next.*3000"  # Frontend

# Production (si usa PM2)  
pm2 restart safenotify-backend
pm2 restart safenotify-frontend
```

### 🗂️ Reset BD (CUIDADO - solo desarrollo):
```bash
npx prisma migrate reset
npx prisma db seed  # Si existe
```

## Contactos de Emergencia

Si el sistema falla críticamenete:
- Verificar logs: `backend/logs/`
- Check Render dashboard si es producción
- Rollback a última versión estable
- Contactar administrador del sistema