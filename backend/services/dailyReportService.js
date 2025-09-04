const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();

/**
 * Daily Report Service
 * Generates and sends daily reports of client conversations without using ChatGPT tokens
 */

// Email configuration (using existing Zoho email service from simple-server.js)
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'informacion@safenotify.co',
      pass: process.env.SMTP_PASS
    },
    requireTLS: true,
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Get today's conversation prompts (unique per phone number)
 */
async function getTodaysConversationPrompts() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  try {
    // Get all conversation prompts from today with expanded lead data
    const allPrompts = await prisma.conversationPrompt.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        lead: {
          select: {
            phone: true,
            name: true,
            status: true,
            qualificationScore: true,
            conversationState: true,
            conversations: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                messages: true,
                createdAt: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Remove duplicates by phone number, keeping only the most recent one per phone
    const uniquePrompts = [];
    const seenPhones = new Set();

    for (const prompt of allPrompts) {
      if (!seenPhones.has(prompt.lead.phone)) {
        seenPhones.add(prompt.lead.phone);
        uniquePrompts.push(prompt);
      }
    }

    console.log(`📊 Found ${allPrompts.length} total prompts, ${uniquePrompts.length} unique clients for today`);
    return uniquePrompts;

  } catch (error) {
    console.error('❌ Error fetching today\'s prompts:', error);
    return [];
  }
}

/**
 * Get today's new leads
 */
async function getTodaysNewLeads() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  try {
    const newLeads = await prisma.safeNotifyLead.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        phone: true,
        name: true,
        status: true,
        qualificationScore: true,
        conversationState: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`👥 Found ${newLeads.length} new leads for today`);
    return newLeads;

  } catch (error) {
    console.error('❌ Error fetching today\'s new leads:', error);
    return [];
  }
}

/**
 * Generate chat messages HTML
 */
function generateChatMessages(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  let html = `
    <div style="margin: 15px 0;">
        <h4>💬 Historial Completo del Chat:</h4>
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; max-height: 400px; overflow-y: auto;">
  `;

  messages.forEach((message, index) => {
    const isUser = message.role === 'user';
    const bgColor = isUser ? '#e3f2fd' : '#f3e5f5';
    const icon = isUser ? '👤' : '🤖';
    const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('es-CO') : 'Sin fecha';

    html += `
        <div style="margin-bottom: 12px; padding: 10px; background-color: ${bgColor}; border-radius: 6px; border-left: 4px solid ${isUser ? '#2196f3' : '#9c27b0'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <strong>${icon} ${isUser ? 'CLIENTE' : 'SOFIA'}</strong>
                <small style="color: #666;">${timestamp}</small>
            </div>
            <div style="line-height: 1.4;">
                "${message.content || 'Sin contenido'}"
            </div>
        </div>
    `;
  });

  html += `
        </div>
        <small style="color: #666;">📊 Total de mensajes: ${messages.length}</small>
    </div>
  `;

  return html;
}

/**
 * Generate HTML email report
 */
function generateEmailReport(prompts, newLeads) {
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { background-color: #0066cc; color: white; padding: 20px; border-radius: 8px; }
            .summary { background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .prompt-card { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .client-info { background-color: #e8f4fd; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
            .conversation-summary { margin: 10px 0; }
            .business-context { background-color: #f9f9f9; padding: 8px; border-left: 4px solid #0066cc; }
            .score { font-weight: bold; color: #0066cc; }
            .new-leads { background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .lead-item { background-color: white; border: 1px solid #ccc; padding: 10px; margin: 5px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Reporte Diario SafeNotify</h1>
            <p><strong>${today}</strong></p>
        </div>

        <div class="summary">
            <h2>📈 Resumen del Día</h2>
            <ul>
                <li><strong>Nuevos Leads:</strong> ${newLeads.length}</li>
                <li><strong>Conversaciones Activas:</strong> ${prompts.length}</li>
                <li><strong>Hora del Reporte:</strong> ${new Date().toLocaleTimeString('es-CO')}</li>
            </ul>
        </div>
  `;

  // New Leads Section
  if (newLeads.length > 0) {
    html += `
        <div class="new-leads">
            <h2>👥 Nuevos Leads del Día (${newLeads.length})</h2>
    `;
    
    newLeads.forEach((lead, index) => {
      const phone = lead.phone; // Show complete phone number
      html += `
            <div class="lead-item">
                <strong>#${index + 1}</strong> - 
                <strong>📞 ${phone}</strong> 
                ${lead.name ? `| 👤 ${lead.name}` : '| 👤 Sin nombre'}
                <br>
                <small>📊 Score: ${lead.qualificationScore} | 🔄 Estado: ${lead.status} | ⏰ ${lead.createdAt.toLocaleTimeString('es-CO')}</small>
            </div>
      `;
    });
    
    html += `</div>`;
  }

  // Conversation Prompts Section
  if (prompts.length > 0) {
    html += `
        <h2>💬 Conversaciones del Día (${prompts.length})</h2>
    `;

    prompts.forEach((prompt, index) => {
      const phone = prompt.lead.phone; // Show complete phone number
      const clientName = prompt.lead.name || 'Cliente sin nombre';
      
      html += `
            <div class="prompt-card">
                <div class="client-info">
                    <strong>Cliente #${index + 1}:</strong> ${clientName} | 
                    <strong>📞</strong> ${phone} | 
                    <span class="score">📊 Score: ${prompt.lead.qualificationScore}</span>
                    <br>
                    <small>🔄 Estado: ${prompt.lead.status} | 💬 Fase: ${prompt.lead.conversationState}</small>
                </div>
                
                <div class="conversation-summary">
                    <h4>📝 Resumen Completo de la Conversación:</h4>
                    <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; line-height: 1.6;">
                        "${prompt.conversationSummary || 'Sin resumen disponible'}"
                    </p>
                </div>
                
                ${prompt.businessContext ? `
                <div class="business-context">
                    <h4>🏢 Contexto del Negocio:</h4>
                    <div style="background-color: #e8f5e8; padding: 12px; border-radius: 5px;">
                        <pre style="margin: 0; font-size: 12px; white-space: pre-wrap;">${JSON.stringify(prompt.businessContext, null, 2)}</pre>
                    </div>
                </div>
                ` : ''}
                
                ${prompt.lead.conversations && prompt.lead.conversations.length > 0 && prompt.lead.conversations[0].messages ? 
                  generateChatMessages(prompt.lead.conversations[0].messages) : ''}
                
                <small>🕐 Generado: ${prompt.createdAt.toLocaleString('es-CO')}</small>
            </div>
      `;
    });
  } else {
    html += `
        <div class="prompt-card">
            <p>📭 No hubo conversaciones nuevas el día de hoy.</p>
        </div>
    `;
  }

  html += `
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f0f0; border-radius: 8px;">
            <p><small>🤖 Este reporte fue generado automáticamente por SafeNotify sin usar tokens de ChatGPT.<br>
            📧 Sistema de reportes diarios - Configurado para ${process.env.ADMIN_EMAIL || 'mikehuertas91@gmail.com'}</small></p>
        </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Send daily report email
 */
async function sendDailyReport() {
  try {
    console.log('📧 Starting daily report generation...');

    // Get data
    const [prompts, newLeads] = await Promise.all([
      getTodaysConversationPrompts(),
      getTodaysNewLeads()
    ]);

    // Generate email content
    const htmlContent = generateEmailReport(prompts, newLeads);

    // Email configuration
    const transporter = createEmailTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || 'mikehuertas91@gmail.com';
    
    const today = new Date().toLocaleDateString('es-CO');
    
    const mailOptions = {
      from: {
        name: 'SafeNotify',
        address: process.env.SMTP_USER || 'informacion@safenotify.co'
      },
      to: adminEmail,
      subject: `📊 SafeNotify - Reporte Diario ${today}`,
      html: htmlContent,
      // Add plain text version as fallback
      text: `Reporte SafeNotify del ${today}\n\nNuevos Leads: ${newLeads.length}\nConversaciones: ${prompts.length}\n\nVer el reporte completo en formato HTML.`
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Daily report sent successfully!');
    console.log(`📧 Email sent to: ${adminEmail}`);
    console.log(`📊 Report included: ${newLeads.length} new leads, ${prompts.length} conversations`);
    
    return {
      success: true,
      emailId: result.messageId,
      leadsCount: newLeads.length,
      conversationsCount: prompts.length
    };

  } catch (error) {
    console.error('❌ Error sending daily report:', error);
    
    // Try to send error notification
    try {
      const transporter = createEmailTransporter();
      await transporter.sendMail({
        from: {
          name: 'SafeNotify',
          address: process.env.SMTP_USER || 'informacion@safenotify.co'
        },
        to: process.env.ADMIN_EMAIL || 'mikehuertas91@gmail.com',
        subject: '🚨 SafeNotify - Error en Reporte Diario',
        text: `Hubo un error generando el reporte diario:\n\n${error.message}\n\nRevisa los logs del servidor.`
      });
    } catch (emailError) {
      console.error('❌ Failed to send error notification:', emailError);
    }
    
    throw error;
  }
}

module.exports = {
  sendDailyReport,
  getTodaysConversationPrompts,
  getTodaysNewLeads,
  generateEmailReport
};