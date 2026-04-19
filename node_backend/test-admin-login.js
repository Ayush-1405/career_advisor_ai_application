require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function testAdminLogin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    console.log('✓ Database:', mongoose.connection.db.databaseName);
    
    // Test credentials
    const testEmail = 'ayushmistry0054@gmail.com';
    const testPassword = 'admin123'; // Try common passwords
    
    console.log(`\n🔐 Testing login for: ${testEmail}`);
    
    // Find user
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log('❌ User not found');
      await mongoose.connection.close();
      return;
    }
    
    console.log('✓ User found:');
    console.log('  - Name:', user.name);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Password hash:', user.password.substring(0, 20) + '...');
    
    // Test password
    console.log(`\n🔑 Testing password: "${testPassword}"`);
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('  Result:', isMatch ? '✓ Password matches!' : '❌ Password does not match');
    
    if (!isMatch) {
      console.log('\n💡 Try these common passwords:');
      const commonPasswords = ['admin', 'admin123', 'password', 'Admin123', 'ayush123', '123456'];
      for (const pwd of commonPasswords) {
        const match = await bcrypt.compare(pwd, user.password);
        if (match) {
          console.log(`  ✓ Found matching password: "${pwd}"`);
          break;
        }
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAdminLogin();
