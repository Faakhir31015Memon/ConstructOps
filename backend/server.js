import './src/config/env.js';

import mongoose from 'mongoose';
import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Connect to database
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown so in-flight requests finish and Mongo connections close cleanly.
const shutdown = (signal) => {
  console.log(`${signal} received — shutting down gracefully...`);
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