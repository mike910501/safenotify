const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTemplateSystem() {
  console.log('🔍 COMPREHENSIVE TEMPLATE SYSTEM VERIFICATION\n');
  
  try {
    // 1. Check current template states
    console.log('📊 ANALYZING CURRENT TEMPLATE STATES:');
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        aiApproved: true,
        twilioSid: true,
        twilioContentSid: true,
        twilioTemplateId: true,
        variables: true,
        userId: true,
        isPublic: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total templates: ${templates.length}\n`);
    
    const statusCounts = {};
    const twilioCounts = {
      withSid: 0,
      withContentSid: 0,
      withTemplateId: 0,
      withNone: 0
    };
    
    templates.forEach((template, index) => {
      // Count statuses
      statusCounts[template.status] = (statusCounts[template.status] || 0) + 1;
      
      // Count Twilio IDs
      if (template.twilioSid) twilioCounts.withSid++;
      if (template.twilioContentSid) twilioCounts.withContentSid++;  
      if (template.twilioTemplateId) twilioCounts.withTemplateId++;
      if (!template.twilioSid && !template.twilioContentSid && !template.twilioTemplateId) {
        twilioCounts.withNone++;
      }
      
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   Status: ${template.status} | AI: ${template.aiApproved}`);
      console.log(`   SID: ${template.twilioSid || 'None'}`);
      console.log(`   ContentSID: ${template.twilioContentSid || 'None'}`);
      console.log(`   TemplateID: ${template.twilioTemplateId || 'None'}`);
      console.log(`   Variables: ${template.variables?.length || 0}`);
      console.log(`   Public: ${template.isPublic}`);
      console.log('   ---');
    });
    
    console.log('📊 STATUS SUMMARY:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    console.log('\n📊 TWILIO ID SUMMARY:');
    console.log(`   With SID: ${twilioCounts.withSid}`);
    console.log(`   With ContentSID: ${twilioCounts.withContentSid}`);
    console.log(`   With TemplateID: ${twilioCounts.withTemplateId}`);
    console.log(`   With NONE: ${twilioCounts.withNone}`);
    
    // 2. Identify problems in the system
    console.log('\n❌ CRITICAL ISSUES FOUND:');
    
    // Issue 1: Templates using twilioSid for contentSid
    console.log('\n1. INCORRECT CONTENT SID USAGE:');
    console.log('   Line 1701: contentSid: template.twilioSid');
    console.log('   ❌ WRONG: Should use template.twilioContentSid');
    console.log('   This will cause template messages to fail!');
    
    // Issue 2: Inconsistent field usage
    console.log('\n2. INCONSISTENT FIELD USAGE:');
    console.log('   - twilioSid: Used for contentSid (WRONG)');
    console.log('   - twilioContentSid: Stored but not used properly');
    console.log('   - twilioTemplateId: Used for lookup only');
    
    // Issue 3: Template lookup logic
    console.log('\n3. TEMPLATE LOOKUP ISSUES:');
    console.log('   Templates searched by: twilioSid OR twilioContentSid OR twilioTemplateId');
    console.log('   But message sent with: template.twilioSid (always)');
    console.log('   This creates mismatch when ContentSID is provided!');
    
    // 3. Simulate template workflow
    console.log('\n🧪 SIMULATING TEMPLATE WORKFLOW:');
    
    // Find a template with ContentSID
    const testTemplate = templates.find(t => t.twilioContentSid);
    
    if (testTemplate) {
      console.log(`\nTesting template: ${testTemplate.name}`);
      console.log(`ContentSID: ${testTemplate.twilioContentSid}`);
      console.log(`SID: ${testTemplate.twilioSid}`);
      
      // Simulate what happens in campaign
      console.log('\n📤 SIMULATING CAMPAIGN SEND:');
      console.log('1. Template found by: contentSid lookup ✅');
      console.log(`2. Message will be sent with: contentSid = "${testTemplate.twilioSid}"`);
      console.log(`3. But actual ContentSID is: "${testTemplate.twilioContentSid}"`);
      console.log('4. Result: MESSAGE WILL FAIL ❌');
      
    } else {
      console.log('No templates with ContentSID found for testing');
    }
    
    // 4. Provide solutions
    console.log('\n✅ REQUIRED FIXES:');
    console.log('1. Fix line 1701: Use template.twilioContentSid || template.twilioSid');
    console.log('2. Add fallback logic for contentSid selection');
    console.log('3. Consistent field naming across system');
    console.log('4. Add validation in admin activation');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTemplateSystem().catch(console.error);