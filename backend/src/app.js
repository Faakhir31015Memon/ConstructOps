import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Import Route Handlers
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import workerRoutes from './routes/worker.routes.js';
import materialRoutes from './routes/material.routes.js';
import financeRoutes from './routes/finance.routes.js';
import reportRoutes from './routes/report.routes.js';
import alertRoutes from './routes/alert.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js';
import contractorRoutes from './routes/contractor.routes.js';
import exportRoutes from './routes/export.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import billingRoutes from './routes/billing.routes.js';
import assistantRoutes from './routes/assistant.routes.js';

dotenv.config();

const app = express();

// Middlewares
// CORS is limited to origins listed in CORS_ORIGIN (comma separated).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server) with no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS blocked for this origin'));
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Keep the exact raw body for webhook signature verification (payment gateway HMAC).
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Base Route
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'ConstructOps API is online',
    timestamp: new Date(),
  });
});

// A serverless invocation is fresh per cold start, so the connection opens on the
// first request that needs it rather than at module load.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Bind API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/expenses', financeRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/contractors', contractorRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/assistant', assistantRoutes);

// Error Handling Middleware
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.message === 'CORS blocked for this origin') {
    return res.status(403).json({ success: false, message: 'This origin is not allowed to access the API' });
  }
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

export default app;
