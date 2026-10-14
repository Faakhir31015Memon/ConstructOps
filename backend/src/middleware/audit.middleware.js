import mongoose from 'mongoose';
import AuditEvent from '../models/auditEvent.model.js';
import logger from '../utils/logger.js';

const ACTIONS = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
const OBJECT_ID = /^[0-9a-f]{24}$/i;

// Credential traffic is noisy and sometimes anonymous; these still get logged.
const AUDITED_AUTH = ['/auth/password', '/auth/reset-password', '/auth/forgot-password', '/auth/logout'];

/**
 * turns "/api/v1/workers/64f.../attendance/check-in" into
 * { resourceType: 'workers', resourceId: '64f...', action: 'workers:check-in' }
 */
const describe = (path) => {
  const segments = path.split('?')[0].replace(/^\/api\/v1\//, '').split('/').filter(Boolean);
  const [resourceType = 'unknown', ...rest] = segments;
  const resourceId = rest.find((s) => OBJECT_ID.test(s)) || '';
  const verb = rest.filter((s) => !OBJECT_ID.test(s));
  return { resourceType, resourceId, verb };
};

/**
 * Records every successful state-changing request. Runs globally, so it must stay
 * cheap and must never affect the response — the audit write is fire-and-forget.
 */
export const auditTrail = () => (req, res, next) => {
  const action = ACTIONS[req.method];
  const isAuthFlow = AUDITED_AUTH.some((p) => req.originalUrl.startsWith(`/api/v1${p}`));
  if (!action || (req.originalUrl.startsWith('/api/v1/auth') && !isAuthFlow)) return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      const { resourceType, resourceId, verb } = describe(req.originalUrl);
      const companyId = req.user?.companyId?._id || req.user?.companyId || null;
      const event = {
        companyId: companyId && mongoose.isValidObjectId(companyId) ? companyId : undefined,
        actorId: String(req.user?._id || 'anonymous'),
        actorName: req.user?.name || req.user?.email || 'Anonymous',
        actorRole: req.user?.role || 'guest',
        action: `${resourceType}:${verb.length ? verb.join('.') : action}`,
        resourceType,
        resourceId,
        method: req.method,
        path: req.originalUrl.slice(0, 300),
        statusCode: res.statusCode,
        ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '',
        userAgent: (req.headers['user-agent'] || '').slice(0, 200),
      };
      AuditEvent.create(event).catch((err) => logger.warn('audit write failed', { error: err.message }));
    }
    return originalJson(body);
  };

  next();
};

export default auditTrail;
