import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Ensure JWT secret is defined; abort if missing
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is not set. Exiting.');
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

      // Get user from the token, excluding password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
