const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const email = 'test@test.com';
const password = 'password'; // Trying common test password

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
    } else {
      const match = await bcrypt.compare(password, user.password);
      console.log('User found:', user.email);
      console.log('Hash in DB:', user.password);
      console.log('Password match ():', match);
      
      const match123 = await bcrypt.compare('123456', user.password);
      console.log('Password match (123456):', match123);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
