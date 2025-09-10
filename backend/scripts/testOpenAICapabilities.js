// Script para probar qué APIs tenemos disponibles
const OpenAI = require('openai');
const dotenv = require('dotenv');
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testCapabilities() {
  console.log('🔍 Testing OpenAI Capabilities...\n');

  // Test 1: Chat Completions (actual)
  try {
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10
    });
    console.log('✅ Chat Completions API: AVAILABLE');
    console.log(`   Response: "${chatResponse.choices[0].message.content.trim()}"`);
  } catch (error) {
    console.log('❌ Chat Completions API:', error.message);
  }

  // Test 2: Function Calling
  try {
    const functionResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'What is the weather?' }],
      functions: [{
        name: 'test_function',
        description: 'A test function',
        parameters: { 
          type: 'object', 
          properties: {
            test: { type: 'string', description: 'A test parameter' }
          }
        }
      }],
      max_tokens: 10
    });
    console.log('✅ Function Calling: AVAILABLE');
    if (functionResponse.choices[0].function_call) {
      console.log('   Function called:', functionResponse.choices[0].function_call);
    }
  } catch (error) {
    console.log('❌ Function Calling:', error.message);
  }

  // Test 3: Tools (newer function calling format)
  try {
    const toolsResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'What time is it?' }],
      tools: [{
        type: 'function',
        function: {
          name: 'get_time',
          description: 'Get current time',
          parameters: { 
            type: 'object', 
            properties: {},
            required: []
          }
        }
      }],
      max_tokens: 10
    });
    console.log('✅ Tools API: AVAILABLE');
    if (toolsResponse.choices[0].message.tool_calls) {
      console.log('   Tools called:', toolsResponse.choices[0].message.tool_calls.length);
    }
  } catch (error) {
    console.log('❌ Tools API:', error.message);
  }

  // Test 4: Responses API (MCP support)
  try {
    const responsesResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: 'test',
        max_tokens: 10
      })
    });

    if (responsesResponse.ok) {
      const data = await responsesResponse.json();
      console.log('✅ Responses API: AVAILABLE (MCP possible!)');
      console.log('   Response data keys:', Object.keys(data));
    } else {
      const error = await responsesResponse.text();
      console.log('❌ Responses API:', error);
    }
  } catch (error) {
    console.log('❌ Responses API:', error.message);
  }

  // Test 5: GPT-5 Models specifically
  console.log('\n🧪 Testing GPT-5 Models:');
  
  const gpt5Models = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'];
  
  for (const model of gpt5Models) {
    try {
      const gpt5Response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 5
      });
      console.log(`✅ ${model}: AVAILABLE`);
    } catch (error) {
      console.log(`❌ ${model}: ${error.message}`);
    }
  }

  // Test 6: List available models
  try {
    console.log('\n📋 Available Models:');
    const models = await openai.models.list();
    const gptModels = models.data
      .filter(m => m.id.includes('gpt'))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 15); // Limit to first 15

    gptModels.forEach(m => console.log(`  - ${m.id}`));
    
    if (gptModels.length === 15) {
      console.log(`  ... and ${models.data.filter(m => m.id.includes('gpt')).length - 15} more GPT models`);
    }
  } catch (error) {
    console.log('❌ Cannot list models:', error.message);
  }

  // Test 7: Current model configuration from SafeNotify
  console.log('\n🎯 SafeNotify Current Configuration:');
  console.log('  PREMIUM model: gpt-5');
  console.log('  STANDARD model: gpt-5-mini');  
  console.log('  ECONOMY model: gpt-5-nano');
  console.log('  FALLBACK model: gpt-4o-mini');
  console.log('  Default model used by agents: gpt-5-mini');
  
  // Test 8: Vision capabilities (for MCP multimedia)
  try {
    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'What do you see?' },
          { 
            type: 'image_url', 
            image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' }
          }
        ]
      }],
      max_tokens: 10
    });
    console.log('\n✅ Vision API: AVAILABLE (Ready for multimedia MCP)');
  } catch (error) {
    console.log('\n❌ Vision API:', error.message);
  }

  console.log('\n🏁 Capability testing complete!');
}

// Handle async errors
testCapabilities().catch(error => {
  console.error('💥 Fatal error during testing:', error);
  process.exit(1);
});