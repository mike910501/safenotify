# 🗄️ DISEÑO DE BASE DE DATOS - CRM PARA CLIENTES SAFENOTIFY

## 📋 Resumen Ejecutivo

**Propósito**: Extensión de la base de datos SafeNotify para permitir que cada **User (cliente de SafeNotify)** gestione **SUS propios clientes** usando agentes IA personalizables.

**Arquitectura**: User-centric, single-tenant por User, extensión incremental de tablas existentes.

**Compatibilidad**: 100% compatible con sistema SafeNotify existente (Sofia interno).

## 🏗️ Arquitectura General

```
┌─────────────────────────────────┐
│      SafeNotify (Producto)      │ ← Sistema interno (YA EXISTE)
├─────────────────────────────────┤
│ Sofia: +57300XXX                │ ← Marketing SafeNotify  
│ ├─ SafeNotifyLead               │ ← Leads que quieren SafeNotify
│ ├─ SafeNotifyConversation       │ ← Conversaciones de venta
│ └─ ConversationPrompt           │ ← Prompts dinámicos Sofia
└─────────────────────────────────┘
           │
           ▼ "SafeNotify vende a Users"
┌─────────────────────────────────┐
│    User: "Clínica Dental"       │ ← Cliente QUE USA SafeNotify
├─────────────────────────────────┤
│ WhatsApp: +57301111111          │ ← SU número para SUS clientes
│ Agentes IA:                     │
│ ├─ "DrBot" (odontología)        │ ← Agente personalizado
│ ├─ "Recepción" (citas)          │
│ └─ Clientes: Pacientes          │ ← SUS leads (pacientes)
└─────────────────────────────────┘
```

## 🔑 Principios de Diseño

### ✅ **LO QUE HACEMOS:**
1. **Extender** `User` con campos CRM
2. **Crear** nuevas tablas para CRM del User
3. **Mantener** compatibilidad 100% con Sofia
4. **Aislar** completamente datos entre Users
5. **Permitir** múltiples números WhatsApp por User
6. **Habilitar** agentes IA personalizables

### ❌ **LO QUE NO TOCAMOS:**
1. **NO modificar** tablas SafeNotify existentes
2. **NO cambiar** sistema Sofia interno
3. **NO crear** organizations/businesses
4. **NO romper** funcionalidad actual

## 📊 Modelo de Datos Detallado

### 1. 👤 **EXTENSIÓN User (Tabla Central)**

```sql
-- Campos agregados a tabla users existente
ALTER TABLE users ADD COLUMN crm_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN crm_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN max_agents INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN max_whatsapp_numbers INTEGER DEFAULT 1;
```

**Propósito**: Cada User puede habilitar CRM para gestionar SUS clientes.

**Límites por plan:**
- `free`: 0 WhatsApp, 1 agente (solo demo)
- `basic`: 1 WhatsApp, 1 agente 
- `pro`: 2 WhatsApp, 3 agentes
- `enterprise`: 5 WhatsApp, ilimitados agentes

### 2. 📱 **UserWhatsAppNumber (Números por User)**

```prisma
model UserWhatsAppNumber {
  id              String    @id @default(cuid())
  userId          String    // FK a User
  
  phoneNumber     String    @unique     // "+573001234567"
  displayName     String                // "Clínica Central"
  isActive        Boolean   @default(true)
  isPrimary       Boolean   @default(false)
  
  webhookUrl      String?   // URL específica para este número
  twilioSid       String?   // Configuración Twilio
  businessHours   Json?     // Horarios de atención
  timezone        String    @default("America/Bogota")
  autoReply       Boolean   @default(true)
  
  defaultAgentId  String?   // Agente por defecto
  totalMessages   Int       @default(0)
  totalLeads      Int       @default(0)
  
  // Relaciones
  user            User      @relation(...)
  defaultAgent    UserAIAgent? @relation(...)
  conversations   CRMConversation[]
}
```

**Casos de uso:**
- **Restaurante**: `+57301111111` (Reservas), `+57302222222` (Delivery)
- **Clínica**: `+57303333333` (Citas), `+57304444444` (Urgencias)
- **Empresa**: `+57305555555` (Ventas), `+57306666666` (Soporte)

### 3. 🤖 **UserAIAgent (Agentes Personalizables)**

```prisma
model UserAIAgent {
  id                  String    @id @default(cuid())
  userId              String    // FK a User
  
  // Configuración básica
  name                String    // "DrBot", "Recepción", "Ventas"
  description         String?
  role                String    @default("assistant")
  isActive            Boolean   @default(true)
  isDefault           Boolean   @default(false)
  
  // Personalidad específica del negocio del User
  personalityPrompt   String    @db.Text
  businessPrompt      String    @db.Text
  objectivesPrompt    String    @db.Text
  
  // Configuración IA
  model               String    @default("gpt-3.5-turbo")
  temperature         Float     @default(0.7)
  maxTokensPerMessage Int       @default(500)
  
  // Reglas específicas del User
  businessRules       Json      @default("{}")
  triggerKeywords     String[]  @default([])
  activeHours         Json?
  
  // Métricas de performance
  totalConversations  Int       @default(0)
  avgResponseTime     Float     @default(0)
  satisfactionRating  Float     @default(0)
  totalTokensUsed     Int       @default(0)
  estimatedCost       Decimal   @default(0)
}
```

**Ejemplos de agentes por industria:**

| Industria | Agente | Personalidad | Objetivos |
|-----------|--------|--------------|-----------|
| **Odontología** | DrBot | Profesional, empático, conoce procedimientos | Agendar citas, educar sobre tratamientos |
| **Restaurante** | ChefBot | Amigable, conoce menú, sugiere platos | Tomar reservas, recomendar, delivery |
| **Gimnasio** | FitBot | Motivacional, conoce rutinas | Vender membresías, agendar clases |
| **Legal** | LawBot | Formal, confidencial, preciso | Agendar consultas, pre-calificar casos |

### 4. 📝 **UserAgentPrompt (Evolución Dinámica)**

```prisma
model UserAgentPrompt {
  id                  String    @id @default(cuid())
  agentId             String    // FK a UserAIAgent
  
  systemPrompt        String    @db.Text    // Prompt completo actual
  contextSummary      String    @db.Text    // Resumen del contexto
  businessContext     Json      @default("{}")
  
  version             Int       @default(1)
  triggerReason       String    // "initial", "conversation_update"
  isActive            Boolean   @default(true)
  
  tokensUsed          Int?
  responseQuality     Float?    // Rating de performance
  
  agent               UserAIAgent @relation(...)
}
```

**Evolución del prompt:**
1. **Prompt inicial**: Basado en personalidad del agente
2. **Auto-evolución**: Cada 5 mensajes, como Sofia actual  
3. **Contexto específico**: Incorpora datos del negocio del User
4. **Performance tracking**: Mejora automática basada en resultados

### 5. 👥 **CustomerLead (Clientes del User)**

```prisma
model CustomerLead {
  id                    String              @id @default(cuid())
  userId                String              // FK a User (propietario)
  
  // Información básica
  phone                 String              // Cliente del User
  name                  String?
  email                 String?
  company               String?
  
  // Segmentación específica del User
  customerType          String?             // "patient", "customer", "client"
  businessCategory      String?             // Categorías del negocio del User
  tags                  String[]            @default([])
  
  // Scoring para el negocio del User
  qualificationScore    Int                 @default(0)
  leadStatus            CustomerLeadStatus  @default(NEW)
  leadGrade             String              @default("C")
  
  // Datos específicos del negocio
  lastPurchase          DateTime?
  totalSpent            Decimal?            @default(0)
  preferences           Json?
  
  // Seguimiento interno del User
  source                String?
  assignedTo            String?             // Empleado del User
  lastActivity          DateTime            @default(now())
  nextFollowUp          DateTime?
  internalNotes         String?             @db.Text
}
```

**Diferencias con SafeNotifyLead:**
- `SafeNotifyLead`: Prospects que quieren **comprar SafeNotify**
- `CustomerLead`: Clientes de **usuarios de SafeNotify**

### 6. 💬 **CRMConversation (Conversaciones del User)**

```prisma
model CRMConversation {
  id                  String              @id @default(cuid())
  userId              String              // User propietario
  customerLeadId      String              // Su cliente
  whatsappNumberId    String              // Su número WhatsApp
  
  sessionId           String              @unique
  customerPhone       String
  
  // Estado específico del User
  status              ConversationStatus  @default(ACTIVE)
  currentStep         String              @default("greeting")
  priority            ConversationPriority @default(NORMAL)
  
  // Agente IA del User asignado
  currentAgentId      String?             // FK a UserAIAgent
  agentName           String?
  
  // Mensajes y métricas
  messages            Json[]              @default([])
  messageCount        Int                 @default(0)
  firstResponseTime   Int?
  avgResponseTime     Float?
  lastMessageAt       DateTime            @default(now())
  
  // Gestión interna del User
  requiresAttention   Boolean             @default(false)
  assignedToUser      String?             // Empleado del User
  tags                String[]            @default([])
  category            String?
  intent              String?
  
  // Resultados del negocio del User
  satisfactionRating  Int?
  outcome             String?
  conversionValue     Decimal?            @default(0)
  internalNotes       String?             @db.Text
}
```

### 7. 📊 **CRMMetrics (Métricas del User)**

```prisma  
model CRMMetrics {
  id                    String    @id @default(cuid())
  userId                String    // User propietario
  
  period                String    // "daily", "weekly", "monthly"
  periodStart           DateTime
  periodEnd             DateTime
  
  // Métricas de conversaciones del User
  totalConversations    Int       @default(0)
  activeConversations   Int       @default(0)
  newConversations      Int       @default(0)
  completedConversations Int      @default(0)
  
  // Métricas de leads del User
  totalLeads            Int       @default(0)
  newLeads              Int       @default(0)
  qualifiedLeads        Int       @default(0)
  convertedLeads        Int       @default(0)
  
  // Métricas de agentes del User
  totalMessages         Int       @default(0)
  aiMessages            Int       @default(0)
  humanMessages         Int       @default(0)
  avgResponseTime       Float     @default(0)
  
  // Métricas de negocio del User
  totalRevenue          Decimal   @default(0)
  avgConversionValue    Decimal   @default(0)
  satisfactionAvg       Float     @default(0)
  
  // Costos de IA del User
  totalTokensUsed       Int       @default(0)
  estimatedAICost       Decimal   @default(0)
}
```

## 🔄 Plan de Migración

### **Fase 1: Preparación**
```sql
-- 1. Agregar campos CRM a users
ALTER TABLE users ADD COLUMN crm_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN crm_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN max_agents INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN max_whatsapp_numbers INTEGER DEFAULT 1;
```

### **Fase 2: Tablas CRM**
```sql
-- 2. Crear todas las tablas CRM
-- Ver: prisma/migrations/001_add_crm_tables.sql
CREATE TABLE user_whatsapp_numbers (...);
CREATE TABLE user_ai_agents (...);
CREATE TABLE customer_leads (...);
CREATE TABLE crm_conversations (...);
-- ... etc
```

### **Fase 3: Migración de Datos**
```bash
# 3. Migrar Users existentes
node scripts/migrate-existing-users-to-crm.js

# Resultados esperados:
# ✅ Cada User recibe crmEnabled = true
# ✅ Cada User recibe un agente "Asistente" por defecto
# ✅ Límites configurados según planType
# ✅ Métricas iniciales en 0
```

### **Fase 4: Rollback (Si necesario)**
```bash
# Rollback completo disponible
node scripts/migrate-existing-users-to-crm.js rollback
# O ejecutar: prisma/migrations/001_rollback.sql
```

## 🚀 Flujo de Funcionamiento

### **1. Routing de Mensajes WhatsApp**

```
Mensaje entrante → +57301234567
    ↓
1. Buscar UserWhatsAppNumber con phoneNumber = "+57301234567"
    ↓
2. Obtener User propietario
    ↓  
3. Buscar/crear CustomerLead para el remitente
    ↓
4. Determinar UserAIAgent (por keywords, horario, etc.)
    ↓
5. Procesar con agente personalizado del User
    ↓
6. Responder usando personalidad del agente del User
```

### **2. Procesamiento con Agente Personalizado**

```javascript
// Pseudo-código del flujo
async function processUserCRMMessage(incomingNumber, messageText, fromUser) {
  // 1. Identificar User propietario del número
  const whatsappNumber = await findUserWhatsAppNumber(incomingNumber);
  const user = whatsappNumber.user;
  
  // 2. Encontrar/crear lead del User
  const customerLead = await findOrCreateCustomerLead(user.id, fromUser);
  
  // 3. Determinar agente del User
  const agent = await determineUserAgent(user.id, messageText, whatsappNumber);
  
  // 4. Generar respuesta con personalidad del User
  const response = await generateUserAgentResponse(agent, messageText, customerLead);
  
  // 5. Enviar respuesta desde número del User
  await sendWhatsAppMessage(incomingNumber, response.message);
  
  // 6. Registrar métricas del User
  await updateUserCRMMetrics(user.id, response);
}
```

## 📈 Casos de Uso Reales

### **Caso 1: Clínica Dental**
```yaml
User: "Dr. Juan Pérez"
crmPlan: "pro"
whatsappNumbers:
  - "+57301111111" (Citas generales)
  - "+57302222222" (Urgencias)

agents:
  - name: "DrBot"
    role: "sales"  
    personalityPrompt: "Eres un asistente dental profesional..."
    businessRules:
      canScheduleAppointments: true
      workingHours: "08:00-18:00"
      specialties: ["limpieza", "ortodoncia", "implantes"]
    triggerKeywords: ["cita", "dolor", "limpieza"]
    
  - name: "Urgencias"
    role: "support"
    personalityPrompt: "Eres un asistente de urgencias dentales..."
    activeHours: "18:00-08:00"  # Fuera de horario
    triggerKeywords: ["urgencia", "dolor fuerte", "emergencia"]

customerLeads:
  - name: "María González"
    phone: "+57311111111"
    customerType: "patient"
    businessCategory: "ortodoncia"
    preferences: {"prefers_morning": true, "insurance": "Sura"}
    lastActivity: "2024-01-15"
    nextFollowUp: "2024-02-01"
```

### **Caso 2: Restaurante**
```yaml
User: "Restaurante La Plaza"
crmPlan: "basic"  
whatsappNumbers:
  - "+57303333333" (Reservas y delivery)

agents:
  - name: "ChefBot"
    role: "sales"
    personalityPrompt: "Eres el asistente del restaurante, conoces el menú..."
    businessRules:
      canTakeReservations: true
      canProcessDelivery: true
      menuKnowledge: true
    triggerKeywords: ["reserva", "delivery", "menú", "plato"]

customerLeads:
  - name: "Carlos López"
    phone: "+57322222222"
    customerType: "customer"
    businessCategory: "regular"
    preferences: {"favorite_dish": "paella", "delivery_address": "Cra 15 #45-23"}
    totalSpent: 450000
    lastPurchase: "2024-01-10"
```

## 🔒 Seguridad y Aislamiento

### **Aislamiento de Datos:**
- ✅ Cada User solo ve **SUS** leads, conversaciones, agentes
- ✅ **NO** hay acceso cruzado entre Users
- ✅ Queries siempre filtrados por `userId`
- ✅ Middleware de autorización en todas las APIs

### **Validaciones:**
```sql
-- Ejemplo de constraint de seguridad
CREATE POLICY "users_own_data" ON customer_leads
FOR ALL TO authenticated_users
USING (user_id = current_user_id());

-- Índices para performance y seguridad
CREATE INDEX idx_customer_leads_user_security 
ON customer_leads(user_id, phone);
```

## 📊 Métricas y KPIs

### **Por User:**
- **Conversaciones**: Activas, nuevas, completadas
- **Leads**: Nuevos, calificados, convertidos  
- **Agentes**: Response time, satisfacción, tokens usados
- **Negocio**: Revenue, conversion rate, ROI

### **Globales (SafeNotify):**
- **Adopción CRM**: % Users con CRM habilitado
- **Uso de agentes**: Promedio de agentes por User
- **Revenue CRM**: Ingresos adicionales por CRM
- **Engagement**: Mensajes procesados, satisfacción

## 🔧 Consideraciones Técnicas

### **Performance:**
- Índices optimizados para queries por `userId`
- Particionamiento por User en tablas grandes
- Cache de agentes activos por User
- Async processing de métricas

### **Escalabilidad:**
- Schema preparado para millones de Users
- Métricas agregadas para evitar queries pesadas  
- Cleanup automático de conversaciones old
- Archival de datos históricos

### **Backup y Recovery:**
- Backup incremental por User
- Restore selectivo de datos de User
- Audit trail de cambios críticos
- Disaster recovery por región

---

## ✅ **SUMMARY: READY FOR IMPLEMENTATION**

El diseño está **completo y listo para implementar**:

1. ✅ **Schema definido** con todas las tablas y relaciones
2. ✅ **Migraciones SQL** con rollback completo
3. ✅ **Scripts de migración** de datos existentes  
4. ✅ **Casos de uso** documentados y validados
5. ✅ **Seguridad** y aislamiento garantizados
6. ✅ **Performance** y escalabilidad consideradas

**🎯 Próximo paso**: Implementar las APIs y servicios para gestionar este CRM.