// server.js - Add this at the VERY TOP before everything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/config');
const notificationService = require('./services/notificationService');

// Route imports
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');

const app = express();
const server = http.createServer(app);

// Default allowed origins
const defaultOrigins = [
  'https://doccrm-2.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: defaultOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
});

// Initialize notification service with socket.io
notificationService.initSocket(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected to Socket.IO:', socket.id);

  socket.on('join_doctor_room', () => {
    socket.join('doctor_notifications');
    console.log('👨‍⚕️ Doctor joined notification room:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected from Socket.IO:', socket.id);
  });
});

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
  .concat(defaultOrigins);

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (uniqueOrigins.indexOf(origin) === -1) {
      console.warn('⚠️ CORS blocked request from:', origin);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB with improved error handling
const connectWithRetry = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📊 MongoDB URI:', config.mongoUri ? 'Configured ✅' : 'Not configured ❌');
    
    if (!config.mongoUri) {
      throw new Error('MongoDB URI is not configured. Check your .env file.');
    }
    
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
    });
    
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', {
      message: error.message,
      code: error.code,
      reason: error.reason?.type || 'Unknown'
    });
    
    console.log('🔄 Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB: Connected and ready');
});

mongoose.connection.on('error', (err) => {
  console.error('📡 MongoDB: Connection error -', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 MongoDB: Disconnected. Will attempt to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('📡 MongoDB: Reconnected successfully');
});

// Start MongoDB connection
connectWithRetry();

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Notification routes
app.get('/api/notifications', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const notifications = await notificationService.getNotifications(parseInt(limit), parseInt(offset));
    const unreadCount = await notificationService.getUnreadCount();
    
    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    await notificationService.markAllAsRead();
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[mongoStatus] || 'unknown';

  res.json({
    status: mongoStatus === 1 ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: {
        status: mongoStatusText,
        connected: mongoStatus === 1
      },
      socketio: {
        status: 'running',
        clients: io.engine.clientsCount
      },
      calendly: {
        configured: !!config.calendly?.apiKey
      },
      email: {
        configured: !!config.email?.user
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Doctor CRM API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      public: '/api/public',
      auth: '/api/auth',
      patients: '/api/patients',
      appointments: '/api/appointments',
      notifications: '/api/notifications',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ API Error occurred:', {
    message: error.message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = config.port || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB URI: ${config.mongoUri ? 'Configured ✅' : 'Not configured ❌'}`);
  console.log(`📅 Calendly API Key: ${config.calendly?.apiKey ? 'Configured ✅' : 'Not configured ❌'}`);
  console.log(`📧 Email configured: ${config.email?.user ? 'Yes ✅' : 'No ❌'}`);
  console.log(`🔑 JWT Secret: ${config.jwtSecret ? 'Configured ✅' : 'Not configured ❌'}`);
  console.log(`🔔 Socket.IO: Running ✅`);
  console.log(`🔗 API Documentation: http://localhost:${PORT}/`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📡 ${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('🛑 HTTP server closed');
    
    mongoose.connection.close(() => {
      console.log('🛑 MongoDB connection closed');
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });
  });
  
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;