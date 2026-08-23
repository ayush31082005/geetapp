import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import { initDatabase } from './config/db.js';

// Load environment variables
dotenv.config();

// Global Process Error Handlers
process.on('uncaughtException', (err) => {
  console.error('💥 [UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [UNHANDLED REJECTION]:', reason);
});

const app = express();
const PORT = Number(process.env.PORT) || 1000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'GeetPay Backend API',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Root information endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GeetPay Backend API',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      sendOtp: 'POST /api/auth/send-otp',
      verifyOtp: 'POST /api/auth/verify-otp',
      profile: 'GET /api/auth/me',
      dashboard: 'GET /api/loans/dashboard?mobile=...',
      health: 'GET /health',
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled express route error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n' + '🚀'.repeat(25));
  console.log(`⚡ GeetPay Backend Server is running on Port: ${PORT}`);
  console.log(`📡 Local URL   : http://localhost:${PORT}`);
  console.log(`🌐 Network URL : http://0.0.0.0:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/health`);
  console.log('🚀'.repeat(25) + '\n');

  // Initialize DB tables
  await initDatabase();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [PORT BUSY] Port ${PORT} is currently in use by another process.`);
    console.error(`👉 Please kill the existing process or change PORT in .env\n`);
  } else {
    console.error('Server error:', err);
  }
});
