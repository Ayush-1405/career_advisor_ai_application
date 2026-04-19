require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    console.log('✓ Database:', mongoose.connection.db.databaseName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    collections.forEach(col => console.log('  -', col.name));
    
    // Count users
    const totalUsers = await User.countDocuments();
    console.log(`\n👥 Total users: ${totalUsers}`);
    
    // Find admin users
    const adminUsers = await User.find({ role: 'ADMIN' });
    console.log(`\n🔑 Admin users found: ${adminUsers.length}`);
    adminUsers.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.email}) - Role: ${admin.role}`);
    });
    
    // Find all users (limit 5)
    const allUsers = await User.find().limit(5);
    console.log(`\n📋 Sample users (first 5):`);
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
