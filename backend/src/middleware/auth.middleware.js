import getSecret from '../config/jwt.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import { getCompanySubscriptionDetails } from '../utils/subscription.util.js';

// Ensure JWT secret is accessible
try {
  getSecret();
} catch (err) {
  console.error('❌ ' + err.message);
  process.exit(1);
}

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, getSecret());

      // Check if it's the admin role
      if (decoded.role === 'admin') {
        req.user = {
          _id: 'admin_id_mock',
          name: 'System Admin',
          email: decoded.email,
          role: 'admin',
        };
        return next();
      }

      // Get user from the token, excluding password, and populate company
      req.user = await User.findById(decoded.id).select('-password').populate('companyId');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // Check subscription status if user has a company
      if (req.user.companyId) {
        const subDetails = getCompanySubscriptionDetails(req.user.companyId);
        req.subscription = subDetails;

        if (subDetails.isExpired) {
          // Sync database status
          if (req.user.companyId.subscriptionStatus !== 'expired') {
            await Company.findByIdAndUpdate(req.user.companyId._id, { subscriptionStatus: 'expired' });
          }
          if (req.user.status !== 'banned') {
            await User.findByIdAndUpdate(req.user._id, { status: 'banned' });
          }

          // Allow subscription routes to execute so user can check status and renew/reactivate
          const isSubscriptionRoute = req.originalUrl.includes('/api/v1/subscription') || req.originalUrl.includes('/api/v1/auth/me');
          if (!isSubscriptionRoute) {
            return res.status(403).json({
              success: false,
              subscriptionExpired: true,
              message: 'Your 15-day trial or plan has ended. Your account is temporarily suspended. Please reactivate your plan to restore access.',
              subscription: subDetails,
            });
          }
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
      console.error('Auth middleware token verification failed:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Verify Admin Middleware
export const verifyAdmin = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, getSecret());

      if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
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
