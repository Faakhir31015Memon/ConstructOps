import AuditEvent from '../models/auditEvent.model.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import serverError from '../utils/serverError.js';

// @desc    List audit trail entries
// @route   GET /api/v1/audit
// @access  Private (Owner of the company, or system admin)
export const getAuditEvents = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { resourceType, action, actorId, from, to } = req.query;

    const filter = {};
    if (req.user.role !== 'admin') {
      const companyId = req.user.companyId?._id || req.user.companyId;
      if (!companyId) return res.status(400).json({ success: false, message: 'No company attached to this account' });
      filter.companyId = companyId;
    }
    if (resourceType) filter.resourceType = String(resourceType).slice(0, 40);
    if (action) filter.action = String(action).slice(0, 60);
    if (actorId) filter.actorId = String(actorId).slice(0, 40);
    if (from || to) {
      const range = {};
      if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) range.$lte = new Date(to);
      if (range.$gte || range.$lte) filter.createdAt = range;
    }

    const [events, total] = await Promise.all([
      AuditEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditEvent.countDocuments(filter),
    ]);

    res.json({ success: true, events, pagination: paginationMeta(page, limit, total) });
  } catch (error) {
    serverError(res, error, req);
  }
};
