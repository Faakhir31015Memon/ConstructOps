import Worker from '../models/worker.model.js';
import Attendance from '../models/attendance.model.js';
import Project from '../models/project.model.js';
import { pick } from '../utils/pick.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { toObjectId } from '../middleware/sanitize.middleware.js';
import { buildPayroll } from '../services/payroll.service.js';
import serverError from '../utils/serverError.js';

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
    serverError(res, error, req);
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
    serverError(res, error, req);
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
    serverError(res, error, req);
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
    serverError(res, error, req);
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
    serverError(res, error, req);
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
    serverError(res, error, req);
  }
};

// @desc    Monthly wage statement from attendance (days present x dailyWage)
// @route   GET /api/v1/workers/payroll?projectId=&month=YYYY-MM
// @access  Private (owner, manager, accountant)
export const getPayroll = async (req, res) => {
  try {
    const companyId = req.user.role === 'admin' ? null : req.user.companyId?._id || req.user.companyId;
    const payroll = await buildPayroll({
      projectId: req.query.projectId,
      month: req.query.month,
      companyId,
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    res.json({ success: true, payroll });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    serverError(res, error, req);
  }
};

// @desc    Sync a batch of attendance rows — used by the offline site app
// @route   POST /api/v1/workers/attendance/bulk
// @access  Private (owner, manager, contractor)
export const bulkCheckInAttendance = async (req, res) => {
  const { projectId, records } = req.body;

  try {
    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid projectId' });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'records must be a non-empty array' });
    }
    if (records.length > 500) {
      return res.status(400).json({ success: false, message: 'A maximum of 500 attendance rows can be synced at once' });
    }

    const project = await Project.findOne({
      _id: projectObjectId,
      ...(req.user.role !== 'admin' && { companyId: req.user.companyId }),
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found or unauthorized' });
    }

    // Only workers that really belong to this site can be marked.
    const workers = await Worker.find({ projectId: projectObjectId }).select('_id').lean();
    const allowed = new Set(workers.map((w) => String(w._id)));

    let created = 0;
    let updated = 0;
    const rejected = [];

    for (const record of records) {
      const workerObjectId = toObjectId(record?.workerId);
      const status = record?.status;

      if (!workerObjectId || !allowed.has(String(workerObjectId))) {
        rejected.push({ workerId: record?.workerId, reason: 'worker not in this project' });
        continue;
      }
      if (!['present', 'absent'].includes(status)) {
        rejected.push({ workerId: record?.workerId, reason: 'status must be present or absent' });
        continue;
      }

      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) {
        rejected.push({ workerId: record?.workerId, reason: 'invalid date' });
        continue;
      }
      if (date > new Date()) {
        rejected.push({ workerId: record?.workerId, reason: 'future date' });
        continue;
      }
      date.setUTCHours(0, 0, 0, 0);

      // Returning null means the upsert inserted rather than matched.
      const previous = await Attendance.findOneAndUpdate(
        { workerId: workerObjectId, date },
        { status, projectId: projectObjectId },
        { upsert: true, new: false, setDefaultsOnInsert: true }
      );

      if (previous) updated += 1;
      else created += 1;
    }

    res.json({
      success: true,
      summary: { received: records.length, created, updated, rejected: rejected.length },
      rejected: rejected.slice(0, 20),
    });
  } catch (error) {
    serverError(res, error, req);
  }
};
