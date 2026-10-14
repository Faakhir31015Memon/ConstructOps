import Project from '../models/project.model.js';
import Company from '../models/company.model.js';
import Worker from '../models/worker.model.js';
import Attendance from '../models/attendance.model.js';
import { toObjectId } from '../middleware/sanitize.middleware.js';

/** "2026-10" -> [start, end) UTC boundaries plus a readable label. */
export const monthRange = (month) => {
  const now = new Date();
  const raw = String(month || '');
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthNumber = match ? Number(match[2]) : now.getUTCMonth() + 1;

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const label = new Date(start.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 7);
  const pretty = start.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { start, end, label, pretty };
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * Monthly wage statement derived from attendance: days present x dailyWage.
 * Returns null when the project is not accessible to the caller.
 */
export const buildPayroll = async ({ projectId, month, companyId }) => {
  const projectObjectId = toObjectId(projectId);
  if (!projectObjectId) {
    const error = new Error('Invalid projectId');
    error.statusCode = 400;
    throw error;
  }

  const range = monthRange(month);
  if (!range) {
    const error = new Error('month must look like YYYY-MM');
    error.statusCode = 400;
    throw error;
  }

  const project = await Project.findOne({
    _id: projectObjectId,
    ...(companyId ? { companyId } : {}),
  }).lean();

  if (!project) return null;

  const [workers, records] = await Promise.all([
    Worker.find({ projectId: projectObjectId }).sort({ name: 1 }).lean(),
    Attendance.find({ projectId: projectObjectId, date: { $gte: range.start, $lt: range.end } }).lean(),
  ]);

  const stats = new Map();
  records.forEach((record) => {
    const key = String(record.workerId);
    const entry = stats.get(key) || { present: 0, absent: 0, dates: [] };
    if (record.status === 'present') entry.present += 1;
    else entry.absent += 1;
    if (entry.dates.length < 31) entry.dates.push({ date: record.date, status: record.status });
    stats.set(key, entry);
  });

  const rows = workers.map((worker) => {
    const entry = stats.get(String(worker._id)) || { present: 0, absent: 0, dates: [] };
    const dailyWage = Number(worker.dailyWage) || 0;
    return {
      workerId: worker._id,
      name: worker.name,
      role: worker.role,
      phone: worker.phone || '',
      dailyWage: roundMoney(dailyWage),
      daysPresent: entry.present,
      daysAbsent: entry.absent,
      amount: roundMoney(dailyWage * entry.present),
      days: entry.dates,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      daysPresent: acc.daysPresent + row.daysPresent,
      amount: roundMoney(acc.amount + row.amount),
      workersWithAttendance: acc.workersWithAttendance + (row.daysPresent > 0 ? 1 : 0),
    }),
    { daysPresent: 0, amount: 0, workersWithAttendance: 0 }
  );

  const company = project.companyId ? await Company.findById(project.companyId).select('name').lean() : null;

  return {
    project: { _id: project._id, name: project.name, location: project.location },
    companyName: company?.name || '',
    month: range.label,
    periodLabel: range.pretty,
    rows,
    totals: { ...totals, workerCount: rows.length },
  };
};

export default buildPayroll;
