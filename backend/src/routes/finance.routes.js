import express from 'express';
import {
  addExpense,
  getExpenses,
  reviewExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expense.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorize('owner', 'accountant', 'manager', 'contractor'), addExpense)
  .get(getExpenses);

router.put('/:id/review', authorize('owner', 'manager'), reviewExpense);

router
  .route('/:id')
  .put(authorize('owner', 'accountant', 'manager', 'contractor'), updateExpense)
  .delete(authorize('owner', 'contractor'), deleteExpense);

export default router;
