import express from 'express';
import {
  registerUser,
  loginUser,
  refreshSession,
  logout,
  getMe,
  adminLogin,
  updateLanguage,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loginLimiter, registerLimiter, resetRequestLimiter, refreshLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/admin/login', loginLimiter, adminLogin);
router.post('/refresh', refreshLimiter, refreshSession);
router.post('/logout', protect, logout);
router.post('/forgot-password', resetRequestLimiter, requestPasswordReset);
router.post('/reset-password', resetRequestLimiter, resetPassword);
router.patch('/password', protect, changePassword);
router.get('/me', protect, getMe);
router.patch('/language', protect, updateLanguage);

export default router;
