import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectDashboard,
} from '../controllers/project.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { checkProjectAccess } from '../middleware/projectAccess.middleware.js';
import { limitProjects } from '../middleware/planLimit.middleware.js';

const router = express.Router();

router.use(protect);

// Gate every /:id... request (incl. /:id/dashboard) on company + assignment checks
router.use('/:id', checkProjectAccess());

router
  .route('/')
  .post(authorize('owner', 'manager'), limitProjects, createProject)
  .get(getProjects);

router
  .route('/:id')
  .get(getProjectById)
  .put(authorize('owner', 'manager'), updateProject)
  .delete(authorize('owner'), deleteProject);

router.get('/:id/dashboard', getProjectDashboard);

export default router;
