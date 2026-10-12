import express from 'express';
import { getSubscriptionStatus, renewSubscription } from '../controllers/subscription.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/status', getSubscriptionStatus);
router.post('/renew', renewSubscription);

export default router;
