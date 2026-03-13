// ============================================
// REQUEST LOGGING MIDDLEWARE
// Logs all incoming requests and outgoing responses
// ============================================

const logger = require('../utils/logger');

/**
 * Middleware to log incoming requests
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Skip logging health checks and public endpoints to reduce noise
  if (req.path === '/api/health' || req.path === '/') {
    return next();
  }
  
  // Log the incoming request (only log to file, not console to avoid duplication)
  const clientIP = req.ip || req.connection.remoteAddress;
  logger.debug(`API Request: ${req.method} ${req.path}`, `IP: ${clientIP}`);

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Only log API responses, not health checks
    if (req.path !== '/api/health') {
      logger.debug(`API Response: ${req.method} ${req.path} - ${res.statusCode}`, `Duration: ${duration}ms`);
    }
    
    return originalJson.call(this, data);
  };

  next();
};

module.exports = requestLogger;
