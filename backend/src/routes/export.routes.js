import express from 'express';
import { exportProjectReport, exportCompanyReport } from '../controllers/export.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { checkProjectAccess } from '../middleware/projectAccess.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/projects/:id/:format', checkProjectAccess(), exportProjectReport);
router.get('/company/:format', exportCompanyReport);

export default router;
