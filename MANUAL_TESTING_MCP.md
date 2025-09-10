# 📋 MANUAL DE TESTING - SafeNotify MCP v1.0.0

## 🎯 GUÍA COMPLETA PARA PROBAR LAS NUEVAS FUNCIONES MCP

### 📋 **CHECKLIST DE PRUEBAS**

---

## 🔧 **1. CONFIGURACIÓN INICIAL**

### ✅ **Variables de Entorno Requeridas:**
```bash
# Backend/.env
DATABASE_URL="your_postgresql_url"
OPENAI_API_KEY="sk-your-openai-key"
TWILIO_ACCOUNT_SID="your_twilio_sid" 
TWILIO_AUTH_TOKEN="your_twilio_token"
CLOUDINARY_CLOUD_NAME="your_cloudinary_name"
CLOUDINARY_API_KEY="your_cloudinary_key"
CLOUDINARY_API_SECRET="your_cloudinary_secret"
```

### ✅ **Verificar Base de Datos:**
```bash
cd backend
npx prisma db push
npx prisma generate
```

---

## 🤖 **2. TESTING DE AGENTES IA CON MCP**

### ✅ **2.1 Verificar Agente Sofia:**
```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.userAIAgent.findMany().then(agents => {
  console.log('🤖 AGENTES DISPONIBLES:');
  agents.forEach(agent => console.log('  -', agent.name, '(ID:', agent.id + ')'));
  prisma.\$disconnect();
});
"
```

### ✅ **2.2 Probar Detección de Industria:**
- Envía mensaje con palabra clave "doctor" → Debe detectar industria "healthcare"
- Envía mensaje con palabra clave "abogado" → Debe detectar industria "legal"
- Envía mensaje con palabra clave "reserva" → Debe detectar industria "restaurant"
- Envía mensaje con palabra clave "belleza" → Debe detectar industria "beauty"

---

## 📅 **3. SISTEMA DE CALENDARIO**

### ✅ **3.1 Comandos de Prueba:**
```javascript
// Test disponibilidad
"¿Tienes citas disponibles para mañana?"
"Quiero agendar una cita médica"
"¿A qué horas atienden?"

// Test reservas
"Necesito una consulta para el viernes a las 3pm"
"Quiero reservar mesa para 4 personas"
"Agendar cita de belleza para el sábado"
```

### ✅ **3.2 Verificar en Base de Datos:**
```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.calendarEvent.findMany().then(events => {
  console.log('📅 EVENTOS CREADOS:', events.length);
  events.forEach(e => console.log('  -', e.title, e.startTime));
  prisma.\$disconnect();
});
"
```

---

## 💬 **4. MENSAJES INTERACTIVOS CON BOTONES**

### ✅ **4.1 Mensajes que Activan Botones:**
```javascript
// Estos mensajes deben generar botones interactivos:
"Quiero agendar una cita"
"¿Cuáles son sus horarios?"
"Necesito cancelar mi cita"
"Quiero hablar con un humano"
"¿Tienen disponibilidad?"
```

### ✅ **4.2 Verificar Respuesta con Botones:**
La respuesta debe incluir estructura JSON como:
```json
{
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "¿En qué puedo ayudarte?" },
    "action": {
      "buttons": [
        { "id": "check_availability", "title": "Ver Horarios" },
        { "id": "book_appointment", "title": "Agendar Cita" },
        { "id": "contact_human", "title": "Hablar con Humano" }
      ]
    }
  }
}
```

---

## 🛠️ **5. HERRAMIENTAS MCP DISPONIBLES**

### ✅ **5.1 Lista de 8 Herramientas:**
1. **send_multimedia** - Enviar imágenes/videos
2. **save_conversation_data** - Guardar datos del cliente
3. **analyze_customer_intent** - Analizar intención del cliente
4. **schedule_follow_up** - Programar seguimiento
5. **check_availability** - Verificar disponibilidad
6. **book_appointment** - Agendar citas
7. **send_interactive_message** - Enviar mensajes con botones
8. **get_upcoming_appointments** - Obtener próximas citas

### ✅ **5.2 Test Individual de Herramientas:**
```bash
cd backend
node scripts/testMCPIntegration.js
```

---

## 📊 **6. APIS ADMINISTRATIVAS**

### ✅ **6.1 Endpoints Disponibles:**
```bash
# Listar clientes
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/crm/customers

# Estadísticas
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/crm/customers/stats

# Cliente específico
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/crm/customers/CUSTOMER_ID

# Exportar CSV
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/api/crm/customers/export
```

### ✅ **6.2 Crear API Key de Testing:**
```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function createTestApiKey() {
  const user = await prisma.user.findUnique({
    where: { email: 'mikehuertas91@gmail.com' }
  });
  
  const apiKey = await prisma.apiKey.create({
    data: {
      key: 'sk-test-' + crypto.randomBytes(32).toString('hex'),
      name: 'Testing MCP',
      userId: user.id,
      isActive: true
    }
  });
  
  console.log('🔑 API Key creada:', apiKey.key);
  prisma.\$disconnect();
}

createTestApiKey();
"
```

---

## 🧪 **7. FLUJOS DE TESTING COMPLETOS**

### ✅ **7.1 Flujo Healthcare (Médico):**
1. **Cliente:** "Hola, necesito una cita con el doctor"
2. **Esperado:** Detección de industria "healthcare" + botones interactivos
3. **Cliente:** Clic en "Agendar Cita"
4. **Esperado:** Formulario de disponibilidad + slots de tiempo
5. **Cliente:** Selecciona fecha/hora
6. **Esperado:** Confirmación + evento guardado en calendario

### ✅ **7.2 Flujo Restaurant:**
1. **Cliente:** "Quiero hacer una reserva para esta noche"
2. **Esperado:** Detección "restaurant" + opciones de reserva
3. **Cliente:** "Para 4 personas a las 8pm"
4. **Esperado:** Verificación de disponibilidad + confirmación

### ✅ **7.3 Flujo Legal:**
1. **Cliente:** "Necesito consulta con abogado"
2. **Esperado:** Detección "legal" + protocolo de confidencialidad
3. **Cliente:** Describe caso básico
4. **Esperado:** Agendamiento de consulta + recopilación de información

---

## 📱 **8. TESTING EN WHATSAPP**

### ✅ **8.1 Configurar Webhook de Twilio:**
```
Webhook URL: https://your-domain.com/api/webhooks/user-crm
Method: POST
```

### ✅ **8.2 Mensajes de Prueba en WhatsApp:**
```
1. "Hola Sofia"
2. "Necesito una cita médica"
3. "¿Tienen disponibilidad para mañana?"
4. "Quiero cancelar mi cita"
5. "Hablar con humano"
```

### ✅ **8.3 Verificar Logs:**
```bash
# Ver logs en tiempo real
tail -f backend/logs/app.log

# O usar el logger en consola
cd backend && npm run dev
```

---

## 🚨 **9. TROUBLESHOOTING**

### ❌ **Problemas Comunes:**

**🔧 Error: "Module not found '@prisma/client'"**
```bash
cd backend
npm install
npx prisma generate
```

**🔧 Error: "OpenAI API key not configured"**
- Verificar variable `OPENAI_API_KEY` en `.env`

**🔧 Error: "Database connection failed"**
- Verificar `DATABASE_URL` en `.env`
- Ejecutar `npx prisma db push`

**🔧 Botones no aparecen en WhatsApp:**
- Verificar webhook URL configurada
- Revisar logs del servidor
- Confirmar API de Twilio activa

**🔧 Calendario no funciona:**
```bash
cd backend
node -e "require('./services/calendarService'); console.log('✅ Calendar service OK');"
```

---

## ✅ **10. VALIDACIÓN FINAL**

### 📊 **Checklist de Producción:**
- [ ] ✅ Base de datos migrada
- [ ] ✅ APIs responden correctamente  
- [ ] ✅ WhatsApp webhook funcional
- [ ] ✅ Botones interactivos activos
- [ ] ✅ Calendario creando eventos
- [ ] ✅ Detección de industria automática
- [ ] ✅ 8 herramientas MCP operativas
- [ ] ✅ Usuario admin configurado
- [ ] ✅ Logs sin errores críticos

---

## 📞 **CONTACTO SOPORTE:**
- **Email:** mikehuertas91@gmail.com  
- **Rol:** Administrador del Sistema
- **Acceso:** Completo al panel MCP

---

**🎉 Sistema MCP v1.0.0 - Listo para Testing Completo!**

*Última actualización: 2025-09-10*