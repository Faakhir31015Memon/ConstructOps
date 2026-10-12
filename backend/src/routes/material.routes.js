import express from 'express';
import {
  addMaterial,
  getMaterials,
  logMaterialTransaction,
  getMaterialLogs,
} from '../controllers/material.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(authorize('owner', 'manager'), addMaterial)
  .get(getMaterials);

router.post('/log', authorize('owner', 'manager', 'contractor'), logMaterialTransaction);
router.get('/logs', getMaterialLogs);

export default router;
