import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

// @desc    Register a new user and company
// @route   POST /api/v1/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password, companyName } = req.body;

  try {
    // Basic validation – all fields required
    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password, companyName) are required' });
    }

    // Enforce password policy: minimum 8 characters, at least one letter and one number
    const passwordPolicy = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordPolicy.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and include letters and numbers' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create Company first
    const company = await Company.create({
      name: companyName,
      subscriptionPlan: 'pro',
    });

    // Create Owner user linked to company
    const user = await User.create({
      name,
      email,
      password,
      role: 'owner', // Default role for registering user is owner
      companyId: company._id,
    });

    if (user) {
      res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          companyName: company.name,
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).populate('companyId');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated/banned by the System Admin.' });
    }

    if (await user.comparePassword(password)) {
      res.json({
        success: true,
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId?._id,
          companyName: user.companyId?.name,
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('companyId');
    if (user) {
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId?._id,
          companyName: user.companyId?.name,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Admin authentication & login
// @route   POST /api/v1/auth/admin/login
// @access  Public
export const adminLogin = (req, res) => {
  const { email, password } = req.body;

  const ADMIN_EMAIL = 'constops@admin.com';
  const ADMIN_PASSWORD = 'constops@access.com';

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { role: 'admin', email },
      process.env.JWT_SECRET || 'constructops_super_secure_jwt_secret_key_2026_dev',
      { expiresIn: '1d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        email,
        name: 'System Admin',
        role: 'admin',
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials',
  });
};
