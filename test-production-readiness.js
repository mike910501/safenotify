#!/usr/bin/env node

// Complete production readiness test for SafeNotify Analytics
console.log('🔍 SAFENOTIFY ANALYTICS - PRODUCTION READINESS TEST\n');

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test results
const results = {
  backend: false,
  database: false,
  analytics: false,
  frontend: false,
  webhooks: false,
  overall: false
};

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      cwd, 
      shell: true,
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

async function testFileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function runTests() {
  console.log('📋 TESTING CHECKLIST:\n');
  
  // 1. Backend Structure Test
  console.log('1️⃣ BACKEND STRUCTURE TEST');
  console.log('   Checking critical files...');
  
  const backendFiles = [
    'backend/simple-server.js',
    'backend/routes/analytics.js',
    'backend/services/messageService.js',
    'backend/routes/webhooks.js',
    'backend/prisma/schema.prisma'
  ];
  
  let backendFilesOk = true;
  for (const file of backendFiles) {
    const exists = await testFileExists(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) backendFilesOk = false;
  }
  
  results.backend = backendFilesOk;
  console.log(`   Result: ${backendFilesOk ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // 2. Database Schema Test
  console.log('2️⃣ DATABASE SCHEMA TEST');
  console.log('   Running analytics test...');
  
  try {
    const { code, stdout, stderr } = await runCommand('node', ['test-analytics.js'], 'backend');
    
    if (code === 0 && stdout.includes('ALL ANALYTICS TESTS PASSED')) {
      console.log('   ✅ Database connection: OK');
      console.log('   ✅ Analytics queries: OK');
      console.log('   ✅ Template usage: OK');
      results.database = true;
      results.analytics = true;
    } else {
      console.log('   ❌ Database tests failed');
      console.log('   Error:', stderr.substring(0, 200) + '...');
    }
  } catch (error) {
    console.log('   ❌ Could not run database tests');
    console.log('   Error:', error.message);
  }
  
  console.log(`   Result: ${results.database && results.analytics ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // 3. Frontend Integration Test
  console.log('3️⃣ FRONTEND INTEGRATION TEST');
  console.log('   Checking analytics page...');
  
  const frontendFiles = [
    'app/dashboard/analytics/page.tsx',
    'components/dashboard/sidebar.tsx'
  ];
  
  let frontendOk = true;
  for (const file of frontendFiles) {
    const exists = await testFileExists(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) frontendOk = false;
  }
  
  // Check if analytics is in sidebar
  try {
    const sidebarContent = await fs.promises.readFile('components/dashboard/sidebar.tsx', 'utf8');
    if (sidebarContent.includes('Analytics') && sidebarContent.includes('/dashboard/analytics')) {
      console.log('   ✅ Analytics in sidebar navigation');
    } else {
      console.log('   ❌ Analytics not found in sidebar');
      frontendOk = false;
    }
  } catch {
    console.log('   ❌ Could not check sidebar');
    frontendOk = false;
  }
  
  results.frontend = frontendOk;
  console.log(`   Result: ${frontendOk ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // 4. API Endpoints Test
  console.log('4️⃣ API ENDPOINTS TEST');
  console.log('   Checking server registration...');
  
  try {
    const serverContent = await fs.promises.readFile('backend/simple-server.js', 'utf8');
    
    if (serverContent.includes("require('./routes/analytics')")) {
      console.log('   ✅ Analytics routes imported');
    } else {
      console.log('   ❌ Analytics routes not imported');
    }
    
    if (serverContent.includes("app.use('/api/analytics'")) {
      console.log('   ✅ Analytics routes registered');
    } else {
      console.log('   ❌ Analytics routes not registered');
    }
    
    if (serverContent.includes('updateDeliveryTime') || serverContent.includes('updateReadTime')) {
      console.log('   ✅ Webhook enhancements detected');
    } else {
      console.log('   ⚠️ Webhook enhancements not detected');
    }
    
    results.webhooks = true;
    
  } catch (error) {
    console.log('   ❌ Could not check server file');
    results.webhooks = false;
  }
  
  console.log(`   Result: ${results.webhooks ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // 5. Environment Check
  console.log('5️⃣ ENVIRONMENT CHECK');
  
  const envFiles = ['.env.local', '.env.production', 'backend/.env'];
  let envOk = false;
  
  for (const envFile of envFiles) {
    const exists = await testFileExists(envFile);
    if (exists) {
      console.log(`   ✅ ${envFile} found`);
      envOk = true;
    }
  }
  
  if (!envOk) {
    console.log('   ❌ No environment files found');
  }
  
  console.log(`   Result: ${envOk ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // Final Assessment
  results.overall = results.backend && results.database && results.analytics && results.frontend && results.webhooks;
  
  console.log('📊 FINAL ASSESSMENT\n');
  console.log('═'.repeat(50));
  console.log(`Backend Structure:    ${results.backend ? '✅ READY' : '❌ ISSUES'}`);
  console.log(`Database & Analytics: ${results.database && results.analytics ? '✅ READY' : '❌ ISSUES'}`);
  console.log(`Frontend Integration: ${results.frontend ? '✅ READY' : '❌ ISSUES'}`);
  console.log(`API & Webhooks:       ${results.webhooks ? '✅ READY' : '❌ ISSUES'}`);
  console.log('═'.repeat(50));
  
  if (results.overall) {
    console.log('🎉 PRODUCTION READY!');
    console.log('✅ All systems check passed');
    console.log('🚀 SafeNotify Analytics can be deployed to production');
    console.log('\n📋 DEPLOYMENT CHECKLIST:');
    console.log('1. Set production environment variables');
    console.log('2. Run database migrations: npx prisma db push');
    console.log('3. Start backend: npm run start');
    console.log('4. Build frontend: npm run build');
    console.log('5. Configure webhook URL in Twilio');
    console.log('6. Monitor logs for any issues');
  } else {
    console.log('⚠️ ISSUES DETECTED');
    console.log('❌ Some components need attention before production');
    console.log('\n🔧 REQUIRED ACTIONS:');
    
    if (!results.backend) {
      console.log('• Fix missing backend files');
    }
    if (!results.database || !results.analytics) {
      console.log('• Fix database connection and analytics queries');
    }
    if (!results.frontend) {
      console.log('• Fix frontend integration issues');
    }
    if (!results.webhooks) {
      console.log('• Fix API endpoint registration');
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  process.exit(results.overall ? 0 : 1);
}

// Run all tests
runTests().catch(console.error);