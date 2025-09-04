require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { sendDailyReport, generateEmailReport } = require('./services/dailyReportService');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

/**
 * Test script for daily report system with a specific date (day 2)
 * Modified to get data from September 2, 2025
 */

// Email configuration (same as dailyReportService)
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
 * Get conversation prompts for September 2, 2025 (unique per phone number)
 */
async function getDay2ConversationPrompts() {
  const targetDate = new Date('2025-09-02');
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

  try {
    // Get all conversation prompts from September 2
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
            conversationState: true
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

    console.log(`📊 Day 2: Found ${allPrompts.length} total prompts, ${uniquePrompts.length} unique clients`);
    return uniquePrompts;

  } catch (error) {
    console.error('❌ Error fetching day 2 prompts:', error);
    return [];
  }
}

/**
 * Get new leads for September 2, 2025
 */
async function getDay2NewLeads() {
  const targetDate = new Date('2025-09-02');
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

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

    console.log(`👥 Day 2: Found ${newLeads.length} new leads`);
    return newLeads;

  } catch (error) {
    console.error('❌ Error fetching day 2 new leads:', error);
    return [];
  }
}

async function testDay2Report() {
  try {
    console.log('🧪 Testing Daily Report System for September 2, 2025...');
    console.log('=' .repeat(60));
    
    // Test 1: Get day 2 conversation prompts
    console.log('\n📋 Test 1: Fetching September 2 conversation prompts...');
    const prompts = await getDay2ConversationPrompts();
    console.log(`✅ Found ${prompts.length} unique conversation prompts`);
    
    if (prompts.length > 0) {
      console.log('📝 Sample prompts:');
      prompts.slice(0, 3).forEach((prompt, index) => {
        console.log(`   ${index + 1}. Phone: ${prompt.lead.phone}`);
        console.log(`      Name: ${prompt.lead.name || 'Sin nombre'}`);
        console.log(`      Summary: "${prompt.conversationSummary?.substring(0, 60)}..."`);
        console.log(`      Time: ${prompt.createdAt.toLocaleString('es-CO')}`);
        console.log('      ---');
      });
    }
    
    // Test 2: Get day 2 new leads
    console.log('\n👥 Test 2: Fetching September 2 new leads...');
    const newLeads = await getDay2NewLeads();
    console.log(`✅ Found ${newLeads.length} new leads`);
    
    if (newLeads.length > 0) {
      console.log('👤 Sample leads:');
      newLeads.forEach((lead, index) => {
        console.log(`   ${index + 1}. Phone: ${lead.phone}`);
        console.log(`      Name: ${lead.name || 'Sin nombre'}`);
        console.log(`      Score: ${lead.qualificationScore}`);
        console.log(`      Time: ${lead.createdAt.toLocaleString('es-CO')}`);
        console.log('      ---');
      });
    }
    
    // Test 3: Send day 2 report
    if (prompts.length > 0 || newLeads.length > 0) {
      console.log('\n📧 Test 3: Sending September 2 report email...');
      
      const htmlContent = generateEmailReport(prompts, newLeads);
      const transporter = createEmailTransporter();
      const adminEmail = process.env.ADMIN_EMAIL || 'mikehuertas91@gmail.com';
      
      const mailOptions = {
        from: {
          name: 'SafeNotify',
          address: process.env.SMTP_USER || 'informacion@safenotify.co'
        },
        to: adminEmail,
        subject: `📊 SafeNotify - Reporte del 2 de Septiembre (PRUEBA CORREGIDA)`,
        html: htmlContent,
        text: `Reporte SafeNotify del 2 de Septiembre\n\nNuevos Leads: ${newLeads.length}\nConversaciones: ${prompts.length}\n\nVer el reporte completo en formato HTML.`
      };
      
      const result = await transporter.sendMail(mailOptions);
      
      console.log('✅ September 2 report sent successfully!');
      console.log(`📧 Email ID: ${result.messageId}`);
      console.log(`📊 Report included: ${newLeads.length} new leads, ${prompts.length} unique conversations`);
    } else {
      console.log('\n📭 No data found for September 2, 2025');
    }
    
    console.log('\n🎉 Test completed! Check your email at mikehuertas91@gmail.com');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDay2Report()
  .then(() => {
    console.log('✅ Day 2 test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Day 2 test failed:', error);
    process.exit(1);
  });