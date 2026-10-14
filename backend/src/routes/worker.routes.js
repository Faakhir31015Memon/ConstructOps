import express from 'express';
import {
  addWorker,
  getWorkers,
  updateWorker,
  deleteWorker,
  checkInAttendance,
  getAttendance,
  getPayroll,
  bulkCheckInAttendance,
} from '../controllers/worker.controller.js';
import { payrollStatement } from '../controllers/invoice.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Worker Profiles
router
  .route('/')
  .post(authorize('owner', 'manager', 'contractor'), addWorker)
  .get(getWorkers);

// Payroll (declared before /:id so the literal paths are not swallowed)
router.get('/payroll', authorize('owner', 'manager', 'accountant'), getPayroll);
router.get('/payroll/invoice', authorize('owner', 'manager', 'accountant'), payrollStatement);

router
  .route('/:id')
  .put(authorize('owner', 'manager', 'contractor'), updateWorker)
  .delete(authorize('owner', 'manager', 'contractor'), deleteWorker);

// Attendance sheets
router.post('/attendance/check-in', authorize('owner', 'manager', 'contractor'), checkInAttendance);
// Offline site app replays its queue through this idempotent bulk route.
router.post('/attendance/bulk', authorize('owner', 'manager', 'contractor'), bulkCheckInAttendance);
router.get('/attendance', getAttendance);

export default router;
