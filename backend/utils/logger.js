// ============================================
// LOGGING UTILITY
// Handles all backend logging to console and files
// ============================================

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  INFO: 'INFO',
  ERROR: 'ERROR',
  WARN: 'WARN',
  DEBUG: 'DEBUG',
  SUCCESS: 'SUCCESS'
};

// Color codes for console output
const COLORS = {
  INFO: '\x1b[36m',    // Cyan
  ERROR: '\x1b[31m',   // Red
  WARN: '\x1b[33m',    // Yellow
  DEBUG: '\x1b[35m',   // Magenta
  SUCCESS: '\x1b[32m', // Green
  RESET: '\x1b[0m'     // Reset
};

/**
 * Format timestamp in ISO format
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Get log file path (single file, continuous append)
 */
function getLogFilePath() {
  return path.join(logsDir, 'backend.log');
}

/**
 * Format log message
 */
function formatMessage(level, message, stack = '') {
  const timestamp = getTimestamp();
  let formattedMsg = `[${timestamp}] [${level}] ${message}`;
  
  if (stack) {
    formattedMsg += `\n${stack}`;
  }
  
  return formattedMsg;
}

/**
 * Write to file
 */
function writeToFile(level, message, stack = '') {
  try {
    const formattedMsg = formatMessage(level, message, stack);
    
    // Write to single backend.log file
    const logFilePath = getLogFilePath();
    fs.appendFileSync(logFilePath, formattedMsg + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Main logger object
 */
const logger = {
  info: (message, meta = '') => {
    const fullMessage = meta ? `${message} | ${meta}` : message;
    console.log(`${COLORS.INFO}[${getTimestamp()}] [${LOG_LEVELS.INFO}] ${fullMessage}${COLORS.RESET}`);
    writeToFile(LOG_LEVELS.INFO, fullMessage);
  },

  error: (message, stack = '') => {
    console.error(`${COLORS.ERROR}[${getTimestamp()}] [${LOG_LEVELS.ERROR}] ${message}${COLORS.RESET}`);
    if (stack) {
      console.error(`${COLORS.ERROR}${stack}${COLORS.RESET}`);
    }
    writeToFile(LOG_LEVELS.ERROR, message, stack);
  },

  warn: (message, meta = '') => {
    const fullMessage = meta ? `${message} | ${meta}` : message;
    console.warn(`${COLORS.WARN}[${getTimestamp()}] [${LOG_LEVELS.WARN}] ${fullMessage}${COLORS.RESET}`);
    writeToFile(LOG_LEVELS.WARN, fullMessage);
  },

  debug: (message, meta = '') => {
    const fullMessage = meta ? `${message} | ${meta}` : message;
    // Only log debug to file in development, not to console
    if (process.env.NODE_ENV === 'development') {
      writeToFile(LOG_LEVELS.DEBUG, fullMessage);
    }
  },

  success: (message, meta = '') => {
    const fullMessage = meta ? `${message} | ${meta}` : message;
    console.log(`${COLORS.SUCCESS}[${getTimestamp()}] [${LOG_LEVELS.SUCCESS}] ${fullMessage}${COLORS.RESET}`);
    writeToFile(LOG_LEVELS.INFO, `[SUCCESS] ${fullMessage}`);
  },

  // Log API requests
  request: (method, path, ip = '') => {
    const message = `${method} ${path}${ip ? ` from ${ip}` : ''}`;
    logger.debug(`Request received: ${message}`);
  },

  // Log API responses
  response: (method, path, statusCode, duration = '') => {
    const message = `${method} ${path} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`;
    logger.debug(`Response sent: ${message}`);
  },

  // Log database operations
  database: (operation, collection, status) => {
    const message = `Database ${operation} on ${collection}: ${status}`;
    if (status === 'success') {
      logger.success(message);
    } else {
      logger.error(message);
    }
  },

  // Log authentication events
  auth: (event, user, status = 'success') => {
    const message = `Auth ${event} by user ${user}: ${status}`;
    if (status === 'success') {
      logger.success(message);
    } else {
      logger.warn(message);
    }
  },

  // Log audit events
  audit: (action, userId, resource = '', details = '') => {
    const message = `Audit log created: ${action} by user ${userId}${resource ? ` on ${resource}` : ''}`;
    logger.success(message, details);
  }
};

module.exports = logger;
