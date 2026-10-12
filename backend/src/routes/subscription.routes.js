import express from 'express';
import {
  getSubscriptionStatus,
  renewSubscription,
  getPlans,
  submitSubscriptionPayment,
  getMyPayments,
  listAllPayments,
  approveSubscriptionPayment,
  rejectSubscriptionPayment,
} from '../controllers/subscription.controller.js';
import { protect, verifyAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Admin payment verification (must be before verifyAdmin checks)
router.get('/admin/payments', verifyAdmin, listAllPayments);
router.put('/admin/payments/:id/approve', verifyAdmin, approveSubscriptionPayment);
router.put('/admin/payments/:id/reject', verifyAdmin, rejectSubscriptionPayment);
router.post('/renew', verifyAdmin, renewSubscription);

// Company-facing
router.get('/plans', getPlans);
router.get('/status', getSubscriptionStatus);
router.get('/payments', getMyPayments);
router.post('/payment', submitSubscriptionPayment);

export default router;
