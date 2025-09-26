# 🛠️ Utility Scripts

Scripts de utilidades generales para mantenimiento y operaciones del sistema SafeNotify.

## Scripts de Migración

### 👥 migrate-existing-users-to-crm.js
- **Propósito**: Migrar usuarios existentes al sistema CRM
- **Uso**: `node migrate-existing-users-to-crm.js`

## Scripts de Setup

### ⚙️ setup.js
- **Propósito**: Setup inicial del proyecto y dependencias
- **Uso**: `npm run setup` o `node setup.js`

## Scripts de Testing

### 🤖 testOpenAICapabilities.js
- **Propósito**: Test de capacidades y modelos OpenAI
- **Uso**: `node testOpenAICapabilities.js`

### ☁️ testCloudinary.js
- **Propósito**: Test de integración con Cloudinary
- **Uso**: `node testCloudinary.js`

### 🖼️ testSendImage.js
- **Propósito**: Test de envío de imágenes
- **Uso**: `node testSendImage.js`

## Scripts de Gestión de Agentes

### 📋 listAgents.js
- **Propósito**: Listar todos los agentes del sistema
- **Uso**: `node listAgents.js`

### 🔍 findSofia.js
- **Propósito**: Encontrar y mostrar info del agente Sofia
- **Uso**: `node findSofia.js`

### 👤 createCorrectUserAndSofia.js
- **Propósito**: Crear usuario y agente Sofia correctamente
- **Uso**: `node createCorrectUserAndSofia.js`

### 🔄 transferWhatsAppToSofia.js
- **Propósito**: Transferir configuración WhatsApp a Sofia
- **Uso**: `node transferWhatsAppToSofia.js`

### 📁 transferFilesToSofia.js
- **Propósito**: Transferir archivos multimedia a Sofia
- **Uso**: `node transferFilesToSofia.js`

### 🧹 cleanupWrongAgent.js
- **Propósito**: Limpiar configuraciones incorrectas de agentes
- **Uso**: `node cleanupWrongAgent.js`

### 📊 showSofiaConfig.js
- **Propósito**: Mostrar configuración completa de Sofia
- **Uso**: `node showSofiaConfig.js`

## Uso Recomendado

### Setup Inicial
```bash
node setup.js
node migrate-existing-users-to-crm.js
```

### Verificación del Sistema
```bash
node listAgents.js
node testOpenAICapabilities.js
node testCloudinary.js
```

### Gestión de Sofia (Demo Agent)
```bash
node findSofia.js
node showSofiaConfig.js
```

## Estado

✅ **PRODUCTION READY** - Scripts validados para uso en producción