# SafeNotify - Análisis Completo del Sistema
Fecha: 2025-09-10
Analizado por: Claude Code

## 1. RESUMEN EJECUTIVO

**Estado general del proyecto:** SafeNotify es un sistema funcional de notificaciones WhatsApp con características CRM avanzadas y sistema de agentes IA, pero presenta **vulnerabilidades críticas de seguridad** que requieren atención inmediata antes de producción.

### Problemas críticos encontrados:
- **[CRÍTICO]** JWT tokens almacenados en localStorage (vulnerable a XSS)
- **[CRÍTICO]** Verificación de roles solo del lado cliente (bypasseable)
- **[CRÍTICO]** API endpoints sin autenticación adecuada
- **[CRÍTICO]** Respuestas vacías de GPT-5 causando fallos en conversaciones

### Recomendaciones urgentes:
1. Migrar autenticación a httpOnly cookies
2. Implementar verificación de roles del lado servidor
3. Corregir integración GPT-5 (parámetros incorrectos)
4. Agregar validación CSRF y sanitización XSS

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Diagrama de Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Express.js    │    │  PostgreSQL DB  │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Prisma ORM)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │Dashboard│             │OpenAI   │             │Twilio   │
    │  CRM    │             │GPT-5    │             │WhatsApp │
    └─────────┘             │Service  │             │Business │
                            └─────────┘             │API      │
                                                   └─────────┘
```

### 2.2 Stack Tecnológico

**Frontend:**
- Next.js 14.2.32 (React 18)
- TypeScript
- Tailwind CSS 3.4.1
- Lucide React (iconos)
- Recharts (gráficos)
- Socket.io-client 4.8.1

**Backend:**
- Node.js con Express 4.18.2
- Prisma ORM 6.14.0
- PostgreSQL
- Bull Queue (procesamiento trabajos)
- Socket.io 4.8.1 (WebSocket)
- Winston (logging)

**Base de datos:**
- PostgreSQL con Prisma ORM
- 43 modelos principales
- Esquema complejo con CRM, usuarios, conversaciones

**Servicios externos:**
- Twilio WhatsApp Business API
- OpenAI GPT-5/GPT-5-mini/GPT-4o
- Wompi (pagos)
- Zoho Mail (SMTP)

**Infraestructura:**
- Render.com (despliegue)
- Docker (contenedores)

### 2.3 Flujo de Datos

**Flujo WhatsApp → IA → Respuesta:**
1. Cliente envía mensaje WhatsApp a Twilio
2. Twilio webhook → `/api/webhooks/user-crm` (crmWebhook.js:22)
3. Sistema identifica usuario propietario del número (crmWebhook.js:56)
4. Crea/actualiza CustomerLead (crmWebhook.js:66)
5. Determina agente IA apropiado (crmWebhook.js:69)
6. Genera respuesta con OpenAI usando configuración del usuario (crmWebhook.js:364)
7. Envía respuesta vía Twilio (crmWebhook.js:406)
8. Actualiza métricas CRM (crmWebhook.js:427)

## 3. ESTRUCTURA DEL PROYECTO

### 3.1 Árbol de Directorios

```
safenotify/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Panel principal
│   │   ├── crm/          # Sistema CRM
│   │   ├── analytics/    # Analíticas
│   │   ├── templates/    # Plantillas
│   │   └── send/         # Envío campañas
│   ├── login/            # Autenticación
│   └── register/         # Registro
├── backend/              # Servidor Express
│   ├── routes/          # Rutas API (18 archivos)
│   ├── services/        # Servicios (OpenAI, Twilio)
│   ├── jobs/           # Trabajos en cola
│   ├── config/         # Configuraciones
│   └── prisma/         # Esquema BD
├── components/         # Componentes React
│   ├── crm/           # CRM específicos
│   ├── auth/          # Autenticación
│   └── ui/            # UI generales
└── lib/               # Utilidades compartidas
```

### 3.2 Archivos Principales

| Archivo | Descripción | Estado | Problemas |
|---------|-------------|--------|-----------|
| `backend/simple-server.js` | Servidor principal Express | ✅ Funcional | Endpoints sin auth |
| `backend/services/openaiService.js` | Integración GPT-5 | ⚠️ Con errores | Respuestas vacías |
| `backend/routes/crmWebhook.js` | Webhook WhatsApp | ✅ Funcional | Context overflow |
| `backend/prisma/schema.prisma` | Esquema base de datos | ✅ Completo | Índices faltantes |
| `app/dashboard/crm/page.tsx` | Dashboard CRM principal | ✅ Funcional | Race conditions |

## 4. ANÁLISIS POR COMPONENTE

### 4.1 Sistema de Autenticación
**Archivos involucrados:** 
- `backend/simple-server.js:345-430` (login)
- `backend/simple-server.js:432-534` (registro)  
- `backend/simple-server.js:537-562` (middleware auth)

**Flujo:** JWT generado → almacenado en localStorage → enviado en headers

**Problemas encontrados:**
- **[CRÍTICO]** Tokens en localStorage vulnerable a XSS
- **[IMPORTANTE]** Roles verificados solo en cliente
- **[MODERADO]** Sin timeout de sesión automático

**Estado:** ❌ Inseguro - Requiere refactoring completo

### 4.2 Sistema de Chatbot
**Archivos involucrados:**
- `backend/services/openaiService.js` (generación respuestas)
- `backend/routes/crmWebhook.js` (manejo mensajes)
- `backend/services/ai/modelSelector.js` (selección modelo)

**Configuración actual:**
- GPT-5-mini por defecto (openaiService.js:369)
- Temperature configurable (openaiService.js:148-161)
- Context inteligente con límite 20 mensajes (crmWebhook.js:332)

**Problemas encontrados:**
- **[CRÍTICO]** GPT-5 retorna respuestas vacías (openaiService.js:222)
- **[IMPORTANTE]** Parámetros GPT-5 incorrectos
- **[MODERADO]** Context puede hacer overflow

**Estado:** ⚠️ Con bugs críticos - Funciona pero falla frecuentemente

### 4.3 Integración WhatsApp/Twilio
**Archivos involucrados:**
- `backend/routes/crmWebhook.js` (webhook principal)
- `backend/config/twilio.js` (configuración)
- `backend/simple-server.js:75-76` (cliente Twilio)

**Configuración:**
- Account SID y Auth Token via env vars
- Números WhatsApp por usuario (UserWhatsAppNumber)
- Templates con Content SID

**Problemas encontrados:**
- **[IMPORTANTE]** Error 63028 variables duplicadas (simple-server.js:1738)
- **[MODERADO]** Rate limiting básico
- **[MENOR]** Logs con información sensible

**Estado:** ✅ Funcional con mejoras necesarias

### 4.4 Base de Datos
**Esquema:** 43 modelos Prisma con relaciones complejas

**Migraciones pendientes:** Ninguna detectada

**Índices faltantes:**
- `GPTUsage.phone` (schema.prisma:667)
- `CRMConversation.lastActivity` (schema.prisma:930)
- `CustomerLead.qualificationScore` (schema.prisma:859)

**Problemas:**
- **[IMPORTANTE]** Sin índices en campos de búsqueda frecuente
- **[MODERADO]** Queries N+1 potenciales en relaciones

### 4.5 APIs y Endpoints

| Endpoint | Método | Auth | Estado | Problemas |
|----------|--------|------|--------|-----------|
| `/api/auth/login` | POST | ❌ | ✅ | JWT inseguro |
| `/api/templates-ai/create` | POST | ✅ | ✅ | - |
| `/api/campaigns/create` | POST | ✅ | ⚠️ | Validation bypass |
| `/api/webhooks/user-crm` | POST | ❌ | ✅ | Sin verificación |
| `/api/admin/sofia/conversations` | GET | ⚠️ | ✅ | Role client-side |

## 5. PROBLEMAS ENCONTRADOS

### 5.1 CRÍTICOS (Requieren atención inmediata)

- [ ] **JWT en localStorage** - `app/dashboard/crm/page.tsx:72` - Vulnerable a XSS
- [ ] **Admin bypass** - `app/admin/page.tsx:76` - Verificación solo cliente
- [ ] **GPT-5 respuestas vacías** - `backend/services/openaiService.js:222` - Conversaciones fallan
- [ ] **Webhook sin auth** - `backend/routes/crmWebhook.js:22` - Endpoint público
- [ ] **SQL injection potential** - Prisma queries sin sanitización

### 5.2 IMPORTANTES (Afectan funcionalidad)

- [ ] **Error variables duplicadas** - `backend/simple-server.js:1738` - Twilio falla
- [ ] **Race conditions** - `app/dashboard/crm/page.tsx:156,177` - UI inconsistente  
- [ ] **Context overflow** - `backend/routes/crmWebhook.js:332` - GPT falla con historial largo
- [ ] **Missing CSRF protection** - Todos los formularios
- [ ] **No request timeouts** - Llamadas API sin timeout

### 5.3 MODERADOS (Mejoras recomendadas)

- [ ] **Logs con info sensible** - `backend/routes/crmWebhook.js:41` - Datos personales en logs
- [ ] **No pagination** - `app/dashboard/crm/page.tsx` - Performance con muchas conversaciones
- [ ] **Missing error boundaries** - React components sin manejo errores
- [ ] **Hardcoded values** - `next.config.mjs:8-12` - Configs que deberían ser env vars
- [ ] **No retry mechanisms** - API calls fallan sin reintentos

### 5.4 MENORES (Nice to have)

- [ ] **Debug code in production** - `app/dashboard/send/page.tsx:383-491` - Botones debug visibles
- [ ] **Console.log statements** - Multiple archivos - Performance y seguridad
- [ ] **Unused dependencies** - `package.json` - Bundle size
- [ ] **Missing TypeScript strict** - Algunos archivos sin types estrictos
- [ ] **No code splitting** - Frontend monolítico

## 6. CÓDIGO INCOMPLETO/TODOs

**Funcionalidades incompletas:**

1. **Sistema Help** - `app/dashboard/help/page.tsx:63` - Guías no implementadas
2. **Test Mode** - `app/dashboard/send/page.tsx:383-491` - Debug UI visible  
3. **Analytics avanzado** - `app/dashboard/crm/analytics/page.tsx` - Métricas básicas
4. **Human takeover** - `backend/routes/humanTakeover.js` - Parcialmente implementado
5. **Payment webhooks** - `backend/routes/payments.js` - Solo estructura básica

**TODOs encontrados:**
- "SOFIA ADMIN: Retrieved" - `backend/simple-server.js:2537` - Debug info
- "Enhanced tracking" - `backend/services/openaiService.js:235` - Tracking incompleto
- "Validation bypass" - `backend/simple-server.js:1553` - Plan limits bypasseable

## 7. VULNERABILIDADES DE SEGURIDAD

### Autenticación y Autorización
- **JWT en localStorage** → Vulnerable a XSS
- **Roles solo en cliente** → Bypasseable
- **Sin CSRF protection** → Ataques CSRF
- **Endpoints sin auth** → Acceso no autorizado

### Validación de Entrada  
- **Sin sanitización XSS** → Script injection
- **Validación solo cliente** → Bypass server-side
- **File upload sin límites** → DoS/malware
- **SQL injection potential** → Data breach

### Exposición de Información
- **API keys en código** → Exposición secrets
- **Logs con datos personales** → Privacy breach  
- **Error messages verbose** → Information disclosure
- **Debug endpoints activos** → Internal info leak

## 8. OPTIMIZACIONES RECOMENDADAS

### 8.1 Performance
- **Implementar paginación** en listas de conversaciones/usuarios
- **Code splitting** en frontend para reducir bundle inicial
- **Caching Redis** para queries frecuentes de BD
- **CDN** para assets estáticos
- **Database indexing** en campos de búsqueda

### 8.2 Código
- **TypeScript strict mode** en todos los archivos
- **ESLint/Prettier** configuración estricta
- **Unit tests** cobertura mínima 70%
- **Error boundaries** en React components
- **Dead code removal** - dependencias no usadas

### 8.3 Arquitectura
- **API Gateway** para rate limiting y auth
- **Microservicios** separar CRM, notifications, payments
- **Event-driven** architecture para webhooks
- **Backup strategy** para BD y files
- **Monitoring** con Sentry/DataDog

## 9. CONFIGURACIÓN Y VARIABLES DE ENTORNO

### 9.1 Variables requeridas
```env
# Base de datos
DATABASE_URL=postgresql://...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+1...

# OpenAI  
OPENAI_API_KEY=sk-...

# JWT
JWT_SECRET=... (CRÍTICO: cambiar default)

# Email
SMTP_USER=...
SMTP_PASS=...
```

### 9.2 Variables faltantes
- `REDIS_URL` - Para caching y sessions
- `SENTRY_DSN` - Error monitoring  
- `RATE_LIMIT_MAX` - Rate limiting config
- `SESSION_TIMEOUT` - Timeout configuración

### 9.3 Configuraciones hardcodeadas que deben moverse
- Rate limits - `backend/simple-server.js:20` → ENV var
- Business hours - `backend/routes/crmWebhook.js` → Config model
- Message limits - `backend/simple-server.js:1544` → Plan model

## 10. DEPENDENCIAS

### 10.1 Dependencias actualizables
- `next: 14.2.32` → `15.0.x` (major update)
- `@prisma/client: 6.14.0` → `6.15.x` (minor)  
- `react: ^18` → `18.3.x` (patch)

### 10.2 Dependencias con vulnerabilidades
- Ninguna crítica detectada (npm audit clean)
- Monitorear actualizaciones de seguridad

### 10.3 Dependencias no utilizadas  
- `crypto: ^1.0.1` (built-in Node.js)
- Posibles dependencias dev en producción

## 11. TESTING

### 11.1 Coverage actual
- **0%** - No tests encontrados
- **Frontend:** Sin tests unitarios ni e2e
- **Backend:** Sin tests API ni integration

### 11.2 Tests faltantes
- Unit tests para services
- Integration tests para APIs  
- E2E tests para flujos críticos
- Security tests para vulnerabilidades

### 11.3 Tests fallando
- N/A - No hay tests implementados

## 12. DOCUMENTACIÓN FALTANTE

- **API documentation** - OpenAPI/Swagger spec
- **Deployment guide** - Pasos producción
- **Environment setup** - Variables y configuración
- **Troubleshooting guide** - Problemas comunes
- **Architecture decision records** - Decisiones técnicas

## 13. MÉTRICAS DEL CÓDIGO

- **Total de líneas:** ~18,776 archivos
- **Archivos TypeScript/JavaScript:** 156 archivos
- **Funciones:** ~500 funciones estimadas
- **Complejidad ciclomática promedio:** Media-Alta (no medida)
- **Duplicación de código:** Baja-Media (algunos patterns repetidos)

## 14. PLAN DE ACCIÓN RECOMENDADO

### Fase 1 - Seguridad Crítica (Semana 1)
1. **Migrar auth a httpOnly cookies** (simple-server.js)
2. **Implementar verificación server-side roles** (middleware)  
3. **Corregir GPT-5 respuestas vacías** (openaiService.js:222)
4. **Agregar CSRF protection** (todos los forms)

### Fase 2 - Estabilidad (Semana 2)  
5. **Fix error variables duplicadas Twilio** (simple-server.js:1738)
6. **Implementar race condition fixes** (CRM dashboard)
7. **Agregar request timeouts y retries** (API calls)
8. **Database indexing** (performance queries)

### Fase 3 - Robustez (Semana 3)
9. **Error boundaries React** (todos los components)
10. **Input validation y sanitización** (XSS protection)
11. **Logging strategy** (remove sensitive data)
12. **Testing suite básico** (unit + integration)

### Fase 4 - Optimización (Semana 4)
13. **Code splitting frontend** (performance)
14. **API pagination** (grandes datasets)
15. **Monitoring y alertas** (production ready)
16. **Documentation completa** (deployment, troubleshooting)

## 15. CONSULTAS RÁPIDAS

### Cómo encontrar:
- **Sistema de autenticación:** `backend/simple-server.js:537-562`
- **Configuración de GPT:** `backend/services/openaiService.js:369`
- **Webhooks:** `backend/routes/crmWebhook.js:22`
- **Manejo de errores:** `backend/services/fallbackResponseService.js`
- **Logs:** `backend/config/logger.js`
- **Database schema:** `backend/prisma/schema.prisma`
- **Frontend auth:** `hooks/useAuth.tsx`
- **CRM dashboard:** `app/dashboard/crm/page.tsx`

### Comandos de emergencia:
```bash
# Logs backend
docker logs safenotify-backend --tail=100

# Reiniciar servicios
docker-compose restart

# Check BD
npx prisma studio

# Ver workers
pm2 status
```