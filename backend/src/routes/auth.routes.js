import express from 'express';
import { registerUser, loginUser, getMe, adminLogin, updateLanguage } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/admin/login', loginLimiter, adminLogin);
router.get('/me', protect, getMe);
router.patch('/language', protect, updateLanguage);

export default router;
