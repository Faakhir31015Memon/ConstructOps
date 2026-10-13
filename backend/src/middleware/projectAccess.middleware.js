import { sameId } from '../utils/ids.js';
import Project from '../models/project.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';

/**
 * Middleware: checkProjectAccess
 * Enforces company-level and contractor project-level security.
 *
 * Rules:
 * 1. Super Admin ('admin'): Full access to any project.
 * 2. Owner / Manager / Accountant: Full access to any project that belongs to their companyId.
 * 3. Contractor ('contractor'): Access ONLY to projects where they have an active assignment record.
 * 4. Any cross-company or unassigned contractor request is denied with 403/404.
 */
export const checkProjectAccess = (options = { requireOwner: false }) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // Super Admin bypass: Always full access
      if (user.role === 'admin') {
        const projectId = req.params.projectId || req.params.id || req.body.projectId || req.query.projectId;
        if (projectId) {
          const project = await Project.findById(projectId);
          if (project) {
            req.project = project;
          }
        }
        return next();
      }

      const projectId = req.params.projectId || req.params.id || req.body.projectId || req.query.projectId;

      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required' });
      }

      // Fetch the requested project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Strict Company check: user's company must match project's company
      if (!user.companyId || !sameId(project.companyId, user.companyId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Project does not belong to your company',
        });
      }

      // If the route strictly requires Owner / Manager (e.g., budget change, project deletion, contractor management)
      if (options.requireOwner && !['owner', 'manager'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only company owners or managers can perform this action',
        });
      }

      // Contractor check: Must be assigned to this specific project
      if (user.role === 'contractor') {
        const assignment = await ProjectAssignment.findOne({
          projectId: project._id,
          contractorId: user._id,
          status: 'active',
        });

        if (!assignment) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not assigned to this project',
          });
        }

        req.projectAssignment = assignment;
      }

      // Attach project to request
      req.project = project;
      next();
    } catch (error) {
      console.error('Project access verification error:', error);
      res.status(500).json({ success: false, message: 'Server authorization error: ' + error.message });
    }
  };
};

/**
 * Middleware: requireOwnerOrManager
 * Restricts route to company owners/managers (or Super Admin)
 */
export const requireOwnerOrManager = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'owner' || req.user?.role === 'manager') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Owner or Manager privileges required',
  });
};
