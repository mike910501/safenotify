const twilioService = require('./config/twilio');

async function checkMessageStatus() {
  console.log('🔍 CHECKING REAL MESSAGE STATUS FROM TWILIO\n');
  
  try {
    const client = twilioService.client;
    
    // Check the last message we sent
    const messageSid = 'MM7504f143aa14dd0c236b099298fb1536'; // From the last test
    
    console.log(`📋 Checking message: ${messageSid}`);
    
    // Get full message details from Twilio
    const message = await client.messages(messageSid).fetch();
    
    console.log('\n📊 COMPLETE MESSAGE DETAILS:');
    console.log(`   SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   From: ${message.from}`);
    console.log(`   To: ${message.to}`);
    console.log(`   Body: ${message.body || 'N/A (template)'}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    console.log(`   Date Updated: ${message.dateUpdated}`);
    console.log(`   Date Sent: ${message.dateSent || 'Not sent yet'}`);
    console.log(`   Direction: ${message.direction}`);
    console.log(`   Error Code: ${message.errorCode || 'None'}`);
    console.log(`   Error Message: ${message.errorMessage || 'None'}`);
    console.log(`   Price: ${message.price || 'N/A'}`);
    console.log(`   Price Unit: ${message.priceUnit || 'N/A'}`);
    
    // Check if it's a template message
    if (message.messagingServiceSid) {
      console.log(`   Messaging Service SID: ${message.messagingServiceSid}`);
    }
    
    // Get subresources - this might show the template details
    try {
      console.log('\n📋 CHECKING MEDIA AND SUBRESOURCES...');
      
      // Check if there are any media attachments
      const media = await client.messages(messageSid).media.list();
      if (media.length > 0) {
        console.log(`   Media count: ${media.length}`);
        media.forEach((item, index) => {
          console.log(`   Media ${index + 1}: ${item.contentType} - ${item.uri}`);
        });
      } else {
        console.log(`   No media attachments`);
      }
      
    } catch (mediaError) {
      console.log(`   Could not fetch media: ${mediaError.message}`);
    }
    
    // Also get the most recent messages to see the pattern
    console.log('\n📋 RECENT MESSAGES FROM YOUR NUMBER:');
    const recentMessages = await client.messages.list({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      limit: 5
    });
    
    recentMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.sid} - ${msg.status} - ${msg.dateCreated}`);
      console.log(`      To: ${msg.to}`);
      console.log(`      Body: ${msg.body ? msg.body.substring(0, 50) + '...' : 'Template message'}`);
    });
    
    return message;
    
  } catch (error) {
    console.error('❌ Failed to check message status:', error.message);
    console.error('   Code:', error.code);
    return null;
  }
}

// Run the check
if (require.main === module) {
  checkMessageStatus().catch(console.error);
}

module.exports = { checkMessageStatus };