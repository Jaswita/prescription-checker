// ============================================
// SECURE PRESCRIPTION VERIFICATION SYSTEM
// Main Server Entry Point
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/logger');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Sets various HTTP headers for security
app.use(helmet());

// CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate Limiting - Prevents brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body Parser
app.use(express.json({ limit: '10kb' })); // Limit body size for security
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use(requestLogger);

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.success(`SecureRx server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API: http://localhost:${PORT}/api`);
  logger.info(`Health: http://localhost:${PORT}/health`);
});

module.exports = app;
