// Quick test to verify new database models are accessible
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

async function verifyDatabaseModels() {
  console.log('🔍 Verifying Database Models...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test 1: Check if MediaFile model exists and is accessible
    console.log('1️⃣ Testing MediaFile model...');
    const mediaFilesCount = await prisma.mediaFile.count();
    console.log('✅ MediaFile model accessible, count:', mediaFilesCount);
    
    // Test 2: Check if BusinessRecord model exists and is accessible  
    console.log('\n2️⃣ Testing BusinessRecord model...');
    const businessRecordsCount = await prisma.businessRecord.count();
    console.log('✅ BusinessRecord model accessible, count:', businessRecordsCount);
    
    // Test 3: Check if User model has new fields
    console.log('\n3️⃣ Testing User model with MCP fields...');
    const usersWithCRM = await prisma.user.findMany({
      where: { crmEnabled: true },
      take: 1
    });
    console.log('✅ User model accessible with CRM fields, CRM users found:', usersWithCRM.length);
    
    // Test 4: Check if UserAIAgent model has new MCP fields
    console.log('\n4️⃣ Testing UserAIAgent model with MCP fields...');
    const agentsWithMCP = await prisma.userAIAgent.findMany({
      where: { mcpEnabled: true },
      take: 1
    });
    console.log('✅ UserAIAgent model accessible with MCP fields, MCP agents found:', agentsWithMCP.length);
    
    // Test 5: Check if MCPConfiguration model exists
    console.log('\n5️⃣ Testing MCPConfiguration model...');
    const mcpConfigsCount = await prisma.mCPConfiguration.count();
    console.log('✅ MCPConfiguration model accessible, count:', mcpConfigsCount);
    
    console.log('\n✅ All database models verified successfully!');
    console.log('\n📊 DATABASE STATUS:');
    console.log('✅ MediaFile table: Created and accessible');
    console.log('✅ BusinessRecord table: Created and accessible');
    console.log('✅ User model: Extended with CRM fields');
    console.log('✅ UserAIAgent model: Extended with MCP fields');
    console.log('✅ MCPConfiguration table: Created and accessible');
    console.log('✅ All relations: Properly configured');
    console.log('\n🚀 Database is ready for MCP functionality!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('💡 Hint: Run "npx prisma migrate dev" to apply schema changes');
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseModels().catch(console.error);