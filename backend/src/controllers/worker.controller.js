import Worker from '../models/worker.model.js';
import Attendance from '../models/attendance.model.js';
import Project from '../models/project.model.js';
import { pick } from '../utils/pick.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { toObjectId } from '../middleware/sanitize.middleware.js';

// @desc    Add a worker to project
// @route   POST /api/v1/workers
// @access  Private (Owner, Manager)
export const addWorker = async (req, res) => {
  const { projectId, name, role, dailyWage, phone } = req.body;

  try {
    if (!projectId || !name || !role || !dailyWage || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all worker details' });
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

    const worker = await Worker.create({
      projectId: projectObjectId,
      name,
      role,
      dailyWage,
      phone,
    });

    res.status(201).json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get workers for a project
// @route   GET /api/v1/workers
// @access  Private
export const getWorkers = async (req, res) => {
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

    const { page, limit, skip } = parsePagination(req);
    const [workers, total] = await Promise.all([
      Worker.find({ projectId: projectObjectId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Worker.countDocuments({ projectId: projectObjectId }),
    ]);
    res.json({ success: true, workers, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Update worker profile
// @route   PUT /api/v1/workers/:id
// @access  Private (Owner, Manager)
export const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: worker.projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this worker' });
    }

    const editable = pick(req.body, ['name', 'role', 'dailyWage', 'phone']);
    const updatedWorker = await Worker.findByIdAndUpdate(req.params.id, editable, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, worker: updatedWorker });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Remove worker from system
// @route   DELETE /api/v1/workers/:id
// @access  Private (Owner, Manager)
export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: worker.projectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this worker' });
    }

    // Clean up attendance records for this worker
    await Attendance.deleteMany({ workerId: worker._id });
    await worker.deleteOne();

    res.json({ success: true, message: 'Worker and associated attendance removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Submit check-in attendance sheet
// @route   POST /api/v1/attendance/check-in
// @access  Private (Site Manager, Owner)
export const checkInAttendance = async (req, res) => {
  const { workerId, projectId, date, status } = req.body;

  try {
    if (!workerId || !projectId || !date || !status) {
      return res.status(400).json({ success: false, message: 'Please provide workerId, projectId, date, and status' });
    }

    const projectObjectId = toObjectId(projectId);
    const workerObjectId = toObjectId(workerId);
    if (!projectObjectId || !workerObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid workerId or projectId' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectObjectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    // Parse date to start of day to avoid time differences in indexing
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Check if attendance already logged for this worker on this date
    let attendance = await Attendance.findOne({ workerId: workerObjectId, date: attendanceDate });

    if (attendance) {
      attendance.status = status;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        workerId: workerObjectId,
        projectId: projectObjectId,
        date: attendanceDate,
        status,
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Fetch attendance sheets
// @route   GET /api/v1/attendance
// @access  Private
export const getAttendance = async (req, res) => {
  const { projectId, date } = req.query;

  try {
    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId || !date) {
      return res.status(400).json({ success: false, message: 'Please specify a valid projectId and date parameters' });
    }

    // Verify project belongs to user's company
    const project = await Project.findOne({
      _id: projectObjectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const attendanceRecords = await Attendance.find({
      projectId: projectObjectId,
      date: attendanceDate,
    }).populate('workerId', 'name role dailyWage');

    res.json({ success: true, attendance: attendanceRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
