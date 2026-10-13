import getSecret from '../config/jwt.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import { getCompanySubscriptionDetails } from '../utils/subscription.util.js';
import { LANGUAGE_CODES, DEFAULT_LANGUAGE } from '../config/languages.js';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, getSecret(), {
    expiresIn: '7d',
  });
};

// @desc    Register a new user and company (with 15-day free trial)
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

    // Create Company first with 15-day free trial
    const trialDays = 15;
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const company = await Company.create({
      name: companyName,
      subscriptionPlan: 'trial',
      subscriptionStatus: 'active',
      subscriptionStartDate: now,
      subscriptionEndDate: trialEndDate,
      trialStartDate: now,
      trialEndDate: trialEndDate,
      isTrial: true,
    });

    // Create Owner user linked to company
    const user = await User.create({
      name,
      email,
      password,
      role: 'owner', // Default role for registering user is owner
      companyId: company._id,
      status: 'active',
    });

    const subscription = getCompanySubscriptionDetails(company);

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
          status: user.status,
          language: user.language,
          subscription,
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

    // Verify password first
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // If payment submitted but not yet approved by admin, block login
    if (user.status === 'pending_payment') {
      return res.status(403).json({
        success: false,
        paymentPending: true,
        message: 'Your payment is under verification. You will be able to log in once the admin approves your payment.',
      });
    }

    // Check subscription details
    let subscription = null;
    if (user.companyId) {
      subscription = getCompanySubscriptionDetails(user.companyId);
      if (subscription.isExpired) {
        // Mark company as expired and user banned if not already
        if (user.companyId.subscriptionStatus !== 'expired') {
          user.companyId.subscriptionStatus = 'expired';
          await user.companyId.save();
        }
        if (user.status !== 'banned') {
          user.status = 'banned';
          await user.save();
        }
      }
    }

    // If banned by admin and NOT due to plan expiration, block completely
    if (user.status === 'banned' && (!subscription || !subscription.isExpired)) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated/banned by the System Admin.' });
    }

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
        status: user.status,
        language: user.language,
        subscription,
      },
    });
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
      const subscription = user.companyId ? getCompanySubscriptionDetails(user.companyId) : null;
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId?._id,
          companyName: user.companyId?.name,
          status: user.status,
          language: user.language,
          subscription,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Save the interface/assistant language for the signed-in user
// @route   PATCH /api/v1/auth/language
// @access  Private
export const updateLanguage = async (req, res) => {
  const { language } = req.body;
  if (!LANGUAGE_CODES.includes(language)) {
    return res.status(400).json({ success: false, message: `language must be one of: ${LANGUAGE_CODES.join(', ')}` });
  }
  const user = await User.findByIdAndUpdate(req.user._id, { language }, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, language: user.language });
};

// @desc    Admin authentication & login
// @route   POST /api/v1/auth/admin/login
// @access  Public
export const adminLogin = (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = (email || '').trim().toLowerCase();
  const ADMIN_EMAIL = 'constops@admin.com';
  const validPasswords = ['constops@access.com', 'ConstOps@access.com'];

  if (normalizedEmail === ADMIN_EMAIL && validPasswords.includes(password)) {
    const token = jwt.sign(
      { role: 'admin', email: ADMIN_EMAIL },
      getSecret(),
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
