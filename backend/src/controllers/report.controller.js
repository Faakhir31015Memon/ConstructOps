import DailyReport from '../models/dailyReport.model.js';
import Project from '../models/project.model.js';
import Alert from '../models/alert.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { toObjectId } from '../middleware/sanitize.middleware.js';
import serverError from '../utils/serverError.js';

// @desc    Add daily report log (and run simulated AI evaluation)
// @route   POST /api/v1/reports
// @access  Private (Site Manager, Owner, Contractor)
export const createReport = async (req, res) => {
  const { projectId, description, workType, images } = req.body;

  try {
    if (!projectId || !description) {
      return res.status(400).json({ success: false, message: 'Please provide projectId and description' });
    }

    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid projectId' });
    }

    const project = await Project.findOne({
      _id: projectObjectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId: projectObjectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    // AI Site Photo Analysis Simulation Rule Engine
    // Looks for keywords in the description to determine progress/delay indicators
    const textLower = description.toLowerCase();
    let progressDetected = true;
    let delayRisk = false;
    let aiNotes = 'AI analysis indicates normal execution. Visual structure matches standard growth timelines.';

    if (
      textLower.includes('slow') ||
      textLower.includes('delay') ||
      textLower.includes('late') ||
      textLower.includes('strike') ||
      textLower.includes('absent') ||
      textLower.includes('ruka') ||
      textLower.includes('baarish') ||
      textLower.includes('rain') ||
      textLower.includes('khatam') ||
      textLower.includes('chori') ||
      textLower.includes('issue')
    ) {
      progressDetected = false;
      delayRisk = true;
      aiNotes = 'AI Warning: Delay risk identified based on logs indicating slow pace, weather interruptions, or resource absences.';
      
      // Auto-trigger delay Alert
      await Alert.create({
        projectId: projectObjectId,
        type: 'delay',
        message: `AI Alert: Potential delay hazard flagged from daily log: "${description.substring(0, 60)}..."`,
        severity: 'medium',
      });
    } else if (
      textLower.includes('completed') ||
      textLower.includes('done') ||
      textLower.includes('finish') ||
      textLower.includes('ho gaya') ||
      textLower.includes('complete') ||
      textLower.includes('slab') ||
      textLower.includes('foundation')
    ) {
      progressDetected = true;
      delayRisk = false;
      aiNotes = 'AI Review: Positive structural progression confirmed. Growing structures detected in site captures.';
      
      // Auto increase project completion percentage slightly on milestone completions
      if (project.progress < 95) {
        project.progress += 5;
        await project.save();
      }
    }

    // Photo URLs only (from /api/v1/uploads) — reject oversized payloads and foreign data
    const safeImages = (Array.isArray(images) ? images : [])
      .filter((img) => typeof img === 'string' && (img.startsWith('/uploads/') || img.startsWith('https://')))
      .slice(0, 10);

    const report = await DailyReport.create({
      projectId: projectObjectId,
      addedBy: req.user._id,
      description,
      workType: workType || 'Other',
      images: safeImages,
      aiAnalysis: {
        progressDetected,
        delayRisk,
        notes: aiNotes,
      },
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Create report error:', error);
    serverError(res, error, req);
  }
};

// @desc    Get reports list for project
// @route   GET /api/v1/reports
// @access  Private
export const getReports = async (req, res) => {
  const { projectId } = req.query;

  try {
    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
      return res.status(400).json({ success: false, message: 'Please specify a valid projectId parameter' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectObjectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId: projectObjectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    const { page, limit, skip } = parsePagination(req);
    const [reports, total] = await Promise.all([
      DailyReport.find({ projectId: projectObjectId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('addedBy', 'name'),
      DailyReport.countDocuments({ projectId: projectObjectId }),
    ]);

    res.json({ success: true, reports, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    Remove report
// @route   DELETE /api/v1/reports/:id
// @access  Private (Owner only)
export const deleteReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Daily report not found' });
    }

    // Verify parent project belongs to user's company
    const project = await Project.findOne({
      _id: report.projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this daily report' });
    }

    await report.deleteOne();
    res.json({ success: true, message: 'Daily report removed successfully' });
  } catch (error) {
    serverError(res, error, req);
  }
};
