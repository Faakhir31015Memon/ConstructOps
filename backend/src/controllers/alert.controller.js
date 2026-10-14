import Alert from '../models/alert.model.js';
import Project from '../models/project.model.js';
import { toObjectId } from '../middleware/sanitize.middleware.js';
import serverError from '../utils/serverError.js';

// @desc    Get alerts list (scoped to project, company, or global admin)
// @route   GET /api/v1/alerts
// @access  Private
export const getAlerts = async (req, res) => {
  const { projectId } = req.query;

  try {
    let query = {};
    if (projectId) {
      const projectObjectId = toObjectId(projectId);
      if (!projectObjectId) {
        return res.status(400).json({ success: false, message: 'Invalid projectId' });
      }
      // Verify project belongs to user's company
      const project = await Project.findOne({
        _id: projectObjectId,
        ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
      });
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
      }

      query.projectId = projectObjectId;
    } else {
      // Global notification check
      if (req.user.role !== 'admin') {
        // Fetch projects matching user's company
        const companyProjects = await Project.find({ companyId: req.user.companyId });
        const projectIds = companyProjects.map(p => p._id);
        query.projectId = { $in: projectIds };
      }
    }

    const alerts = await Alert.find(query)
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, alerts });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    Mark warning alert as read
// @route   PUT /api/v1/alerts/:id/read
// @access  Private
export const markAlertRead = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Verify alert project belongs to user's company
    const project = await Project.findOne({
      _id: alert.projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this alert' });
    }

    alert.isRead = true;
    await alert.save();

    res.json({ success: true, alert });
  } catch (error) {
    serverError(res, error, req);
  }
};
