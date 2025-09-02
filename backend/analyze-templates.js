const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeTemplates() {
  console.log('📊 ANALYZING ALL TEMPLATES...\n');
  
  try {
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        content: true,
        variables: true,
        twilioSid: true,
        twilioContentSid: true,
        category: true
      }
    });

    console.log(`Found ${templates.length} approved templates:\n`);
    
    templates.forEach((template, index) => {
      console.log(`${index + 1}. NAME: ${template.name}`);
      console.log(`   CATEGORY: ${template.category}`);
      console.log(`   VARIABLES: ${JSON.stringify(template.variables)}`);
      console.log(`   TWILIO_SID: ${template.twilioSid || 'None'}`);
      console.log(`   CONTENT_SID: ${template.twilioContentSid || 'None'}`);
      console.log(`   CONTENT: ${template.content.substring(0, 100)}...`);
      console.log('   ---');
    });

    // Test variable corruption issue
    console.log('\n🔍 TESTING JSON CORRUPTION ISSUE:');
    
    const corruptedJson = '{"{nombre":"nombre"}';
    console.log('Original corrupted:', corruptedJson);
    
    // Test current sanitization
    const sanitizeJson = (jsonString) => {
      if (!jsonString) return '{}';
      
      try {
        let cleaned = jsonString.trim();
        cleaned = cleaned.replace(/^\{+/, '{');
        cleaned = cleaned.replace(/^"?\{/, '{');
        cleaned = cleaned.replace(/\}"?$/, '}');
        JSON.parse(cleaned);
        return cleaned;
      } catch (error) {
        console.warn('⚠️ Invalid JSON detected:', jsonString);
        return '{}';
      }
    };
    
    const result = sanitizeJson(corruptedJson);
    console.log('Sanitized result:', result);
    
    try {
      const parsed = JSON.parse(result);
      console.log('Parsed successfully:', parsed);
    } catch (e) {
      console.error('Still broken after sanitization:', e.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTemplates().catch(console.error);