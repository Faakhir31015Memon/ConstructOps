import './src/config/env.js';

import mongoose from 'mongoose';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { startDigestScheduler } from './src/services/digestScheduler.service.js';
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
});

// Connect to database
connectDB().then(() => {
  startDigestScheduler();
}).catch(err => {
  logger.error('Failed to connect to MongoDB', { error: err.message });
});

const server = app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Graceful shutdown so in-flight requests finish and Mongo connections close cleanly.
const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;