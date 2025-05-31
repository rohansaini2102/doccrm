// Create this file as: C:\Users\Mahakaal\Desktop\DOCTOR\server\scripts\setup-admin.js

const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/config');

const setupAdmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'uddit' });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('👤 Username: uddit');
      console.log('🔑 Use your existing password');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'uddit',
      password: 'password123', // Change this to a secure password
      email: 'udditkantsinha@gmail.com',
      fullName: 'Dr. Uddit Kant Sinha',
      role: 'admin'
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('👤 Username: uddit');
    console.log('🔑 Password: password123');
    console.log('📧 Email: udditkantsinha@gmail.com');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

setupAdmin();