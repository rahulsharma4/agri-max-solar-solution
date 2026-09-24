const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.log('DNS fallback error:', e.message);
}

const mongoose = require('mongoose');

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

let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;
  isConnecting = true;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrimaxsolar';
  console.log('Connecting to MongoDB database...');
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
    isConnecting = false;
    await autoSeedAdmin();
  } catch (error) {
    console.error(`MongoDB Atlas Connection Error: ${error.message}`);
    isConnecting = false;
    if (uri.includes('mongodb.net')) {
      try {
        console.log('Attempting connection to Local MongoDB...');
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/agrimaxsolar', {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB Local Connected Successfully: ${localConn.connection.host}`);
        await autoSeedAdmin();
      } catch (localErr) {
        console.error(`Local MongoDB Fallback Error: ${localErr.message}`);
      }
    }
  }
};

module.exports = connectDB;


