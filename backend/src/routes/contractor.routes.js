import express from 'express';
import {
  createContractor,
  getCompanyContractors,
  assignContractorToProject,
  revokeContractorAssignment,
  saveContract,
  getContractByProject,
  recordPayment,
  getPaymentsByProject,
} from '../controllers/contractor.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Contractor accounts & assignments
router
  .route('/')
  .post(authorize('owner', 'manager'), createContractor)
  .get(authorize('owner', 'manager'), getCompanyContractors);

router.post('/assign', authorize('owner', 'manager'), assignContractorToProject);
router.post('/revoke', authorize('owner', 'manager'), revokeContractorAssignment);

// Contracts
router.post('/contracts', authorize('owner', 'manager'), saveContract);
router.get('/contracts/:projectId', getContractByProject);

// Payments
router.post('/payments', authorize('owner', 'accountant'), recordPayment);
router.get('/payments/:projectId', getPaymentsByProject);

export default router;
