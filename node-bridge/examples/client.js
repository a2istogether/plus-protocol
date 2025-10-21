/**
 * Example client - Testing the Express-style API
 */

const { Client } = require('../dist/index');

async function main() {
  console.log('🚀 Fast Protocol Client Example\n');
  
  // Create client
  const client = new Client('127.0.0.1:0', '127.0.0.1:8080', {
    timeout: 5000,
  });

  // Connect to server
  await client.connect();
  console.log('✅ Connected to server\n');

  try {
    // ===== Public Routes Tests =====
    
    console.log('📋 Testing Public Routes...\n');
    
    // Test 1: Ping
    console.log('1️⃣  GET /ping');
    const pingResponse = await client.request('/ping', '');
    console.log('   Response:', pingResponse.toString());
    console.log('');
    
    // Test 2: Echo
    console.log('2️⃣  POST /echo');
    const echoResponse = await client.request('/echo', 'Hello, World!');
    console.log('   Response:', echoResponse.toString());
    console.log('');
    
    // Test 3: JSON
    console.log('3️⃣  POST /json');
    const jsonResponse = await client.requestJson('/json', {
      name: 'Alice',
      age: 30,
      message: 'Testing JSON endpoint',
    });
    console.log('   Response:', JSON.stringify(jsonResponse, null, 2));
    console.log('');
    
    // Test 4: Uppercase
    console.log('4️⃣  POST /uppercase');
    const upperResponse = await client.request('/uppercase', 'hello world');
    console.log('   Response:', upperResponse.toString());
    console.log('');
    
    // Test 5: Reverse
    console.log('5️⃣  POST /reverse');
    const reverseResponse = await client.request('/reverse', 'stressed desserts');
    console.log('   Response:', reverseResponse.toString());
    console.log('');
    
    // ===== API Routes Tests =====
    
    console.log('📋 Testing API Routes...\n');
    
    // Test 6: Status
    console.log('6️⃣  GET /status');
    const statusResponse = await client.requestJson('/status', {});
    console.log('   Response:', JSON.stringify(statusResponse, null, 2));
    console.log('');
    
    // Test 7: Health
    console.log('7️⃣  GET /health');
    const healthResponse = await client.requestJson('/health', {});
    console.log('   Response:', JSON.stringify(healthResponse, null, 2));
    console.log('');
    
    // Test 8: Data
    console.log('8️⃣  POST /data');
    const dataResponse = await client.requestJson('/data', {
      key: 'value',
      items: [1, 2, 3],
    });
    console.log('   Response:', JSON.stringify(dataResponse, null, 2));
    console.log('');
    
    // ===== Protected Routes Tests =====
    
    console.log('📋 Testing Protected Routes (without auth)...\n');
    
    // Test 9: Get user (should fail without auth)
    console.log('9️⃣  GET /user (without auth)');
    try {
      const userResponse = await client.request('/user', '');
      console.log('   Response:', userResponse.toString());
    } catch (err) {
      console.log('   ❌ Expected error:', err.message);
    }
    console.log('');
    
    // Test 10: Create user (with auth simulation)
    console.log('🔟 POST /user (simulating auth)');
    const createUserResponse = await client.requestJson('/user', {
      name: 'Bob Smith',
      email: 'bob@example.com',
    });
    console.log('   Response:', JSON.stringify(createUserResponse, null, 2));
    console.log('');
    
    // ===== Summary =====
    
    console.log('✅ All tests completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Disconnect
    await client.disconnect();
    console.log('👋 Disconnected from server');
  }
}

main().catch(console.error);

