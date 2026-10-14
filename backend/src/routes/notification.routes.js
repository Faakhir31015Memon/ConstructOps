import express from 'express';
import { triggerDigest, saveDigestSettings, listDigestSettings } from '../controllers/notification.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/settings', listDigestSettings);
router.put('/settings', authorize('owner', 'manager', 'admin'), saveDigestSettings);
router.post('/digest', authorize('owner', 'manager', 'admin'), triggerDigest);

export default router;
