import './src/config/env.js';

import mongoose from 'mongoose';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { startDigestScheduler } from './src/services/digestScheduler.service.js';
import startBackupScheduler from './src/services/backupScheduler.service.js';
import { warnGatewayConfig } from './src/services/paymentGateway.service.js';
import { initMonitoring, captureException } from './src/config/monitoring.js';
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 5000;

await initMonitoring();
warnGatewayConfig();

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  captureException(err, { type: 'uncaughtException' });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error('Unhandled Rejection', { reason: message });
  if (reason instanceof Error) captureException(reason, { type: 'unhandledRejection' });
});

// Connect to database
connectDB().then(() => {
  startDigestScheduler();
  startBackupScheduler();
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