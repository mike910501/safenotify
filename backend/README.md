# SafeNotify Backend API

Production-ready Node.js/Express backend for secure WhatsApp Business messaging with Twilio integration.

## 🚀 Features

- **WhatsApp Business API Integration** with Twilio Content Templates
- **AES-256 Data Encryption** for sensitive medical data
- **Auto-Delete System** (configurable, default 24 hours)
- **Complete Audit Logging** for compliance
- **Rate Limiting** (1 message/second, configurable)
- **Webhook Support** for delivery status tracking
- **SQLite Database** with automatic cleanup
- **Security Headers** and input validation
- **Graceful Shutdown** handling

## 📋 Requirements

- Node.js 18+
- Twilio Account with WhatsApp Business API
- Pre-approved Twilio Content Templates

## 🔧 Installation

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## 🔐 Environment Variables

### Required
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Security
ENCRYPTION_KEY=32-character-encryption-key
API_KEY=your-api-key-for-frontend

# Template SIDs (create in Twilio Console first)
TEMPLATE_MEDICAL_REMINDER=HX123abc456def789
TEMPLATE_BEAUTY_CONFIRMATION=HX789def123abc456
```

### Optional
```env
AUTO_DELETE_HOURS=24
PORT=3001
NODE_ENV=production
MAX_FILE_SIZE=10485760
```

## 📡 API Endpoints

### Campaigns
- `POST /api/campaigns/create` - Create campaign with CSV upload
- `POST /api/campaigns/:id/send` - Send messages to all contacts
- `GET /api/campaigns/:id/stats` - Get campaign statistics
- `DELETE /api/campaigns/:id` - Delete campaign data

### Templates
- `GET /api/templates` - List available templates
- `GET /api/templates/:sid` - Get template details
- `GET /api/templates/:sid/preview` - Preview with sample data

### Webhooks
- `POST /api/webhooks/twilio` - Twilio delivery webhooks

### System
- `GET /health` - Health check
- `GET /api/system/stats` - System statistics
- `POST /api/system/cleanup` - Manual cleanup

## 🔒 Security Features

### Authentication
All API endpoints require `x-api-key` header (except webhooks and health check).

### Data Protection
- AES-256 encryption for all CSV data
- Phone numbers redacted in logs
- Secure headers (HSTS, CSP, etc.)
- Input validation and sanitization

### Rate Limiting
- General: 100 requests/minute
- File Upload: 5 uploads/5 minutes  
- Message Sending: 3 operations/10 minutes
- Webhooks: 1000 requests/minute

### Auto-Deletion
- Campaigns auto-delete after configured hours
- Encrypted data permanently destroyed
- Audit logs for all deletions

## 📊 Database Schema

### campaigns
```sql
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_sid TEXT NOT NULL,
  encrypted_csv_data BLOB NOT NULL,
  iv TEXT NOT NULL,
  total_contacts INTEGER NOT NULL,
  status TEXT DEFAULT 'created',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
```

### message_logs
```sql
CREATE TABLE message_logs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message_sid TEXT,
  status TEXT DEFAULT 'queued',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  error_message TEXT NULL
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  details TEXT
);
```

## 🔄 Automated Cleanup Jobs

### Expired Campaign Cleanup (Hourly)
Automatically deletes campaigns past their expiry time:
```javascript
// Runs every hour
cron.schedule('0 * * * *', cleanupExpiredCampaigns);
```

### Log Cleanup (Daily at 2 AM)
Removes old message logs and audit logs:
- Message logs: 90 days retention
- Audit logs: 365 days retention (security events kept longer)

### Database Optimization (Weekly)
Runs `VACUUM` and `ANALYZE` for optimal performance.

## 📱 Twilio Integration

### Content Templates
Create templates in Twilio Console with these variables:

**Medical Reminder:**
```
Hola {{1}}, le recordamos su cita con {{2}} el {{3}} a las {{4}}. Confirme respondiendo SÍ.
Variables: nombre, doctor, fecha, hora
```

**Beauty Confirmation:**
```
Hola {{1}}! Su cita de {{2}} está confirmada para el {{3}} a las {{4}}. Nos vemos pronto! 💄
Variables: nombre, servicio, fecha, hora
```

### Webhook Configuration
Set webhook URL in Twilio Console:
```
https://your-domain.com/api/webhooks/twilio
```

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure all required environment variables
- [ ] Set up HTTPS with valid SSL certificate
- [ ] Configure Twilio webhook URL
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Set up process manager (PM2)

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2 Configuration
```json
{
  "name": "safenotify-backend",
  "script": "server.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3001"
  }
}
```

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /api/system/stats` - Detailed system statistics

### Logging
Logs are written to:
- `./logs/safenotify.log` - All logs
- `./logs/error.log` - Error logs only
- `./logs/audit.log` - Security events

### Performance Monitoring
All operations include duration tracking:
```json
{
  "type": "performance",
  "operation": "campaign_send",
  "duration": 1250,
  "success": true
}
```

## 🔍 Troubleshooting

### Common Issues

**"Invalid Twilio credentials"**
- Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Check account status in Twilio Console

**"Template not found"**
- Ensure templates are created and approved in Twilio Console
- Verify template SIDs in environment variables

**"Messages not sending"**
- Check rate limiting configuration
- Verify WhatsApp Business number is approved
- Check campaign status and expiry

**"Database locked"**
- Ensure proper database cleanup
- Check for long-running transactions
- Consider database optimization

### Debug Mode
Set `NODE_ENV=development` for detailed console logging:
```bash
NODE_ENV=development npm run dev
```

## 📧 Support

For technical support or questions:
- Check logs in `./logs/` directory
- Use `/api/system/stats` for system diagnostics
- Enable debug mode for detailed logging

## 🔒 Compliance Notes

This system is designed for healthcare and sensitive data:
- All data encrypted at rest
- Automatic data deletion
- Complete audit trails
- GDPR/HIPAA considerations built-in
- No data persistence beyond configured retention

## 📄 License

Private - SafeNotify Team