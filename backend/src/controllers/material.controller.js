import Material from '../models/material.model.js';
import MaterialLog from '../models/materialLog.model.js';
import Alert from '../models/alert.model.js';
import Project from '../models/project.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { toObjectId, escapeRegex } from '../middleware/sanitize.middleware.js';
import serverError from '../utils/serverError.js';

// @desc    Add material definition to project
// @route   POST /api/v1/materials
// @access  Private (Owner, Manager)
export const addMaterial = async (req, res) => {
  const { projectId, name, unit } = req.body;

  try {
    if (!projectId || !name || !unit) {
      return res.status(400).json({ success: false, message: 'Please provide projectId, name and unit' });
    }

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

    // Check if material already exists
    let material = await Material.findOne({ projectId: projectObjectId, name: { $regex: `^${escapeRegex(String(name).trim())}$`, $options: 'i' } });
    if (material) {
      return res.status(400).json({ success: false, message: 'Material already exists in this project' });
    }

    material = await Material.create({
      projectId: projectObjectId,
      name: String(name).trim(),
      unit,
      totalIn: 0,
      totalUsed: 0,
      remaining: 0,
    });

    res.status(201).json({ success: true, material });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    Get material inventory for project
// @route   GET /api/v1/materials
// @access  Private
export const getMaterials = async (req, res) => {
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
    const [materials, total] = await Promise.all([
      Material.find({ projectId: projectObjectId }).sort({ name: 1 }).skip(skip).limit(limit),
      Material.countDocuments({ projectId: projectObjectId }),
    ]);
    res.json({ success: true, materials, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    serverError(res, error, req);
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

    const projectObjectId = toObjectId(projectId);
    const materialObjectId = toObjectId(materialId);
    if (!projectObjectId || !materialObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid projectId or materialId' });
    }
    if (type !== 'IN' && type !== 'OUT') {
      return res.status(400).json({ success: false, message: 'type must be IN or OUT' });
    }
    const quantityNum = Number(quantity);
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ success: false, message: 'quantity must be a positive number' });
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

    const material = await Material.findOne({ _id: materialObjectId, projectId: projectObjectId });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found in this project' });
    }

    // Create Audit Log entry
    const log = await MaterialLog.create({
      projectId: projectObjectId,
      materialId: materialObjectId,
      type,
      quantity: quantityNum,
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
    serverError(res, error, req);
  }
};

// @desc    Get audit logs of materials for project
// @route   GET /api/v1/materials/logs
// @access  Private
export const getMaterialLogs = async (req, res) => {
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
    const [logs, total] = await Promise.all([
      MaterialLog.find({ projectId: projectObjectId })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('materialId', 'name unit')
        .populate('createdBy', 'name'),
      MaterialLog.countDocuments({ projectId: projectObjectId }),
    ]);

    res.json({ success: true, logs, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    serverError(res, error, req);
  }
};
