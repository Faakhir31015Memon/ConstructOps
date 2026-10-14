import { verifyToken } from '../config/jwt.js';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import { getCompanySubscriptionDetails } from '../utils/subscription.util.js';
import { revokeAllSessions } from '../utils/sessions.js';
import logger from '../utils/logger.js';

// Ensure JWT secret is accessible
try {
  verifyToken('probe');
} catch (err) {
  if (err.message?.includes('JWT_SECRET')) {
    console.error('❌ ' + err.message);
    process.exit(1);
  }
}

// Auth routes stay reachable even when the tenant is suspended — the user must be
// able to sign out, read their own profile, and fix their password.
const isAuthRoute = (url) => url.startsWith('/api/v1/auth');

export const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer')) {
    return res.status(401).json({ success: false, code: 'NO_TOKEN', message: 'Not authorized, no token' });
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message: expired ? 'Access token expired' : 'Not authorized, token failed',
    });
  }

  try {
    // System admin token carries no user id and never touches the database.
    if (decoded.role === 'admin') {
      req.user = {
        _id: 'admin_id_mock',
        name: 'System Admin',
        email: decoded.email,
        role: 'admin',
      };
      return next();
    }

    req.user = await User.findById(decoded.id).select('-password').populate('companyId');

    if (!req.user) {
      return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Not authorized, user not found' });
    }

    // Password change / ban bumps tokenVersion, which instantly voids issued tokens.
    if ((decoded.v ?? -1) !== (req.user.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'This session was ended. Please sign in again.',
      });
    }

    if (req.user.status === 'deactivated') {
      return res.status(403).json({ success: false, message: 'This account is deactivated. Contact your company admin.' });
    }

    // Check subscription status if user has a company
    if (req.user.companyId) {
      const subDetails = getCompanySubscriptionDetails(req.user.companyId);
      req.subscription = subDetails;

      if (subDetails.isExpired && req.user.status !== 'pending_payment') {
        // Sync database status
        if (req.user.companyId.subscriptionStatus !== 'expired') {
          await Company.findByIdAndUpdate(req.user.companyId._id, { subscriptionStatus: 'expired' });
        }
        if (req.user.status !== 'banned') {
          await User.findByIdAndUpdate(req.user._id, { status: 'banned' });
          req.user.status = 'banned';
        }

        // Allow subscription/auth routes so the user can check status and pay to reactivate
        const isSubscriptionRoute = isAuthRoute(req.originalUrl) || req.originalUrl.includes('/api/v1/subscription');
        if (!isSubscriptionRoute) {
          return res.status(403).json({
            success: false,
            subscriptionExpired: true,
            message: 'Your 15-day trial or plan has ended. Your account is temporarily suspended. Please submit a payment to reactivate your plan.',
            subscription: subDetails,
          });
        }
      }
    }

    // Payment submitted but not yet approved by admin: only subscription/auth routes allowed
    if (req.user.status === 'pending_payment') {
      const isAllowedRoute = isAuthRoute(req.originalUrl) || req.originalUrl.includes('/api/v1/subscription');
      if (!isAllowedRoute) {
        return res.status(403).json({
          success: false,
          paymentPending: true,
          message: 'Your payment is under verification. Access will be restored once the admin approves your payment.',
        });
      }
    }

    // Check if user is manually banned by admin (independent of subscription)
    if (req.user.status === 'banned' && !req.subscription?.isExpired) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated/banned by the System Admin.',
      });
    }

    next();
  } catch (error) {
    logger.error('Auth middleware failed', { error: error.message, path: req.originalUrl });
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Not authorized, token failed' });
  }
};

// Verify Admin Middleware
export const verifyAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer')) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }

  try {
    const decoded = verifyToken(header.split(' ')[1]);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
};

// Role restrictions helper
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role || 'Guest'}) is not authorized to access this resource`,
      });
    }
    next();
  };
};

/** Force a user's sessions dead — used when admin bans/deletes an account. */
export const killUserSessions = async (userId, reason) => {
  const count = await revokeAllSessions(userId, reason);
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }).catch(() => null);
  logger.info('User sessions killed', { userId, reason, sessions: count });
};
