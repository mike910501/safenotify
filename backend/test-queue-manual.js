// Test Manual del Sistema Bull Queue
const { addCampaignJob, getQueue } = require('./jobs/campaignQueue');

console.log('🧪 TESTING BULL QUEUE SYSTEM');
console.log('===============================');

async function testQueueSystem() {
  try {
    // 1. Verificar que la cola se inicializa
    console.log('1️⃣ Testing Queue Initialization...');
    const queue = getQueue();
    console.log('✅ Queue Name:', queue.name);
    console.log('✅ Queue Options:', queue.opts);
    
    // 2. Agregar un job de prueba
    console.log('\n2️⃣ Testing Job Creation...');
    const testJob = await addCampaignJob({
      campaignId: 'test-campaign-123',
      csvBuffer: Buffer.from('nombre,telefono\nJuan,+573001234567'),
      template: {
        id: 'test-template',
        name: 'Test Template',
        twilioSid: 'test-sid',
        variables: ['nombre'],
        content: 'Hola {{1}}'
      },
      userId: 'test-user',
      userName: 'Test User',
      variableMappings: {},
      defaultValues: {}
    }, {
      delay: 5000,
      priority: 1,
      attempts: 1
    });
    
    console.log('✅ Job Created:', testJob.id);
    console.log('✅ Job Data:', testJob.data);
    
    // 3. Verificar estadísticas de la cola
    console.log('\n3️⃣ Testing Queue Statistics...');
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    
    console.log('📊 Queue Statistics:');
    console.log('   - Waiting:', waiting.length);
    console.log('   - Active:', active.length);
    console.log('   - Completed:', completed.length);
    console.log('   - Failed:', failed.length);
    
    console.log('\n🎉 Queue System Test PASSED!');
    
  } catch (error) {
    console.error('❌ Queue System Test FAILED:', error.message);
  }
}

testQueueSystem();