import Material from '../models/material.model.js';
import MaterialLog from '../models/materialLog.model.js';
import Alert from '../models/alert.model.js';
import Project from '../models/project.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';

// @desc    Add material definition to project
// @route   POST /api/v1/materials
// @access  Private (Owner, Manager)
export const addMaterial = async (req, res) => {
  const { projectId, name, unit } = req.body;

  try {
    if (!projectId || !name || !unit) {
      return res.status(400).json({ success: false, message: 'Please provide projectId, name and unit' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    // Check if material already exists
    let material = await Material.findOne({ projectId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (material) {
      return res.status(400).json({ success: false, message: 'Material already exists in this project' });
    }

    material = await Material.create({
      projectId,
      name,
      unit,
      totalIn: 0,
      totalUsed: 0,
      remaining: 0,
    });

    res.status(201).json({ success: true, material });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get material inventory for project
// @route   GET /api/v1/materials
// @access  Private
export const getMaterials = async (req, res) => {
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

    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    const materials = await Material.find({ projectId });
    res.json({ success: true, materials });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Log material usage or delivery (IN / OUT audit logs)
// @route   POST /api/v1/materials/log
// @access  Private (Site Manager, Owner)
export const logMaterialTransaction = async (req, res) => {
  const { projectId, materialId, type, quantity, note } = req.body;

  try {
    if (!projectId || !materialId || !type || !quantity) {
      return res.status(400).json({ success: false, message: 'Please provide all transaction details' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    const material = await Material.findOne({ _id: materialId, projectId });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found in this project' });
    }

    // Create Audit Log entry
    const log = await MaterialLog.create({
      projectId,
      materialId,
      type,
      quantity,
      note: note || '',
      createdBy: req.user._id,
    });

    // Update stock levels
    if (type === 'IN') {
      material.totalIn += Number(quantity);
      material.remaining += Number(quantity);
    } else if (type === 'OUT') {
      material.totalUsed += Number(quantity);
      material.remaining -= Number(quantity);

      // Theft / discrepancy warning trigger: if remaining is negative, or if usage is unreasonably high
      if (material.remaining < 0) {
        await Alert.create({
          projectId,
          type: 'material',
          message: `Stock discrepancy: Remaining quantity of ${material.name} is negative (${material.remaining} ${material.unit}). Possible theft or unrecorded log.`,
          severity: 'high',
        });
      }
    }

    await material.save();
    res.status(201).json({ success: true, log, material });
  } catch (error) {
    console.error('Material log error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get audit logs of materials for project
// @route   GET /api/v1/materials/logs
// @access  Private
export const getMaterialLogs = async (req, res) => {
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

    if (req.user.role === 'contractor') {
      const assignment = await ProjectAssignment.findOne({
        projectId,
        contractorId: req.user._id,
        status: 'active',
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this project' });
      }
    }

    const logs = await MaterialLog.find({ projectId })
      .sort({ date: -1 })
      .populate('materialId', 'name unit')
      .populate('createdBy', 'name');

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
