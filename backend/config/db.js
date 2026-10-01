const mongoose = require('mongoose');
const User = require('../models/User');

let isConnected = false;

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
    console.warn('⚠️ Demo user seed notice:', err.message);
  }
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/energy';

  const tryConnect = async () => {
    try {
      console.log(`🔌 Connecting to MongoDB at ${mongoUri}...`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
      });
      isConnected = true;
      console.log('✅ Connected to MongoDB successfully.');
      await seedDemoUser();
    } catch (err) {
      console.warn(`⚠️ MongoDB connection notice: ${err.message}`);
      console.log('ℹ️ Backend will retry MongoDB connection in the background.');
      setTimeout(tryConnect, 5000);
    }
  };

  await tryConnect();
};

module.exports = connectDB;
