const mongoose = require('mongoose');
const User = require('../models/User');

let isConnected = false;
let retryLogged = false;

const seedDemoUser = async () => {
  try {
    const existing = await User.findOne({ email: 'demo@demo.com' });
    if (!existing) {
      await User.create({
        email: 'demo@demo.com',
        password: 'demo123',
        name: 'Demo Operator'
      });
      console.log('✅ Demo user seeded: demo@demo.com / demo123');
    } else {
      console.log('ℹ️ Demo user ready: demo@demo.com');
    }
  } catch (err) {
    // Silent
  }
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/energy';

  const tryConnect = async () => {
    if (isConnected) return;
    try {
      if (!retryLogged) {
        console.log(`🔌 Attempting MongoDB connection at ${mongoUri}...`);
      }
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      isConnected = true;
      console.log('✅ Connected to MongoDB successfully.');
      await seedDemoUser();
    } catch (err) {
      if (!retryLogged) {
        console.log('ℹ️ Local MongoDB not detected; running with resilient in-memory store.');
        console.log('ℹ️ (When you start MongoDB or run via Docker, backend will auto-connect).');
        retryLogged = true;
      }
      // Retry periodically in background quietly
      setTimeout(tryConnect, 15000);
    }
  };

  await tryConnect();
};

module.exports = connectDB;
