const Bull = require('bull');
const Redis = require('ioredis');
const prisma = require('../db');
const { createTwilioClient } = require('../config/twilio');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

// Create Bull queue
const campaignQueue = new Bull('campaign processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50,     // Keep last 50 failed jobs
    attempts: 3,          // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,        // Start with 5 second delay
    },
  }
});

// Progress tracking helper with WebSocket integration
function updateProgress(job, sent, total, errors = []) {
  const progress = Math.floor((sent / total) * 100);
  job.progress(progress);
  
  // Prepare progress data
  const progressData = {
    sent,
    total,
    progress,
    errors: errors.length,
    timestamp: new Date().toISOString()
  };
  
  // Store progress data in job
  job.data.progressData = progressData;
  
  // Emit to WebSocket if available (will be set by server)
  if (global.campaignProgressTracker) {
    global.campaignProgressTracker.emitCampaignProgress(
      job.data.campaignId, 
      progressData
    );
  }
}

// Enhanced rate limiting with Twilio-specific limits
class RateLimiter {
  constructor() {
    this.whatsappLimit = 50; // Messages per second for WhatsApp
    this.smsLimit = 100;     // Messages per second for SMS
    this.currentRate = 0;
    this.lastWindow = Date.now();
    this.messageQueue = [];
  }

  async waitForSlot(messageType = 'whatsapp') {
    const limit = messageType === 'whatsapp' ? this.whatsappLimit : this.smsLimit;
    const now = Date.now();
    
    // Reset counter every second
    if (now - this.lastWindow >= 1000) {
      this.currentRate = 0;
      this.lastWindow = now;
    }
    
    // If we've hit the limit, wait until next window
    if (this.currentRate >= limit) {
      const waitTime = 1000 - (now - this.lastWindow);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot(messageType);
    }
    
    this.currentRate++;
    return Promise.resolve();
  }
}

const rateLimiter = new RateLimiter();

// Process campaign job
campaignQueue.process('send-campaign', async (job) => {
  const { campaignId, csvBuffer, template, userId, userName } = job.data;
  
  console.log(`🚀 Processing campaign ${campaignId} for user ${userName} (${userId})`);
  
  try {
    // Update campaign status to processing
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        status: 'processing',
        sentAt: new Date()
      }
    });

    // Emit status change via WebSocket
    if (global.campaignProgressTracker) {
      global.campaignProgressTracker.emitCampaignStatus(campaignId, 'processing', {
        message: 'Campaña iniciada, procesando contactos...'
      });
    }

    // Parse CSV data
    const contacts = [];
    const errors = [];
    
    await new Promise((resolve, reject) => {
      const stream = Readable.from(csvBuffer.toString());
      stream
        .pipe(csv({ skipEmptyLines: true, trim: true }))
        .on('data', (row) => {
          // Normalize and validate contact data
          const contact = {
            name: row.nombre || row.name || row.Nombre || 'Cliente',
            phone: normalizePhoneNumber(row.telefono || row.phone || row.Phone || row.celular)
          };
          
          if (contact.phone && isValidPhoneNumber(contact.phone)) {
            contacts.push(contact);
          } else {
            errors.push({
              contact: row,
              error: 'Número de teléfono inválido',
              type: 'validation'
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Parsed ${contacts.length} valid contacts, ${errors.length} errors`);

    // Update campaign with total contacts
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        totalContacts: contacts.length,
        errorCount: errors.length
      }
    });

    // Initialize progress
    updateProgress(job, 0, contacts.length, errors);

    // Get Twilio client
    const client = createTwilioClient();
    let sentCount = 0;
    const messageResults = [];

    // Process messages with enhanced rate limiting
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Wait for rate limit slot
        await rateLimiter.waitForSlot('whatsapp');
        
        // Prepare message with template variables
        const messageContent = prepareMessageContent(template.content, contact);
        
        // Create message payload with proper WhatsApp format
        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
          ? process.env.TWILIO_WHATSAPP_NUMBER 
          : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
          
        const messagePayload = {
          from: fromNumber,
          to: `whatsapp:${contact.phone}`,
          body: messageContent
        };

        // Add template SID if available with fallback priority  
        const contentSid = template.twilioContentSid || template.twilioSid || template.twilioTemplateId;
        if (contentSid) {
          messagePayload.contentSid = contentSid;
          delete messagePayload.body; // Use template instead of body
          console.log(`📨 Queue: Using ContentSID: ${contentSid}`);
          
          // Add template variables with PROPER MAPPING
          if (template.variables && template.variables.length > 0) {
            const templateVariables = {};
            
            // FIXED: Error 63028 - Handle duplicate variables correctly
            const uniqueVariables = [...new Set(template.variables)];
            console.log(`📋 Original variables: [${template.variables.join(', ')}] (${template.variables.length})`);
            console.log(`📋 Unique variables: [${uniqueVariables.join(', ')}] (${uniqueVariables.length})`);
            
            uniqueVariables.forEach((varName, varIndex) => {
              let value = '';
              
              // Use same priority logic as immediate processing
              if (variableMappings && variableMappings[varName]) {
                const csvColumn = variableMappings[varName];
                value = contact[csvColumn] || '';
              } else if (defaultValues && defaultValues[varName]) {
                value = defaultValues[varName];
              } else {
                value = contact[varName] || '';
              }
              
              // Use variable NAME as key, not number - Twilio expects variable names
              templateVariables[varName] = value;
            });
            
            messagePayload.contentVariables = JSON.stringify(templateVariables);
            console.log('📋 Queue: Template variables being sent:', templateVariables);
          }
        }

        // Send message
        console.log(`📤 Sending message ${i + 1}/${contacts.length} to ${contact.phone}`);
        const message = await client.messages.create(messagePayload);
        
        // Log successful message
        await prisma.messageLog.create({
          data: {
            campaignId,
            phone: contact.phone,
            status: 'sent',
            messageSid: message.sid,
            sentAt: new Date()
          }
        });

        sentCount++;
        messageResults.push({
          contact,
          status: 'sent',
          messageSid: message.sid
        });

        // Update progress every 10 messages or at the end
        if (sentCount % 10 === 0 || sentCount === contacts.length) {
          updateProgress(job, sentCount, contacts.length, errors);
          
          // Update campaign progress in database
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount }
          });
        }

      } catch (error) {
        console.error(`❌ Failed to send message to ${contact.phone}:`, error.message);
        
        // Categorize error type
        const errorType = categorizeError(error);
        
        // Log failed message
        await prisma.messageLog.create({
          data: {
            campaignId,
            phone: contact.phone,
            status: 'failed',
            error: error.message,
            sentAt: new Date()
          }
        });

        errors.push({
          contact,
          error: error.message,
          type: errorType,
          retryable: isRetryableError(error)
        });

        // For critical errors, consider failing the entire job
        if (errorType === 'critical' && errors.length > contacts.length * 0.5) {
          throw new Error(`Too many critical errors: ${errors.length}`);
        }
      }
    }

    // Update final campaign status
    const finalStatus = errors.length === 0 ? 'completed' : 
                       errors.length < contacts.length ? 'completed_with_errors' : 'failed';
    
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentCount,
        errorCount: errors.length,
        completedAt: new Date()
      }
    });

    // Update user message usage
    await prisma.user.update({
      where: { id: userId },
      data: {
        messagesUsed: { increment: sentCount }
      }
    });

    console.log(`✅ Campaign ${campaignId} completed: ${sentCount}/${contacts.length} sent, ${errors.length} errors`);

    // Emit final status via WebSocket
    if (global.campaignProgressTracker) {
      global.campaignProgressTracker.emitCampaignStatus(campaignId, finalStatus, {
        message: finalStatus === 'completed' 
          ? `Campaña completada exitosamente: ${sentCount} mensajes enviados`
          : `Campaña completada con errores: ${sentCount} enviados, ${errors.length} errores`,
        totalContacts: contacts.length,
        sentCount,
        errorCount: errors.length
      });
    }

    return {
      success: true,
      campaignId,
      totalContacts: contacts.length,
      sentCount,
      errorCount: errors.length,
      status: finalStatus,
      errors: errors.slice(0, 50) // Limit error details
    };

  } catch (error) {
    console.error(`💥 Campaign ${campaignId} failed:`, error);
    
    // Update campaign status to failed
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'failed',
        errorCount: -1, // Indicates system failure
        completedAt: new Date()
      }
    });

    // Emit error status via WebSocket
    if (global.campaignProgressTracker) {
      global.campaignProgressTracker.emitCampaignError(campaignId, 
        `Error del sistema: ${error.message}`, 'system_error'
      );
    }

    throw error;
  }
});

// Helper functions
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Colombian numbers
  if (cleaned.startsWith('57')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '+57' + cleaned;
  } else if (cleaned.length === 10) {
    return '+57' + cleaned;
  }
  
  // For other countries, assume it's already formatted
  if (cleaned.length > 10) {
    return '+' + cleaned;
  }
  
  return null;
}

function isValidPhoneNumber(phone) {
  if (!phone) return false;
  
  // Basic validation: starts with +, has 10-15 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
}

function prepareMessageContent(template, contact) {
  let content = template;
  
  // Replace common variables
  content = content.replace(/\{\{1\}\}|\{\{nombre\}\}/gi, contact.name);
  content = content.replace(/\{\{2\}\}|\{\{telefono\}\}/gi, contact.phone);
  
  return content;
}

function categorizeError(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('429')) {
    return 'rate_limit';
  } else if (message.includes('invalid number') || message.includes('21211')) {
    return 'invalid_number';
  } else if (message.includes('blocked') || message.includes('opt-out')) {
    return 'blocked';
  } else if (message.includes('network') || message.includes('timeout')) {
    return 'network';
  } else if (message.includes('authentication') || message.includes('401')) {
    return 'auth';
  } else {
    return 'unknown';
  }
}

function isRetryableError(error) {
  const errorType = categorizeError(error);
  return ['rate_limit', 'network', 'unknown'].includes(errorType);
}

// Queue event handlers
campaignQueue.on('completed', (job, result) => {
  console.log(`✅ Campaign job ${job.id} completed:`, result);
});

campaignQueue.on('failed', (job, error) => {
  console.error(`❌ Campaign job ${job.id} failed:`, error.message);
});

campaignQueue.on('progress', (job, progress) => {
  console.log(`📊 Campaign job ${job.id} progress: ${progress}%`);
});

// Export queue for use in other modules
module.exports = {
  campaignQueue,
  addCampaignJob: (data, options = {}) => {
    return campaignQueue.add('send-campaign', data, options);
  }
};