# 🔌 SafeNotify CRM Public API Design

**Version:** 1.0  
**Date:** 2025-09-08  
**Phase:** 5.2 - Integrations  

## 📊 API Overview

The SafeNotify CRM Public API enables third-party applications to integrate with SafeNotify's CRM system, providing access to conversations, agents, leads, and analytics data.

### **Base URL**
```
Production: https://api.safenotify.co/v1/
Staging: https://staging-api.safenotify.co/v1/
```

### **Authentication**
- **OAuth 2.0** with authorization code flow
- **API Keys** for server-to-server communication
- **JWT tokens** for session-based access

---

## 🔐 Authentication & Authorization

### **OAuth 2.0 Flow**
```javascript
// Step 1: Authorization URL
GET /oauth/authorize
?client_id={client_id}
&redirect_uri={redirect_uri}
&response_type=code
&scope=conversations:read conversations:write agents:read
&state={state}

// Step 2: Token Exchange
POST /oauth/token
{
  "grant_type": "authorization_code",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret", 
  "code": "authorization_code",
  "redirect_uri": "your_redirect_uri"
}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "conversations:read conversations:write"
}
```

### **API Key Authentication**
```javascript
// Header-based
Authorization: Bearer sk_live_abc123...

// Query parameter (less secure)
GET /api/v1/conversations?api_key=sk_live_abc123...
```

### **Scopes**
- `conversations:read` - Read conversations and messages
- `conversations:write` - Create and update conversations  
- `agents:read` - Read AI agents configuration
- `agents:write` - Manage AI agents
- `leads:read` - Access customer leads
- `leads:write` - Create and update leads
- `analytics:read` - Access analytics data
- `webhooks:write` - Manage webhook subscriptions

---

## 📋 Core Resources

### **1. Conversations**

#### **List Conversations**
```javascript
GET /v1/conversations

Query Parameters:
- status: ACTIVE, PAUSED, COMPLETED, ARCHIVED
- agent_id: Filter by AI agent
- customer_phone: Filter by customer
- created_after: ISO date string
- created_before: ISO date string  
- limit: 1-100 (default: 20)
- cursor: Pagination cursor

Response:
{
  "data": [
    {
      "id": "conv_123",
      "customer_phone": "+573001234567",
      "customer_name": "Juan Pérez",
      "status": "ACTIVE",
      "priority": "HIGH",
      "agent": {
        "id": "agent_456",
        "name": "Sales Assistant",
        "role": "sales"
      },
      "message_count": 12,
      "last_message_at": "2025-09-08T10:30:00Z",
      "created_at": "2025-09-08T09:15:00Z",
      "tags": ["vip", "urgent"]
    }
  ],
  "pagination": {
    "has_next": true,
    "next_cursor": "cursor_abc",
    "total": 150
  }
}
```

#### **Get Conversation**
```javascript
GET /v1/conversations/{conversation_id}

Response:
{
  "id": "conv_123",
  "customer_phone": "+573001234567", 
  "customer_name": "Juan Pérez",
  "status": "ACTIVE",
  "priority": "HIGH",
  "agent": {
    "id": "agent_456",
    "name": "Sales Assistant"
  },
  "messages": [
    {
      "id": "msg_789",
      "role": "user",
      "content": "Hola, necesito información",
      "timestamp": "2025-09-08T09:15:00Z",
      "metadata": {}
    },
    {
      "id": "msg_790", 
      "role": "assistant",
      "content": "¡Hola! Te ayudo con información",
      "timestamp": "2025-09-08T09:15:30Z",
      "metadata": {
        "agent_id": "agent_456",
        "confidence": 0.95
      }
    }
  ],
  "lead": {
    "id": "lead_321",
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "business_type": "clinic",
    "qualification_score": 85
  },
  "created_at": "2025-09-08T09:15:00Z",
  "updated_at": "2025-09-08T10:30:00Z"
}
```

#### **Send Message**
```javascript
POST /v1/conversations/{conversation_id}/messages

Request:
{
  "content": "Gracias por contactarnos",
  "role": "assistant", // or "user"
  "metadata": {
    "agent_id": "agent_456",
    "manual_override": true
  }
}

Response:
{
  "id": "msg_791",
  "conversation_id": "conv_123",
  "role": "assistant",
  "content": "Gracias por contactarnos", 
  "timestamp": "2025-09-08T10:35:00Z",
  "metadata": {
    "agent_id": "agent_456",
    "manual_override": true
  }
}
```

### **2. AI Agents**

#### **List Agents**
```javascript
GET /v1/agents

Response:
{
  "data": [
    {
      "id": "agent_456",
      "name": "Sales Assistant",
      "description": "Expert sales agent",
      "role": "sales",
      "is_active": true,
      "is_default": false,
      "personality_prompt": "You are a professional sales consultant...",
      "business_prompt": "Our company provides...",
      "objectives_prompt": "Your goal is to...",
      "model": "gpt-4",
      "temperature": 0.8,
      "created_at": "2025-09-01T12:00:00Z",
      "stats": {
        "total_conversations": 45,
        "avg_response_time": 12.5,
        "satisfaction_rating": 4.2
      }
    }
  ]
}
```

#### **Create Agent**
```javascript  
POST /v1/agents

Request:
{
  "name": "Support Specialist",
  "description": "Customer support agent",
  "role": "support", 
  "personality_prompt": "You are helpful and patient...",
  "business_prompt": "We provide technical support...",
  "objectives_prompt": "Help customers resolve issues...",
  "is_active": true,
  "model": "gpt-4",
  "temperature": 0.7
}

Response:
{
  "id": "agent_789",
  "name": "Support Specialist",
  "role": "support",
  "is_active": true,
  "created_at": "2025-09-08T10:40:00Z"
}
```

### **3. Customer Leads**

#### **List Leads**
```javascript
GET /v1/leads

Query Parameters:
- status: NEW, QUALIFIED, CONVERTED, LOST
- business_type: Filter by business type
- score_min: Minimum qualification score
- created_after: ISO date string
- limit: 1-100 (default: 20)
- cursor: Pagination cursor

Response:
{
  "data": [
    {
      "id": "lead_321",
      "name": "Juan Pérez",
      "email": "juan@empresa.com", 
      "phone": "+573001234567",
      "business_type": "clinic",
      "company_name": "Clínica San Rafael",
      "status": "QUALIFIED",
      "qualification_score": 85,
      "source": "whatsapp",
      "created_at": "2025-09-08T09:00:00Z",
      "last_activity": "2025-09-08T10:30:00Z"
    }
  ]
}
```

#### **Create Lead**
```javascript
POST /v1/leads

Request:
{
  "name": "María González",
  "email": "maria@empresa.com",
  "phone": "+573009876543", 
  "business_type": "restaurant",
  "company_name": "Restaurante El Buen Sabor",
  "source": "website",
  "metadata": {
    "campaign_id": "camp_123",
    "referrer": "google_ads"
  }
}

Response:
{
  "id": "lead_654",
  "name": "María González",
  "status": "NEW",
  "qualification_score": 0,
  "created_at": "2025-09-08T10:45:00Z"
}
```

### **4. Analytics**

#### **Conversation Analytics** 
```javascript
GET /v1/analytics/conversations

Query Parameters:
- time_range: 24h, 7d, 30d, 90d
- agent_id: Filter by agent
- group_by: day, week, month

Response:
{
  "time_range": "7d",
  "metrics": {
    "total_conversations": 156,
    "active_conversations": 23,
    "avg_response_time": 12.5,
    "satisfaction_score": 4.2,
    "conversion_rate": 34.7
  },
  "trends": [
    {
      "date": "2025-09-07",
      "conversations": 28,
      "response_time": 11.2,
      "satisfaction": 4.3
    }
  ],
  "agents": [
    {
      "agent_id": "agent_456",
      "name": "Sales Assistant",
      "conversations": 89,
      "avg_response_time": 8.2,
      "satisfaction": 4.4
    }
  ]
}
```

---

## 🔔 Webhooks

### **Webhook Events**
- `conversation.created` - New conversation started
- `conversation.updated` - Conversation status changed  
- `message.received` - New message from customer
- `message.sent` - Message sent by agent/AI
- `lead.created` - New lead generated
- `lead.qualified` - Lead qualification updated
- `takeover.requested` - Human takeover requested
- `takeover.started` - Human took control
- `takeover.ended` - Returned to AI control

### **Webhook Payload**
```javascript
{
  "event": "conversation.created", 
  "data": {
    "id": "conv_123",
    "customer_phone": "+573001234567",
    "status": "ACTIVE",
    "created_at": "2025-09-08T10:50:00Z"
  },
  "timestamp": "2025-09-08T10:50:05Z",
  "webhook_id": "wh_456"
}
```

### **Webhook Management**
```javascript
// Create webhook
POST /v1/webhooks
{
  "url": "https://yourapp.com/webhooks/safenotify",
  "events": ["conversation.created", "message.received"],
  "secret": "your_webhook_secret"
}

// List webhooks  
GET /v1/webhooks

// Delete webhook
DELETE /v1/webhooks/{webhook_id}
```

---

## 📝 Error Handling

### **HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request  
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### **Error Response Format**
```javascript
{
  "error": {
    "type": "validation_error",
    "code": "MISSING_REQUIRED_FIELD", 
    "message": "The field 'name' is required",
    "details": {
      "field": "name",
      "provided_value": null
    }
  },
  "request_id": "req_abc123"
}
```

---

## 🛠️ Rate Limiting

### **Rate Limits**
- **Standard Plan**: 1,000 requests/hour
- **Pro Plan**: 5,000 requests/hour  
- **Enterprise Plan**: 25,000 requests/hour

### **Rate Limit Headers**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1694168400
```

---

## 🔄 Pagination

### **Cursor-based Pagination**
```javascript
{
  "data": [...],
  "pagination": {
    "has_next": true,
    "next_cursor": "eyJ...",
    "has_previous": false,
    "previous_cursor": null
  }
}

// Next page
GET /v1/conversations?cursor=eyJ...
```

---

## 📚 SDK Libraries

### **Official SDKs**
- **Node.js**: `npm install @safenotify/sdk-node`
- **Python**: `pip install safenotify-sdk`
- **PHP**: `composer require safenotify/sdk-php`
- **JavaScript**: `npm install @safenotify/sdk-js`

### **Usage Example**
```javascript
// Node.js
const SafeNotify = require('@safenotify/sdk-node');

const client = new SafeNotify({
  apiKey: 'sk_live_...',
  // or OAuth token
  accessToken: 'eyJ...'
});

// List conversations
const conversations = await client.conversations.list({
  status: 'ACTIVE',
  limit: 50
});

// Send message
await client.conversations.sendMessage('conv_123', {
  content: 'Hello from API',
  role: 'assistant'
});
```

---

## 🧪 Testing

### **Sandbox Environment**
- **Base URL**: `https://sandbox-api.safenotify.co/v1/`
- **Test API Keys**: Prefix `sk_test_`
- **Test Data**: Pre-populated with sample data
- **No Rate Limits**: For development testing

### **Postman Collection**
Available at: `https://api.safenotify.co/postman/collection.json`

---

This Public API design provides comprehensive access to SafeNotify CRM functionality while maintaining security, performance, and ease of use for third-party integrations.