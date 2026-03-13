// ============================================
// DATABASE CONFIGURATION
// MongoDB connection using Mongoose
// ============================================

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ handles these automatically
    });

    logger.success(`MongoDB connected successfully`, `Host: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Database Connection Error: ${error.message}`, error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;
