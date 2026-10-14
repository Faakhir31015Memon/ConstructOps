import express from 'express';
import { getAuditEvents } from '../controllers/audit.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize('owner', 'admin'), getAuditEvents);

export default router;
