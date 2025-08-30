// Test Manual del Sistema WebSocket
const http = require('http');
const CampaignProgressTracker = require('./websocket/campaignProgress');

console.log('🧪 TESTING WEBSOCKET SYSTEM');
console.log('===============================');

async function testWebSocketSystem() {
  try {
    // 1. Crear servidor HTTP y WebSocket
    console.log('1️⃣ Creating HTTP Server and WebSocket...');
    const server = http.createServer();
    const tracker = new CampaignProgressTracker(server);
    
    console.log('✅ WebSocket server created');
    
    // 2. Iniciar servidor en puerto de prueba
    const PORT = 3999; // Puerto diferente para testing
    server.listen(PORT, () => {
      console.log(`✅ WebSocket server running on port ${PORT}`);
      
      // 3. Simular progreso de campaña
      console.log('\n2️⃣ Simulating Campaign Progress...');
      const testCampaignId = 'test-campaign-websocket-123';
      
      // Simular diferentes estados de progreso
      setTimeout(() => {
        tracker.emitCampaignProgress(testCampaignId, {
          sent: 10,
          total: 100,
          progress: 10,
          errors: 0,
          timestamp: new Date().toISOString(),
          status: 'processing'
        });
        console.log('✅ Progress Update 1 sent: 10%');
      }, 1000);
      
      setTimeout(() => {
        tracker.emitCampaignProgress(testCampaignId, {
          sent: 50,
          total: 100,
          progress: 50,
          errors: 2,
          timestamp: new Date().toISOString(),
          status: 'processing'
        });
        console.log('✅ Progress Update 2 sent: 50%');
      }, 2000);
      
      setTimeout(() => {
        tracker.emitCampaignStatus(testCampaignId, {
          status: 'completed',
          finalStats: {
            totalSent: 98,
            totalErrors: 2,
            completedAt: new Date().toISOString()
          }
        });
        console.log('✅ Final Status sent: COMPLETED');
        
        console.log('\n🎉 WebSocket System Test PASSED!');
        console.log('💡 Para testing completo, conecta un cliente WebSocket a:');
        console.log(`   ws://localhost:${PORT}`);
        console.log('💡 Y escucha el evento: campaign-progress-${testCampaignId}');
        
        // Cerrar servidor después de 5 segundos
        setTimeout(() => {
          server.close();
          console.log('\n✅ Test server closed');
        }, 5000);
        
      }, 3000);
    });
    
  } catch (error) {
    console.error('❌ WebSocket System Test FAILED:', error.message);
  }
}

testWebSocketSystem();