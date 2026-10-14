import express from 'express';
import { getCompanyActivation, getAdminActivation } from '../controllers/metrics.controller.js';
import { protect, verifyAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/activation', getCompanyActivation);
router.get('/funnel', verifyAdmin, getAdminActivation);

export default router;
