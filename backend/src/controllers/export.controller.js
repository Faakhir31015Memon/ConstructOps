import { buildProjectExport, buildCompanyExport } from '../services/exportData.js';
import { buildProjectWorkbook, buildCompanyWorkbook } from '../services/exportWorkbook.js';
import { buildExportPdf } from '../services/exportPdf.js';

const FORMATS = {
  xlsx: {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
  pdf: { type: 'application/pdf', extension: 'pdf' },
};

const slugify = (value) =>
  String(value || 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'report';

const sendFile = (res, req, name, format, buffer) => {
  const meta = FORMATS[format];
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${slugify(name)}-${stamp}.${meta.extension}`;

  res.setHeader('Content-Type', meta.type);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Export-Warnings', String(req.exportWarnings?.length || 0));
  return res.end(buffer);
};

// @desc    Download a full project report (contractors, budgets, labour, materials, expenses, reports, photos)
// @route   GET /api/v1/export/projects/:id/:format
// @access  Private (owner, manager, accountant, assigned contractor, admin)
export const exportProjectReport = async (req, res) => {
  const format = req.params.format?.toLowerCase();
  if (!FORMATS[format]) {
    return res.status(400).json({ success: false, message: 'Unsupported format. Use xlsx or pdf.' });
  }

  try {
    const data = await buildProjectExport(req.project?._id || req.params.id, req.user);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Project not found or not accessible' });
    }

    const result = format === 'xlsx' ? await buildProjectWorkbook(data) : await buildExportPdf(data);
    req.exportWarnings = result.warnings;
    return sendFile(res, req, data.project.name, format, result.buffer);
  } catch (error) {
    console.error('Project export failed:', error);
    if (res.headersSent) return res.end();
    return res.status(500).json({ success: false, message: 'Export failed: ' + error.message });
  }
};

// @desc    Download a company-wide report across all accessible projects
// @route   GET /api/v1/export/company/:format
// @access  Private
export const exportCompanyReport = async (req, res) => {
  const format = req.params.format?.toLowerCase();
  if (!FORMATS[format]) {
    return res.status(400).json({ success: false, message: 'Unsupported format. Use xlsx or pdf.' });
  }

  try {
    const data = await buildCompanyExport(req.user);
    const result = format === 'xlsx' ? await buildCompanyWorkbook(data) : await buildExportPdf(data);
    req.exportWarnings = result.warnings;
    return sendFile(res, req, data.title, format, result.buffer);
  } catch (error) {
    console.error('Company export failed:', error);
    if (res.headersSent) return res.end();
    return res.status(500).json({ success: false, message: 'Export failed: ' + error.message });
  }
};
