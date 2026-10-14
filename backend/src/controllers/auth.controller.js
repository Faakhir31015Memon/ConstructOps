import crypto from 'crypto';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import {
  issueSession,
  rotateSession,
  revokeRawToken,
  revokeAllSessions,
  hashToken,
} from '../utils/sessions.js';
import { signAdminToken } from '../config/jwt.js';
import { getCompanySubscriptionDetails } from '../utils/subscription.util.js';
import { LANGUAGE_CODES, DEFAULT_LANGUAGE } from '../config/languages.js';
import { sendMail, passwordResetEmail } from '../services/mail.service.js';
import serverError from '../utils/serverError.js';
import logger from '../utils/logger.js';

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters long and include letters and numbers';
const RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);

const safeCompare = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Admin login is configured only via env vars; absent config disables it entirely.
const verifyAdminCredentials = (normalizedEmail, password) => {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (!adminEmail || !adminPassword) return false;
  return normalizedEmail === adminEmail && safeCompare(password, adminPassword);
};

const publicUser = (user, company) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  companyId: company?._id || user.companyId?._id || user.companyId || null,
  companyName: company?.name || null,
  status: user.status,
  language: user.language,
  subscription: company ? getCompanySubscriptionDetails(company) : null,
});

const authResponse = (user, company, session) => ({
  success: true,
  token: session.token,
  refreshToken: session.refreshToken,
  user: publicUser(user, company),
});

// @desc    Register a new user and company (with 15-day free trial)
// @route   POST /api/v1/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password, companyName, language } = req.body;

  try {
    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password, companyName) are required' });
    }

    if (!PASSWORD_POLICY.test(password)) {
      return res.status(400).json({ success: false, message: PASSWORD_POLICY_MESSAGE });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create Company first with 15-day free trial
    const trialDays = 15;
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const company = await Company.create({
      name: String(companyName).trim().slice(0, 120),
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
      email: normalizedEmail,
      password,
      role: 'owner', // Default role for registering user is owner
      companyId: company._id,
      status: 'active',
      language: LANGUAGE_CODES.includes(language) ? language : DEFAULT_LANGUAGE,
      lastLoginAt: now,
    });

    const session = await issueSession(user, { req });
    res.status(201).json(authResponse(user, company, session));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    serverError(res, error, req, { stage: 'register' });
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

    const normalizedEmail = String(email).trim().toLowerCase();

    // Direct Admin login support via regular login route
    if (verifyAdminCredentials(normalizedEmail, password)) {
      return res.json({
        success: true,
        token: signAdminToken(normalizedEmail),
        // The admin has no tenant, so no refresh session — they sign in again every few hours.
        refreshToken: null,
        user: { email: normalizedEmail, name: 'System Admin', role: 'admin' },
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate('companyId');

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

    if (user.status === 'deactivated') {
      return res.status(403).json({ success: false, message: 'This account is deactivated. Contact your company admin.' });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const session = await issueSession(user, { req });
    res.json(authResponse(user, user.companyId, session));
  } catch (error) {
    serverError(res, error, req, { stage: 'login' });
  }
};

// @desc    Exchange a refresh token for a fresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
export const refreshSession = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.length > 200) {
      return res.status(400).json({ success: false, code: 'REFRESH_TOKEN_REQUIRED', message: 'Refresh token is required' });
    }

    const result = await rotateSession(refreshToken, req);
    if (result.error) {
      return res.status(401).json({
        success: false,
        code: result.error,
        message: 'Your session has ended. Please sign in again.',
      });
    }

    res.json({
      success: true,
      token: result.session.token,
      refreshToken: result.session.refreshToken,
      user: publicUser(result.user, result.user.companyId),
    });
  } catch (error) {
    serverError(res, error, req, { stage: 'refresh' });
  }
};

// @desc    End the current session
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    const { refreshToken, allDevices } = req.body;
    if (allDevices) {
      await revokeAllSessions(req.user._id, 'logout-all');
    } else {
      await revokeRawToken(refreshToken);
    }
    res.json({ success: true, message: 'Signed out' });
  } catch (error) {
    serverError(res, error, req, { stage: 'logout' });
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('companyId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: publicUser(user, user.companyId) });
  } catch (error) {
    serverError(res, error, req, { stage: 'getMe' });
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
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { language }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, language: user.language });
  } catch (error) {
    serverError(res, error, req, { stage: 'updateLanguage' });
  }
};

// @desc    Start a password reset (same answer whether or not the account exists)
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const genericMessage = 'If an account exists for that email, a reset link has been sent. The link works once and expires shortly.';
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString('base64url');
    user.resetTokenHash = hashToken(rawToken);
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const clientBase = (process.env.APP_CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')[0]
      .trim();
    const resetUrl = `${clientBase}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const mailResult = await sendMail({
      to: normalizedEmail,
      ...passwordResetEmail(user.name, resetUrl, RESET_TTL_MINUTES),
    });

    logger.info('Password reset requested', { userId: String(user._id), delivered: mailResult.delivered });

    // Outside production there is usually no SMTP account configured, so the link is
    // returned to the caller for testing. It is never included in a production response.
    const devFallback = process.env.NODE_ENV !== 'production' && !mailResult.delivered
      ? { resetUrl, note: 'Email delivery is not configured in this environment; use this link to finish the reset.' }
      : {};

    res.json({ success: true, message: genericMessage, ...devFallback });
  } catch (error) {
    serverError(res, error, req, { stage: 'forgot-password' });
  }
};

// @desc    Complete a password reset
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (!PASSWORD_POLICY.test(password)) {
      return res.status(400).json({ success: false, message: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findOne({
      resetTokenHash: hashToken(String(token)),
      resetTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired. Please request a new one.' });
    }
    if (user.status === 'banned' || user.status === 'deactivated') {
      return res.status(403).json({ success: false, message: 'This account is not active. Contact ConstructOps support.' });
    }

    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await user.save();

    const revoked = await revokeAllSessions(user._id, 'password-reset');
    logger.info('Password reset completed', { userId: String(user._id), revokedSessions: revoked });

    res.json({ success: true, message: 'Password updated. Please sign in with your new password.' });
  } catch (error) {
    serverError(res, error, req, { stage: 'reset-password' });
  }
};

// @desc    Change password while signed in
// @route   PATCH /api/v1/auth/password
// @access  Private
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (!PASSWORD_POLICY.test(newPassword)) {
      return res.status(400).json({ success: false, message: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await user.save();

    // Every other device must sign in again with the new password.
    await revokeAllSessions(user._id, 'password-change');

    res.json({ success: true, message: 'Password changed successfully. Please sign in again.' });
  } catch (error) {
    serverError(res, error, req, { stage: 'change-password' });
  }
};

// @desc    Admin authentication & login
// @route   POST /api/v1/auth/admin/login
// @access  Public
export const adminLogin = (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (verifyAdminCredentials(normalizedEmail, password)) {
    return res.json({
      success: true,
      token: signAdminToken(normalizedEmail),
      refreshToken: null,
      user: { email: normalizedEmail, name: 'System Admin', role: 'admin' },
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
};
