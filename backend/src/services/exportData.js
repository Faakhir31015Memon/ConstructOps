import Project from '../models/project.model.js';
import Company from '../models/company.model.js';
import User from '../models/user.model.js';
import Worker from '../models/worker.model.js';
import Attendance from '../models/attendance.model.js';
import Material from '../models/material.model.js';
import MaterialLog from '../models/materialLog.model.js';
import Expense from '../models/expense.model.js';
import DailyReport from '../models/dailyReport.model.js';
import Alert from '../models/alert.model.js';
import Contract from '../models/contract.model.js';
import Payment from '../models/payment.model.js';
import ProjectAssignment from '../models/projectAssignment.model.js';

const USER_FIELDS = 'name email role status phone';

const idOf = (v) => (v && (v._id || v.id) ? (v._id || v.id).toString() : v ? String(v) : '');
const person = (u) => (u ? { name: u.name || '-', email: u.email || '', role: u.role || '' } : { name: '-', email: '', role: '' });
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const PROJECT_SCOPE = {
  project: 1,
  owner: 1,
  contractors: 1,
  workers: 1,
  attendance: 1,
  materials: 1,
  materialLogs: 1,
  expenses: 1,
  reports: 1,
  alerts: 1,
  payments: 1,
};

async function findProjectsForUser(user) {
  if (user.role === 'admin') return Project.find({}).sort({ createdAt: -1 }).lean();
  if (user.role === 'contractor') {
    const assignments = await ProjectAssignment.find({ contractorId: user._id, status: 'active' })
      .select('projectId')
      .lean();
    const ids = assignments.map((a) => a.projectId);
    return Project.find({ _id: { $in: ids } }).sort({ createdAt: -1 }).lean();
  }
  return Project.find({ companyId: user.companyId }).sort({ createdAt: -1 }).lean();
}

export async function canAccessProject(user, projectId) {
  if (!projectId) return null;
  const project = await Project.findById(projectId).lean();
  if (!project) return null;
  if (user.role === 'admin') return project;
  if (user.role === 'contractor') {
    const assignment = await ProjectAssignment.findOne({
      projectId: project._id,
      contractorId: user._id,
      status: 'active',
    }).lean();
    return assignment ? project : null;
  }
  return idOf(project.companyId) === idOf(user.companyId) ? project : null;
}

async function loadProjectBundle(project, user) {
  const companyId = idOf(project.companyId);
  const projectId = idOf(project._id);

  const [
    company,
    owner,
    assignments,
    contracts,
    payments,
    workers,
    attendance,
    materials,
    materialLogs,
    expenses,
    reports,
    alerts,
  ] = await Promise.all([
    Company.findById(companyId).lean(),
    User.findOne({ companyId, role: 'owner' }).select(USER_FIELDS).lean(),
    ProjectAssignment.find({ projectId, status: 'active' })
      .populate('contractorId', USER_FIELDS)
      .populate('assignedBy', USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean(),
    Contract.find({ projectId }).populate('contractorId', USER_FIELDS).sort({ createdAt: -1 }).lean(),
    Payment.find({ projectId })
      .populate('contractorId', USER_FIELDS)
      .populate('recordedBy', USER_FIELDS)
      .sort({ paymentDate: -1 })
      .lean(),
    Worker.find({ projectId }).sort({ createdAt: -1 }).lean(),
    Attendance.find({ projectId }).populate('workerId', 'name role').sort({ date: 1 }).lean(),
    Material.find({ projectId }).sort({ name: 1 }).lean(),
    MaterialLog.find({ projectId })
      .populate('materialId', 'name unit')
      .populate('createdBy', USER_FIELDS)
      .sort({ date: -1 })
      .lean(),
    Expense.find({ projectId })
      .populate('addedBy', USER_FIELDS)
      .populate('reviewedBy', USER_FIELDS)
      .sort({ date: -1 })
      .lean(),
    DailyReport.find({ projectId }).populate('addedBy', USER_FIELDS).sort({ date: -1 }).lean(),
    Alert.find({ projectId }).sort({ createdAt: -1 }).lean(),
  ]);

  const contractorUsers = assignments.map((a) => a.contractorId).filter(Boolean);
  const workersById = new Map(workers.map((w) => [idOf(w._id), w]));

  const attendanceByWorker = new Map();
  for (const record of attendance) {
    const key = idOf(record.workerId);
    if (!attendanceByWorker.has(key)) attendanceByWorker.set(key, { present: 0, absent: 0, days: new Set() });
    const bucket = attendanceByWorker.get(key);
    if (record.status === 'present') bucket.present += 1;
    else bucket.absent += 1;
    bucket.days.add(dayKey(record.date));
  }

  const paidByContractor = new Map();
  for (const p of payments) {
    const key = idOf(p.contractorId);
    paidByContractor.set(key, (paidByContractor.get(key) || 0) + num(p.amount));
  }

  const contractByContractor = new Map();
  for (const c of contracts) contractByContractor.set(idOf(c.contractorId), c);

  const contractors = new Map();
  for (const u of contractorUsers) {
    const key = idOf(u);
    const assignment = assignments.find((a) => idOf(a.contractorId) === key);
    const contract = contractByContractor.get(key);
    contractors.set(key, {
      name: u.name,
      email: u.email,
      accountStatus: u.status,
      assignedOn: assignment?.createdAt || null,
      assignedBy: person(assignment?.assignedBy).name,
      roleOnProject: assignment?.role || 'contractor',
      contractAmount: num(contract?.contractAmount),
      contractStatus: contract?.status || 'not created',
      terms: contract?.terms || '',
      milestones: (contract?.milestones || []).map((m) => ({
        title: m.title,
        amount: num(m.amount),
        dueDate: m.dueDate || null,
        status: m.status,
      })),
      paidTotal: paidByContractor.get(key) || 0,
      balance: num(contract?.contractAmount) - (paidByContractor.get(key) || 0),
    });
  }

  // Contractors hired without a formal assignment row still surface through contracts/payments.
  for (const c of contracts) {
    const key = idOf(c.contractorId);
    if (!contractors.has(key) && c.contractorId) {
      contractors.set(key, {
        name: c.contractorId.name,
        email: c.contractorId.email,
        accountStatus: c.contractorId.status,
        assignedOn: c.createdAt,
        assignedBy: '-',
        roleOnProject: 'contractor',
        contractAmount: num(c.contractAmount),
        contractStatus: c.status,
        terms: c.terms || '',
        milestones: (c.milestones || []).map((m) => ({
          title: m.title,
          amount: num(m.amount),
          dueDate: m.dueDate || null,
          status: m.status,
        })),
        paidTotal: paidByContractor.get(key) || 0,
        balance: num(c.contractAmount) - (paidByContractor.get(key) || 0),
      });
    }
  }

  const expenseTotals = expenses.reduce(
    (acc, e) => {
      acc[e.status || 'pending'] += num(e.amount);
      acc.byCategory[e.category] = (acc.byCategory[e.category] || 0) + num(e.amount);
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0, byCategory: {} }
  );

  const labourDays = attendance.filter((a) => a.status === 'present').length;

  return {
    project: {
      id: projectId,
      name: project.name,
      location: project.location,
      status: project.status,
      progress: num(project.progress),
      budget: num(project.budget),
      spent: num(project.spent),
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      company: company?.name || '-',
      companyPlan: company?.subscriptionPlan || '-',
    },
    owner: person(owner),
    contractors: [...contractors.values()],
    workers: workers.map((w) => {
      const stats = attendanceByWorker.get(idOf(w)) || { present: 0, absent: 0, days: new Set() };
      return {
        name: w.name,
        role: w.role,
        dailyWage: num(w.dailyWage),
        phone: w.phone || '',
        presentDays: stats.present,
        absentDays: stats.absent,
        daysTracked: stats.days.size,
        payableWages: stats.present * num(w.dailyWage),
        joinedOn: w.createdAt,
      };
    }),
    attendance: attendance.map((a) => ({
      date: a.date,
      worker: a.workerId?.name || idOf(a.workerId),
      workerRole: a.workerId?.role || workersById.get(idOf(a.workerId))?.role || '-',
      status: a.status,
      checkIn: a.checkInTime || null,
    })),
    materials: materials.map((m) => ({
      name: m.name,
      unit: m.unit,
      totalIn: num(m.totalIn),
      totalUsed: num(m.totalUsed),
      remaining: num(m.remaining),
    })),
    materialLogs: materialLogs.map((l) => ({
      date: l.date,
      material: l.materialId?.name || '-',
      unit: l.materialId?.unit || '',
      type: l.type,
      quantity: num(l.quantity),
      note: l.note || '',
      by: person(l.createdBy).name,
    })),
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      amount: num(e.amount),
      description: e.description,
      status: e.status || 'pending',
      addedBy: person(e.addedBy).name,
      reviewedBy: e.reviewedBy ? person(e.reviewedBy).name : '',
      rejectionReason: e.rejectionReason || '',
      receiptUrl: e.receiptUrl || '',
    })),
    expenseTotals,
    payments: payments.map((p) => ({
      paymentDate: p.paymentDate,
      contractor: person(p.contractorId).name,
      amount: num(p.amount),
      status: p.status,
      method: p.paymentMethod,
      reference: p.referenceNumber || '',
      notes: p.notes || '',
      recordedBy: person(p.recordedBy).name,
    })),
    reports: reports.map((r) => ({
      date: r.date,
      workType: r.workType,
      description: r.description,
      addedBy: person(r.addedBy).name,
      addedByRole: r.addedBy?.role || '',
      images: r.images || [],
      aiNotes: r.aiAnalysis?.notes || '',
      delayRisk: Boolean(r.aiAnalysis?.delayRisk),
    })),
    alerts: alerts.map((a) => ({
      createdAt: a.createdAt,
      type: a.type,
      severity: a.severity,
      message: a.message,
      isRead: Boolean(a.isRead),
    })),
    totals: {
      budget: num(project.budget),
      contractValue: [...contractors.values()].reduce((s, c) => s + c.contractAmount, 0),
      paidToContractors: payments.reduce((s, p) => s + num(p.amount), 0),
      approvedExpenses: expenseTotals.approved,
      pendingExpenses: expenseTotals.pending,
      rejectedExpenses: expenseTotals.rejected,
      labourCost: workers.reduce(
        (s, w) => s + (attendanceByWorker.get(idOf(w))?.present || 0) * num(w.dailyWage),
        0
      ),
      labourPresentDays: labourDays,
      workerCount: workers.length,
      contractorCount: contractors.size,
      materialPurchased: materials.reduce((s, m) => s + num(m.totalIn), 0),
      materialUsed: materials.reduce((s, m) => s + num(m.totalUsed), 0),
      materialRemaining: materials.reduce((s, m) => s + num(m.remaining), 0),
      reportDays: new Set(reports.map((r) => dayKey(r.date))).size,
      reportImages: reports.reduce((s, r) => s + (r.images?.length || 0), 0),
      openAlerts: alerts.filter((a) => !a.isRead).length,
    },
  };
}

export async function buildProjectExport(projectId, user) {
  const project = await canAccessProject(user, projectId);
  if (!project) return null;
  const bundle = await loadProjectBundle(project, user);
  return { scope: 'project', title: bundle.project.name, meta: exportMeta(user), ...bundle };
}

export async function buildCompanyExport(user) {
  const meta = exportMeta(user);
  const projects = await findProjectsForUser(user);
  if (!projects.length) {
    return { scope: 'company', title: 'Company overview', meta, projects: [], contractorMap: [], bundles: [], totals: {} };
  }

  const bundles = [];
  for (const p of projects) bundles.push(await loadProjectBundle(p, user));

  const contractorMap = new Map();
  for (const b of bundles) {
    for (const c of b.contractors) {
      const key = c.email || c.name;
      if (!contractorMap.has(key)) {
        contractorMap.set(key, { ...c, projects: [], contractAmount: 0, paidTotal: 0, balance: 0, milestones: [] });
      }
      const row = contractorMap.get(key);
      row.projects.push({ name: b.project.name, budget: b.project.budget, status: b.project.status });
      row.contractAmount += c.contractAmount;
      row.paidTotal += c.paidTotal;
      row.balance += c.balance;
      row.milestones.push(...c.milestones.map((m) => ({ ...m, project: b.project.name })));
    }
  }

  const sum = (fn) => bundles.reduce((s, b) => s + fn(b.totals), 0);

  return {
    scope: 'company',
    title: bundles[0].project.company,
    meta,
    company: { name: bundles[0].project.company, plan: bundles[0].project.companyPlan },
    owner: bundles[0].owner,
    projects: bundles.map((b) => b.project),
    contractorMap: [...contractorMap.values()],
    bundles,
    totals: {
      projects: bundles.length,
      budget: sum((t) => t.budget),
      contractValue: sum((t) => t.contractValue),
      paidToContractors: sum((t) => t.paidToContractors),
      approvedExpenses: sum((t) => t.approvedExpenses),
      pendingExpenses: sum((t) => t.pendingExpenses),
      labourPresentDays: sum((t) => t.labourPresentDays),
      workers: sum((t) => t.workerCount),
      contractors: contractorMap.size,
      materialPurchased: sum((t) => t.materialPurchased),
      materialUsed: sum((t) => t.materialUsed),
      materialRemaining: sum((t) => t.materialRemaining),
      reportDays: sum((t) => t.reportDays),
      reportImages: sum((t) => t.reportImages),
      openAlerts: sum((t) => t.openAlerts),
    },
  };
}

export const exportMeta = (user) => ({
  generatedAt: new Date(),
  generatedBy: person({ name: user.name, email: user.email, role: user.role }),
});
