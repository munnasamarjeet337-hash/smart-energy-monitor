require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const { initMqttSubscriber } = require('./mqtt/subscriber');
const { initSocketHandler } = require('./socket/socketHandler');
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://127.0.0.1:5173', 'http://localhost:5173', '*'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://127.0.0.1:5173', 'http://localhost:5173', '*'],
  credentials: true
}));
app.use(express.json());

// Request logging middleware (compact)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`📡 [${new Date().toISOString().substring(11, 19)}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'Smart Energy Monitor Backend'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api', historyRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start HTTP server immediately
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Smart Energy Monitor Backend running on port ${PORT}`);
  console.log(`🌐 REST API: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  console.log(`👤 Demo Account: demo@demo.com / demo123`);
  console.log(`====================================================`);

  // Initialize Socket.IO Handler
  initSocketHandler(io);

  // Initialize MQTT Subscriber
  initMqttSubscriber(io).catch(err => {
    console.warn('⚠️ MQTT Subscriber initialization notice:', err.message);
  });

  // Connect to Database asynchronously
  connectDB().catch(err => {
    console.warn('⚠️ Database connection notice:', err.message);
  });
});
