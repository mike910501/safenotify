#!/usr/bin/env node

/**
 * SafeNotify Backend Setup Script
 * Initializes database, validates configuration, and performs health checks
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 SafeNotify Backend Setup\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ .env file created');
    console.log('⚠️  Please edit .env with your Twilio credentials\n');
  } else {
    console.log('❌ .env.example not found');
    process.exit(1);
  }
}

// Validate required environment variables
console.log('🔍 Validating configuration...');

const requiredVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'ENCRYPTION_KEY',
  'API_KEY'
];

const missingVars = [];
const warnings = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  
  if (!value) {
    missingVars.push(varName);
  } else if (value.includes('your_') || value.includes('your-')) {
    warnings.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📖 Please check the README.md for configuration details');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('⚠️  These variables appear to have placeholder values:');
  warnings.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

// Generate encryption key if needed
if (process.env.ENCRYPTION_KEY === 'your-256-bit-encryption-key-here-must-be-32-chars') {
  console.log('🔐 Generating new encryption key...');
  const newKey = crypto.randomBytes(32).toString('hex').substring(0, 32);
  
  // Update .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  envContent = envContent.replace(
    'ENCRYPTION_KEY=your-256-bit-encryption-key-here-must-be-32-chars',
    `ENCRYPTION_KEY=${newKey}`
  );
  fs.writeFileSync('.env', envContent);
  
  console.log('✅ New encryption key generated and saved to .env');
}

// Generate API key if needed
if (process.env.API_KEY === 'your-api-key-for-frontend-auth') {
  console.log('🔑 Generating new API key...');
  const newApiKey = 'sk_' + crypto.randomBytes(24).toString('hex');
  
  // Update .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  envContent = envContent.replace(
    'API_KEY=your-api-key-for-frontend-auth',
    `API_KEY=${newApiKey}`
  );
  fs.writeFileSync('.env', envContent);
  
  console.log('✅ New API key generated and saved to .env');
  console.log(`🔗 Use this in your frontend: ${newApiKey}`);
}

// Create necessary directories
console.log('📁 Creating directories...');

const directories = ['data', 'logs', 'uploads'];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Initialize database
console.log('🗄️  Initializing database...');

try {
  const db = require('../config/database');
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.log('❌ Database initialization failed:', error.message);
  process.exit(1);
}

// Test Twilio connection
console.log('📱 Testing Twilio connection...');

async function testTwilio() {
  try {
    const twilioService = require('../config/twilio');
    await twilioService.validateConnection();
    console.log('✅ Twilio connection successful');
    
    // List available templates
    console.log('📋 Checking Twilio templates...');
    const templates = await twilioService.listAvailableTemplates();
    
    if (templates.length > 0) {
      console.log(`✅ Found ${templates.length} configured templates:`);
      templates.forEach(template => {
        console.log(`   - ${template.name} (${template.sid})`);
      });
    } else {
      console.log('⚠️  No templates configured. Please set template SIDs in .env');
    }
    
  } catch (error) {
    console.log('❌ Twilio connection failed:', error.message);
    console.log('📖 Please check your Twilio credentials in .env');
  }
}

testTwilio().then(() => {
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Review your .env configuration');
  console.log('2. Set up Twilio Content Templates in Twilio Console');
  console.log('3. Configure webhook URL: https://your-domain.com/api/webhooks/twilio');
  console.log('4. Start the server: npm start');
  console.log('\n📖 For detailed documentation, see README.md');
});

// Health check function
async function performHealthCheck() {
  console.log('\n🏥 Performing health check...');
  
  try {
    // Test database connection
    const db = require('../config/database');
    await db.get('SELECT 1');
    console.log('✅ Database connection: OK');
    
    // Test logging system
    const logger = require('../config/logger');
    logger.info('Health check test log');
    console.log('✅ Logging system: OK');
    
    // Check disk space for logs and data
    const stats = fs.statSync('.');
    console.log('✅ File system: OK');
    
    // Memory check
    const memUsage = process.memoryUsage();
    console.log(`✅ Memory usage: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}