const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows local ISP DNS SRV lookup issues
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.log('DNS setServers fallback error:', e.message);
}

const autoSeedAdmin = async () => {
  try {
    const User = require('../models/userModel');
    const adminEmail = (process.env.ADMIN_EMAIL || 'rpravin337@gmail.com').toLowerCase().trim();
    const adminName = process.env.ADMIN_NAME || 'Admin Agri Max Solar';
    const adminPhone = process.env.ADMIN_PHONE || '7470700682';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: adminPassword,
        role: 'admin',
        status: 'active',
      });
      await admin.save();
      console.log(`Auto-created initial Admin account: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Auto seed admin error:', err.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await autoSeedAdmin();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
