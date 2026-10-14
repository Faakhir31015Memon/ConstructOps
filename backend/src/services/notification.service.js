import DailyReport from '../models/dailyReport.model.js';
import Expense from '../models/expense.model.js';
import Worker from '../models/worker.model.js';
import Attendance from '../models/attendance.model.js';
import Alert from '../models/alert.model.js';
import Project from '../models/project.model.js';
import logger from '../utils/logger.js';

export const isWhatsAppConfigured = () =>
  Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

const normalizeNumber = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
};

/**
 * WhatsApp Cloud API text message. Without credentials the message is reported as
 * not delivered instead of failing, so the product still works manually.
 */
export const sendWhatsAppText = async (to, body) => {
  const number = normalizeNumber(to);
  if (!number) return { delivered: false, reason: 'INVALID_NUMBER' };
  if (!isWhatsAppConfigured()) {
    logger.info('WhatsApp digest prepared (no credentials configured)', { to: number, body });
    return { delivered: false, reason: 'WHATSAPP_NOT_CONFIGURED' };
  }

  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'text',
        text: { body: body.slice(0, 1000) },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      logger.error('WhatsApp send failed', { status: response.status, code: payload?.error?.code });
      return { delivered: false, reason: 'PROVIDER_ERROR' };
    }
    return { delivered: true, messageId: payload?.messages?.[0]?.id || '' };
  } catch (error) {
    logger.error('WhatsApp send error', { error: error.message });
    return { delivered: false, reason: 'NETWORK_ERROR' };
  }
};

const money = (value) => `Rs ${Math.round(Number(value) || 0).toLocaleString('en-US')}`;

/**
 * One-paragraph site summary a contractor can read on a phone: progress, labour
 * present today, today's spend, and anything waiting for approval.
 */
export const buildDailyDigest = async ({ project, companyCurrency = 'PKR' }) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [report, workers, attendanceToday, expensesToday, pendingExpenses, openAlerts] = await Promise.all([
    DailyReport.findOne({ projectId: project._id }).sort({ date: -1 }).lean(),
    Worker.countDocuments({ projectId: project._id }),
    Attendance.countDocuments({ projectId: project._id, date: startOfDay, status: 'present' }),
    Expense.aggregate([
      { $match: { projectId: project._id, date: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.countDocuments({ projectId: project._id, status: 'pending' }),
    Alert.countDocuments({ projectId: project._id, isRead: false }),
  ]);

  const spentToday = expensesToday[0]?.total || 0;

  const lines = [
    `ConstructOps | ${project.name}`,
    `${startOfDay.toISOString().slice(0, 10)}`,
    `Progress: ${Math.round(project.progress || 0)}% | Budget used: ${money(project.spent || 0)} of ${money(project.budget || 0)}`,
    `Labour on site today: ${attendanceToday} of ${workers} workers`,
    spentToday > 0
      ? `Spend logged today: ${money(spentToday)} (${expensesToday[0]?.count || 0} entries)`
      : 'No expense logged today',
    pendingExpenses ? `${pendingExpenses} expense(s) waiting for approval` : 'Nothing waiting for approval',
    openAlerts ? `${openAlerts} open alert(s)` : 'No open alerts',
  ];

  if (report) {
    lines.push(`Last update (${new Date(report.date).toISOString().slice(0, 10)}): ${String(report.description).slice(0, 220)}`);
    if (report.aiAnalysis?.delayRisk) lines.push('Risk flagged: possible delay — please review.');
  } else {
    lines.push('No daily report has been submitted yet.');
  }

  return { text: lines.join('\n'), companyCurrency, stats: { attendanceToday, workers, spentToday, pendingExpenses, openAlerts } };
};

/** Recipients for a project: its own saved numbers, plus the env fallback. */
export const digestRecipients = (project) => {
  const fromProject = (project?.notify?.whatsappNumbers || []).map(normalizeNumber).filter(Boolean);
  const fromEnv = String(process.env.WHATSAPP_DIGEST_TO || '')
    .split(',')
    .map(normalizeNumber)
    .filter(Boolean);
  return Array.from(new Set([...fromProject, ...fromEnv]));
};

export const sendProjectDigest = async (project) => {
  const { text, stats } = await buildDailyDigest({ project });
  const recipients = digestRecipients(project);

  if (recipients.length === 0) {
    return { delivered: false, reason: 'NO_RECIPIENTS', preview: text, stats };
  }

  const results = [];
  for (const number of recipients) {
    results.push({ number, ...(await sendWhatsAppText(number, text)) });
  }
  const delivered = results.filter((r) => r.delivered).length;

  return {
    delivered: delivered > 0,
    reason: delivered > 0 ? undefined : results[0]?.reason || 'NOT_SENT',
    preview: text,
    stats,
    recipients: results,
  };
};

export default sendProjectDigest;
