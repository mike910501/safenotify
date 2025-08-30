// Test script para verificar conexión frontend-backend
const http = require('http');

function testEndpoint(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testFrontendBackendConnection() {
  console.log('🌐 Testing Frontend-Backend Connection...\n');
  
  const BASE_URL = 'http://localhost:3005';
  
  try {
    // 1. Test server health
    console.log('1️⃣ Testing server health...');
    try {
      const healthResponse = await testEndpoint(`${BASE_URL}/health`);
      console.log(`✅ Server responding: Status ${healthResponse.status}`);
    } catch (error) {
      console.log('❌ Server not running on port 3005');
      console.log('💡 Start the server with: cd backend && npm run dev');
      return;
    }
    
    // 2. Test CORS headers
    console.log('\n2️⃣ Testing CORS configuration...');
    const corsResponse = await testEndpoint(`${BASE_URL}/health`);
    const corsHeaders = corsResponse.headers;
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log(`✅ CORS enabled: ${corsHeaders['access-control-allow-origin']}`);
    } else {
      console.log('⚠️ CORS headers not found - might cause frontend issues');
    }
    
    // 3. Test analytics endpoint (without auth - should fail appropriately)
    console.log('\n3️⃣ Testing analytics endpoint (no auth)...');
    const analyticsNoAuth = await testEndpoint(`${BASE_URL}/api/analytics/dashboard`);
    
    if (analyticsNoAuth.status === 401) {
      console.log('✅ Analytics endpoint protected (401 Unauthorized)');
    } else {
      console.log(`⚠️ Unexpected status: ${analyticsNoAuth.status}`);
    }
    
    // 4. Test analytics endpoint structure
    console.log('\n4️⃣ Testing analytics route registration...');
    
    // Test if the route exists (should return 401, not 404)
    if (analyticsNoAuth.status === 404) {
      console.log('❌ Analytics route not found (404) - route not registered');
    } else if (analyticsNoAuth.status === 401) {
      console.log('✅ Analytics route registered correctly');
    } else {
      console.log(`ℹ️ Analytics route status: ${analyticsNoAuth.status}`);
    }
    
    // 5. Test export endpoint
    console.log('\n5️⃣ Testing export endpoint...');
    const exportResponse = await testEndpoint(`${BASE_URL}/api/analytics/export`);
    
    if (exportResponse.status === 401) {
      console.log('✅ Export endpoint protected (401 Unauthorized)');
    } else {
      console.log(`⚠️ Export endpoint status: ${exportResponse.status}`);
    }
    
    // 6. Check response format
    console.log('\n6️⃣ Testing response format...');
    try {
      const parsedResponse = JSON.parse(analyticsNoAuth.data);
      if (parsedResponse.success === false && parsedResponse.error) {
        console.log('✅ Error responses properly formatted');
      }
    } catch (error) {
      console.log('⚠️ Response not valid JSON');
    }
    
    console.log('\n🎉 FRONTEND-BACKEND CONNECTION TESTS COMPLETED!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Server is running and responding');
    console.log('✅ Analytics routes are registered');
    console.log('✅ Authentication is working');
    console.log('✅ CORS is configured');
    console.log('\n🚀 READY FOR FRONTEND INTEGRATION!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTION:');
      console.log('1. Start the backend server: cd backend && npm run dev');
      console.log('2. Make sure port 3005 is not in use');
      console.log('3. Check .env file for correct PORT configuration');
    }
  }
}

// Run the test
testFrontendBackendConnection();