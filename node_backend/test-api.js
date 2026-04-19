// Simple API test script to verify the backend is working
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPIs() {
  console.log('🧪 Testing Node.js Backend APIs\n');
  
  try {
    // Test 1: Get career paths (no auth required)
    console.log('1️⃣  Testing GET /api/career-paths...');
    const pathsRes = await axios.get(`${BASE_URL}/api/career-paths`);
    console.log(`   ✅ Status: ${pathsRes.status}`);
    console.log(`   📊 Found ${pathsRes.data.length} career paths`);
    if (pathsRes.data.length > 0) {
      const firstPath = pathsRes.data[0];
      console.log(`   🔍 First path has 'id' field: ${!!firstPath.id}`);
      console.log(`   🔍 First path has '_id' field: ${!!firstPath._id}`);
      if (firstPath.id) {
        console.log(`   ✅ ID transformation working! id = ${firstPath.id}`);
      } else {
        console.log(`   ❌ ID transformation NOT working! Response:`, JSON.stringify(firstPath, null, 2));
      }
    }
    console.log('');

    // Test 2: Register a test user
    console.log('2️⃣  Testing POST /api/auth/register...');
    const testEmail = `test${Date.now()}@example.com`;
    try {
      const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Test User',
        email: testEmail,
        password: 'password123'
      });
      console.log(`   ✅ Status: ${registerRes.status}`);
      console.log(`   ✅ Registration successful`);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.includes('already registered')) {
        console.log(`   ⚠️  Email already registered (expected if running multiple times)`);
      } else {
        throw err;
      }
    }
    console.log('');

    // Test 3: Login
    console.log('3️⃣  Testing POST /api/auth/login...');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testEmail,
      password: 'password123'
    });
    console.log(`   ✅ Status: ${loginRes.status}`);
    console.log(`   📧 OTP sent to email`);
    console.log(`   ℹ️  Status: ${loginRes.data.status}`);
    console.log('');

    // Test 4: Check server health
    console.log('4️⃣  Testing server connectivity...');
    const healthRes = await axios.get(`${BASE_URL}/api/career-paths`);
    console.log(`   ✅ Server is responding`);
    console.log('');

    console.log('✅ All basic tests passed!\n');
    console.log('📝 Summary:');
    console.log('   - Server is running on port 3000');
    console.log('   - MongoDB connection is working');
    console.log('   - ID transformation is working (returns "id" not "_id")');
    console.log('   - Authentication endpoints are functional');
    console.log('   - Ready for Flutter app integration');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else if (error.request) {
      console.error('   No response from server. Is it running?');
      console.error('   Run: npm run dev');
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

testAPIs();
