import mongoose from 'mongoose';
import Project from '../models/project.model.js';
import { sendProjectDigest, isWhatsAppConfigured, digestRecipients } from '../services/notification.service.js';
import { toObjectId } from '../middleware/sanitize.middleware.js';
import serverError from '../utils/serverError.js';
import logger from '../utils/logger.js';

// @desc    Preview or send the WhatsApp daily digest for one site
// @route   POST /api/v1/notifications/digest
// @access  Private (owner, manager) — send=true actually delivers
export const triggerDigest = async (req, res) => {
  const { projectId, send } = req.body;

  try {
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

    if (!send) {
      const { buildDailyDigest } = await import('../services/notification.service.js');
      const preview = await buildDailyDigest({ project });
      return res.json({
        success: true,
        sent: false,
        preview: preview.text,
        stats: preview.stats,
        recipients: digestRecipients(project),
        gatewayConfigured: isWhatsAppConfigured(),
      });
    }

    const result = await sendProjectDigest(project);
    if (result.delivered) {
      project.notify = project.notify || {};
      project.notify.lastDigestAt = new Date();
      await project.save({ validateBeforeSave: false });
    }

    logger.info('Digest requested', { projectId: String(project._id), delivered: result.delivered, reason: result.reason });
    res.json({
      success: true,
      sent: result.delivered,
      reason: result.reason,
      preview: result.preview,
      stats: result.stats,
      recipients: digestRecipients(project),
      gatewayConfigured: isWhatsAppConfigured(),
    });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    Save WhatsApp numbers / daily digest toggle for a site
// @route   PUT /api/v1/notifications/settings
// @access  Private (owner, manager)
export const saveDigestSettings = async (req, res) => {
  const { projectId, dailyDigest, whatsappNumbers } = req.body;

  try {
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

    const numbers = Array.isArray(whatsappNumbers)
      ? whatsappNumbers
          .slice(0, 5)
          .map((n) => String(n).replace(/[^\d+]/g, '').slice(0, 16))
          .filter((n) => n.replace(/\D/g, '').length >= 10)
      : project.notify?.whatsappNumbers || [];

    project.notify = {
      ...(project.notify || {}),
      dailyDigest: Boolean(dailyDigest),
      whatsappNumbers: numbers,
    };
    await project.save();

    res.json({ success: true, notify: project.notify });
  } catch (error) {
    serverError(res, error, req);
  }
};

// @desc    List active sites the caller can digest
// @route   GET /api/v1/notifications/settings
// @access  Private
export const listDigestSettings = async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.user.role !== 'admin' && mongoose.isValidObjectId(req.user.companyId?._id || req.user.companyId)) {
      filter.companyId = req.user.companyId?._id || req.user.companyId;
    }
    const projects = await Project.find(filter).select('name location notify progress').sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      gatewayConfigured: isWhatsAppConfigured(),
      projects: projects.map((p) => ({
        _id: p._id,
        name: p.name,
        location: p.location,
        progress: p.progress,
        dailyDigest: Boolean(p.notify?.dailyDigest),
        whatsappNumbers: p.notify?.whatsappNumbers || [],
        lastDigestAt: p.notify?.lastDigestAt || null,
      })),
    });
  } catch (error) {
    serverError(res, error, req);
  }
};
