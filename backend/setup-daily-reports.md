# 📧 Sistema de Reportes Diarios SafeNotify

## ✅ Estado: Implementado y Listo

### 🎯 **¿Qué hace?**
Envía automáticamente cada día a las **5:00 PM** un email con:
- Todos los prompts de conversaciones del día
- Nuevos leads registrados  
- Sin usar tokens de ChatGPT
- Formato HTML profesional

### ⚙️ **Variables de Entorno Requeridas en Render:**

```env
ZOHO_PASS=tu_token_de_aplicacion_zoho
ADMIN_EMAIL=mikehuertas91@gmail.com
```

**Nota**: El sistema usa `informacion@safenotify.co` como remitente (ya configurado en código).

### 🚀 **Cómo funciona:**

1. **Automático**: Cron job ejecuta diario a las 5 PM Colombia
2. **Manual**: Endpoint `POST /api/test-daily-report` para pruebas
3. **Sin tokens IA**: Solo consulta base de datos Prisma
4. **Completo**: Información detallada de cada conversación

### 📊 **Contenido del Reporte:**

#### 👥 Nuevos Leads del Día
- Número de teléfono (parcialmente ocultado por seguridad)
- Nombre del cliente
- Score de calificación
- Estado del lead
- Hora de registro

#### 💬 Conversaciones Activas
- Resumen de cada conversación con Sofia AI
- Contexto del negocio del cliente
- Estado de la conversación
- Prompts generados automáticamente

### 🔧 **Archivos Implementados:**

- `services/dailyReportService.js` - Servicio principal
- `jobs/dailyReportCron.js` - Programador automático
- `simple-server.js` - Integración al servidor
- Endpoint manual: `POST /api/test-daily-report`

### 📅 **Programación:**
```javascript
// Ejecuta diariamente a las 5:00 PM Colombia
cron.schedule('0 17 * * *', sendDailyReport, {
  timezone: "America/Bogota"
});
```

### 🛠️ **Para Probar:**

1. **En Producción (Render)**: Se ejecuta automáticamente
2. **Manualmente**: `curl -X POST https://tu-app.onrender.com/api/test-daily-report`
3. **Localmente**: `node backend/test-daily-report.js`

### 📧 **Ejemplo de Email:**

```
Asunto: 📊 SafeNotify - Reporte Diario 4/9/2025

📈 Resumen del Día
• Nuevos Leads: 1
• Conversaciones Activas: 14
• Hora del Reporte: 5:00:00 PM

👥 Nuevos Leads del Día (1)
#1 - 📞 +5731500*** | 👤 Sin nombre
📊 Score: 0 | 🔄 Estado: new | ⏰ 15:00:31

💬 Conversaciones del Día (14)
Cliente #1: Michael | 📞 +5731335***
📝 Resumen: "Cliente dueño de restaurante, interesado en SafeNotify..."
🏢 Contexto: {"negocio":"restaurante","volumen":"500 mensajes"}
```

### ✅ **Sistema Completamente Funcional**
- No requiere intervención manual
- Funciona sin tokens de IA
- Reportes detallados diarios
- Integrado al servidor principal
- Listo para producción en Render