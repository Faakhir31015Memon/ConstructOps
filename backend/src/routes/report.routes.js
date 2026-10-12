import express from 'express';
import {
  createReport,
  getReports,
  deleteReport,
} from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorize('owner', 'manager', 'contractor'), createReport)
  .get(getReports);

router.route('/:id').delete(authorize('owner'), deleteReport);

export default router;
