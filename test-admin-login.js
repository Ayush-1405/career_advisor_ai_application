// Test script to verify admin login works with Node.js backend
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAdminLogin() {
  console.log('🧪 Testing Admin Login with Node.js Backend\n');

  try {
    // Test 1: Register an admin user (if not exists)
    console.log('1️⃣  Creating admin user...');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123'
      });
      console.log('   ✅ Admin user created');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('   ℹ️  Admin user already exists');
      } else {
        throw err;
      }
    }

    // Test 2: Update user role to ADMIN in database
    console.log('\n2️⃣  Note: You need to manually set role to ADMIN in MongoDB');
    console.log('   Run this in MongoDB:');
    console.log('   db.users.updateOne({email:"admin@example.com"}, {$set:{role:"ADMIN"}})');

    // Test 3: Try login
    console.log('\n3️⃣  Testing admin login...');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });

    console.log('   ✅ Login response:', loginRes.data);
    
    if (loginRes.data.status === 'REQUIRES_OTP') {
      console.log('   ✅ OTP required (this is correct!)');
      console.log('   📧 Check email for OTP code');
      console.log('\n4️⃣  To complete login, use the OTP from email:');
      console.log('   POST /api/auth/verify-login?email=admin@example.com&code=YOUR_CODE');
    } else if (loginRes.data.token) {
      console.log('   ✅ Login successful!');
      console.log('   🔑 Token:', loginRes.data.token);
      console.log('   👤 Role:', loginRes.data.role);
    }

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else if (error.request) {
      console.error('   No response from server. Is it running?');
      console.error('   Run: cd node_backend && npm run dev');
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

// Run the test
testAdminLogin();
