require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function setAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    console.log('✓ Database:', mongoose.connection.db.databaseName);
    
    const adminEmail = 'ayushmistry0054@gmail.com';
    const newPassword = 'admin123'; // Set a known password
    
    console.log(`\n🔐 Setting password for admin: ${adminEmail}`);
    console.log(`   New password: ${newPassword}`);
    
    // Find admin user
    const user = await User.findOne({ email: adminEmail });
    if (!user) {
      console.log('❌ Admin user not found');
      await mongoose.connection.close();
      return;
    }
    
    console.log('✓ Admin user found:', user.name);
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('✓ Password hashed');
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    console.log('✓ Password updated successfully!');
    
    // Verify the new password
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log('✓ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    
    console.log('\n📝 Admin credentials:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', newPassword);
    console.log('   Role:', user.role);
    
    await mongoose.connection.close();
    console.log('\n✓ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setAdminPassword();
