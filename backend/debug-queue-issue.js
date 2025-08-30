// Debug Script - Queue Processing Issue
console.log('🔍 DEBUGGING BULL QUEUE PROCESSING ISSUE');
console.log('==========================================');

async function debugQueueSystem() {
  try {
    console.log('1️⃣ Testing Queue Import...');
    const { addCampaignJob, getQueue } = require('./jobs/campaignQueue');
    console.log('✅ Queue imported successfully');
    
    console.log('\n2️⃣ Testing Queue Initialization...');
    const queue = getQueue();
    console.log('✅ Queue object:', {
      name: queue.name,
      opts: queue.opts
    });
    
    console.log('\n3️⃣ Testing Redis Connection...');
    const redisClient = queue.client;
    const ping = await redisClient.ping();
    console.log('✅ Redis ping response:', ping);
    
    console.log('\n4️⃣ Testing Queue Statistics...');
    const waiting = await queue.getWaiting();
    const active = await queue.getActive(); 
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    
    console.log('📊 Current Queue Stats:');
    console.log('   - Waiting:', waiting.length);
    console.log('   - Active:', active.length);
    console.log('   - Completed:', completed.length);
    console.log('   - Failed:', failed.length);
    
    console.log('\n5️⃣ Checking for stuck jobs...');
    if (waiting.length > 0) {
      console.log('⚠️  Found waiting jobs:');
      waiting.forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.id}: ${job.data.campaignId}`);
      });
    }
    
    if (active.length > 0) {
      console.log('⚠️  Found active jobs:');
      active.forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.id}: ${job.data.campaignId}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('❌ Found failed jobs:');
      failed.forEach((job, index) => {
        console.log(`   ${index + 1}. Job ${job.id}: ${job.failedReason}`);
      });
    }
    
    console.log('\n6️⃣ Testing Job Creation...');
    const testJob = await addCampaignJob({
      campaignId: 'debug-test-campaign',
      csvBuffer: Buffer.from('nombre,telefono\nTest,+573001234567'),
      template: {
        id: 'test-template',
        name: 'Debug Template',
        twilioSid: 'test-sid',
        variables: ['nombre'],
        content: 'Test {{1}}'
      },
      userId: 'debug-user',
      userName: 'Debug User',
      variableMappings: {},
      defaultValues: {}
    }, {
      delay: 1000,
      priority: 1,
      attempts: 1
    });
    
    console.log('✅ Test job created:', testJob.id);
    
    console.log('\n7️⃣ Waiting for job processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const updatedStats = await queue.getWaiting();
    const updatedActive = await queue.getActive();
    const updatedCompleted = await queue.getCompleted();
    const updatedFailed = await queue.getFailed();
    
    console.log('📊 Updated Queue Stats after 5 seconds:');
    console.log('   - Waiting:', updatedStats.length);
    console.log('   - Active:', updatedActive.length);
    console.log('   - Completed:', updatedCompleted.length);
    console.log('   - Failed:', updatedFailed.length);
    
    console.log('\n🎉 Debug completed successfully!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit();
}

debugQueueSystem();