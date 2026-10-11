import DailyReport from '../models/dailyReport.model.js';
import Project from '../models/project.model.js';
import Alert from '../models/alert.model.js';

// @desc    Add daily report log (and run simulated AI evaluation)
// @route   POST /api/v1/reports
// @access  Private (Site Manager, Owner)
export const createReport = async (req, res) => {
  const { projectId, description, workType, images } = req.body;

  try {
    if (!projectId || !description) {
      return res.status(400).json({ success: false, message: 'Please provide projectId and description' });
    }

    const project = await Project.findOne({
      _id: projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
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
        projectId,
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

    const report = await DailyReport.create({
      projectId,
      addedBy: req.user._id,
      description,
      workType: workType || 'Other',
      images: images || [],
      aiAnalysis: {
        progressDetected,
        delayRisk,
        notes: aiNotes,
      },
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get reports list for project
// @route   GET /api/v1/reports
// @access  Private
export const getReports = async (req, res) => {
  const { projectId } = req.query;

  try {
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Please specify projectId parameter' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    const reports = await DailyReport.find({ projectId })
      .sort({ date: -1 })
      .populate('addedBy', 'name');

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
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
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
