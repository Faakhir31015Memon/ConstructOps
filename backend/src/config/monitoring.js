import logger from '../utils/logger.js';

// Optional Sentry error tracking: enabled only when SENTRY_DSN is set, with a
// dynamic import so environments without it never load the SDK. No DSN → no-op.
let sentry = null;

export const initMonitoring = async () => {
  const dsn = (process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    logger.info('Error tracking off — set SENTRY_DSN to stream server errors to Sentry');
    return;
  }
  try {
    sentry = await import('@sentry/node');
    sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0,
    });
    logger.info('Sentry error tracking enabled');
  } catch (error) {
    logger.error('Sentry init failed — continuing without error tracking', { error: error.message });
    sentry = null;
  }
};

export const captureException = (error, extra = {}) => {
  if (!sentry) return;
  try {
    sentry.captureException(error, { extra });
  } catch {
    // Monitoring must never break the request path.
  }
};
