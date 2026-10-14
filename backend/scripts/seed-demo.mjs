import '../src/config/env.js';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import Company from '../src/models/company.model.js';
import User from '../src/models/user.model.js';
import Project from '../src/models/project.model.js';
import Worker from '../src/models/worker.model.js';
import Attendance from '../src/models/attendance.model.js';
import Material from '../src/models/material.model.js';
import MaterialLog from '../src/models/materialLog.model.js';
import Expense from '../src/models/expense.model.js';
import DailyReport from '../src/models/dailyReport.model.js';
import Contract from '../src/models/contract.model.js';
import Payment from '../src/models/payment.model.js';
import ProjectAssignment from '../src/models/projectAssignment.model.js';
import SubscriptionPayment from '../src/models/subscriptionPayment.model.js';

const DEMO_PASSWORD = 'Construct123';
const COMPANY_NAME = 'Khrais Builders (Pvt) Ltd';
const dayMs = 86400000;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const SITES = [
  { name: 'Khrais Housing Scheme — Phase 2', location: 'Bahria Town, Lahore', budget: 18500000, progress: 62, startDate: 20, endDate: -140 },
  { name: 'Gulberg Textile Factory', location: 'Faisalabad Road, Lahore', budget: 9200000, progress: 38, startDate: 45, endDate: -200 },
  { name: 'DHA Farmhouse Renovation', location: 'DHA Phase 6, Lahore', budget: 4300000, progress: 81, startDate: 80, endDate: -30 },
];

const WORKER_POOL = [
  ['Muhammad Aslam', 'Mason', 2500], ['Ghulam Rabbani', 'Mason', 2200], ['Naeem Iqbal', 'Mason', 2400],
  ['Shafqat Hussain', 'Mason', 2100], ['Abdul Rehman', 'Mason', 2300],
  ['Riaz Ahmed', 'Helper (Beldar)', 1200], ['Waqas Ali', 'Helper (Beldar)', 1250], ['Junaid Akram', 'Helper (Beldar)', 1200],
  ['Sohail Anwar', 'Helper (Beldar)', 1300], ['Furqan Shahid', 'Helper (Beldar)', 1250], ['Zubair Ahmad', 'Helper (Beldar)', 1150],
  ['Irfan Bhatti', 'Carpenter', 2000], ['Kashif Mehmood', 'Carpenter', 1900], ['Bilal Nasir', 'Carpenter', 2050],
  ['Tariq Saeed', 'Electrician', 2600], ['Adnan Yousaf', 'Plumber', 2500],
  ['Shahid Nazir', 'Welder', 2300], ['Noman Haider', 'Painter', 1800], ['Sajjad Hussain', 'Tile Installer', 2400],
  ['Rizwan Malik', 'Site Supervisor', 3500],
];

const MATERIALS = [
  ['Cement (FlyAsh 50kg)', 'bags', 2200, 980], ['Sand', 'tons', 420, 165], ['Crush (10mm)', 'tons', 360, 140],
  ['Steel Bar S2 (40wt)', 'kg', 340, 198], ['Bricks (A-class)', 'pieces', 26000, 11500], ['Riven (chopped)', 'kg', 210, 96],
];

const WORK_TYPES = ['Foundation', 'Structure', 'Slab', 'Finishing', 'Other'];

const REPORT_NOTES = [
  'Plaster work on ground floor walls continuing, 8 labour on site.',
  'Slab shuttering staged for first floor, material delivered in the morning.',
  'Column casting completed for grid C4 to C7, curing started.',
  'Electrical conduit chasing on second floor, electrician and two helpers.',
  'Brickwork for partition walls, mortar mixing going on as usual.',
  'Waterproofing applied on roof slab, checking for leaks tomorrow.',
  'Steel binding for beams B2 and B3 finished, waiting for formwork.',
  'Floor tiling in lobby area, two tile installers engaged.',
];

const dateOn = (offsetDays) => {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
};

const wipeDemo = async () => {
  const company = await Company.findOne({ name: COMPANY_NAME });
  if (!company) return;
  const projects = await Project.find({ companyId: company._id }).select('_id').lean();
  const ids = projects.map((p) => p._id);
  const workers = await Worker.find({ projectId: { $in: ids } }).select('_id').lean();
  await Promise.all([
    Attendance.deleteMany({ projectId: { $in: ids } }),
    MaterialLog.deleteMany({ projectId: { $in: ids } }),
    Material.deleteMany({ projectId: { $in: ids } }),
    DailyReport.deleteMany({ projectId: { $in: ids } }),
    Payment.deleteMany({ projectId: { $in: ids } }),
    Contract.deleteMany({ projectId: { $in: ids } }),
    ProjectAssignment.deleteMany({ projectId: { $in: ids } }),
    Worker.deleteMany({ projectId: { $in: ids } }),
    Expense.deleteMany({ companyId: company._id }),
    SubscriptionPayment.deleteMany({ companyId: company._id }),
    User.deleteMany({ companyId: company._id }),
    Project.deleteMany({ companyId: company._id }),
    Company.deleteOne({ _id: company._id }),
    mongoose.connection.db.collection('refreshtokens').deleteMany({}),
  ]);
  console.log(`Removed previous demo tenant (${workers.length} worker records).`);
};

const run = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
    console.error('Refusing to seed demo data into a production database. Set ALLOW_DEMO_SEED=1 to override.');
    process.exit(1);
  }

  await connectDB();

  if (process.argv.includes('--reset') || process.argv.includes('--force')) await wipeDemo();
  if (await Company.findOne({ name: COMPANY_NAME })) {
    console.error(`Demo tenant "${COMPANY_NAME}" already exists. Re-run with --reset to rebuild it.`);
    process.exit(1);
  }

  const now = new Date();
  const company = await Company.create({
    name: COMPANY_NAME,
    subscriptionPlan: '12_months',
    subscriptionStatus: 'active',
    isTrial: false,
    subscriptionStartDate: new Date(now.getTime() - 120 * dayMs),
    subscriptionEndDate: new Date(now.getTime() + 240 * dayMs),
  });

  const [owner, manager, accountant, contractor] = await Promise.all([
    User.create({ name: 'Khrais Owner', email: 'owner@demo.constructops.pk', password: DEMO_PASSWORD, role: 'owner', companyId: company._id, status: 'active' }),
    User.create({ name: 'Site Manager', email: 'manager@demo.constructops.pk', password: DEMO_PASSWORD, role: 'manager', companyId: company._id, status: 'active' }),
    User.create({ name: 'Accounts Incharge', email: 'accounts@demo.constructops.pk', password: DEMO_PASSWORD, role: 'accountant', companyId: company._id, status: 'active' }),
    User.create({ name: 'Adnan Subcontractors', email: 'contractor@demo.constructops.pk', password: DEMO_PASSWORD, role: 'contractor', companyId: company._id, status: 'active' }),
  ]);

  const projects = [];
  for (const site of SITES) {
    projects.push(
      await Project.create({
        companyId: company._id,
        name: site.name,
        location: site.location,
        budget: site.budget,
        spent: 0,
        startDate: dateOn(site.startDate),
        endDate: dateOn(site.endDate),
        status: 'active',
        progress: site.progress,
        notify: { dailyDigest: true, whatsappNumbers: ['+92 300 1234567', '+92 321 7654321'] },
      })
    );
  }

  // --- Labour: 20 workers spread over the three sites ---
  const workersByProject = new Map();
  let workerIndex = 0;
  for (const project of projects) {
    const count = project === projects[0] ? 9 : project === projects[1] ? 7 : 4;
    const roster = [];
    for (let i = 0; i < count; i += 1) {
      const [name, role, dailyWage] = WORKER_POOL[workerIndex % WORKER_POOL.length];
      workerIndex += 1;
      roster.push(
        await Worker.create({
          projectId: project._id,
          name,
          role,
          dailyWage,
          phone: `+92 3${pick(['00', '01', '21', '33', '45'])} ${String(1000000 + Math.floor(Math.random() * 8999999))}`,
        })
      );
    }
    workersByProject.set(String(project._id), roster);
  }

  // --- Attendance for the current month up to today (Sunday = no work) ---
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const attendance = [];
  for (const project of projects) {
    for (let cursor = new Date(monthStart); cursor <= todayUtc; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      if (cursor.getUTCDay() === 0) continue;
      for (const worker of workersByProject.get(String(project._id))) {
        if (Math.random() < 0.13) continue; // absent or on leave — simply not marked
        attendance.push({
          workerId: worker._id,
          projectId: project._id,
          date: new Date(cursor),
          status: Math.random() < 0.9 ? 'present' : 'absent',
          checkInTime: new Date(cursor.getTime() + 8 * 3600000),
        });
      }
    }
  }
  await Attendance.insertMany(attendance);

  // --- Materials with a real IN/OUT trail ---
  const materialLogs = [];
  const materials = [];
  for (const project of projects) {
    for (const [name, unit, totalIn, totalUsed] of MATERIALS) {
      const material = await Material.create({
        projectId: project._id,
        name,
        unit,
        totalIn,
        totalUsed,
        remaining: Math.max(0, totalIn - totalUsed),
      });
      materials.push(material);
      const inQty = Math.round(totalIn / 2);
      materialLogs.push(
        { projectId: project._id, materialId: material._id, type: 'IN', quantity: inQty, date: dateOn(28), note: 'Supplier delivery — master roll', createdBy: manager._id },
        { projectId: project._id, materialId: material._id, type: 'IN', quantity: totalIn - inQty, date: dateOn(12), note: 'Second consignment', createdBy: manager._id },
        { projectId: project._id, materialId: material._id, type: 'OUT', quantity: Math.round(totalUsed * 0.6), date: dateOn(20), note: 'Issued to site team', createdBy: manager._id },
        { projectId: project._id, materialId: material._id, type: 'OUT', quantity: totalUsed - Math.round(totalUsed * 0.6), date: dateOn(4), note: 'Issued for slab work', createdBy: manager._id }
      );
    }
  }
  await MaterialLog.insertMany(materialLogs);

  // --- Expenses: mostly approved so budget burn looks real, a few pending ---
  const expenseSeeds = [
    ['material', 'Cement and sand purchase', 620000], ['material', 'Steel bar S2 40wt', 1180000],
    ['labor', 'Weekly labour wages', 480000], ['labor', 'Helper wages fortnight', 210000],
    ['machinery', 'Jawari and mixer rent', 95000], ['transport', 'Material loading and trolley', 64000],
    ['subcontractor', 'Tile work advance', 350000], ['utilities', 'Site electricity bill', 42000],
    ['permits', 'Municipal inspection fee', 30000], ['safety', 'Harnesses and helmets', 27000],
    ['misc', 'Dhaba and tea for labour', 18000], ['material', 'Bricks A-class', 420000],
  ];
  const expenses = [];
  for (const project of projects) {
    for (let i = 0; i < expenseSeeds.length; i += 1) {
      const [category, description, base] = expenseSeeds[i];
      const amount = Math.round((base * (project === projects[0] ? 1 : 0.55)) / 1000) * 1000;
      expenses.push({
        companyId: company._id,
        projectId: project._id,
        category,
        description,
        amount,
        date: dateOn(i * 2 + 1),
        status: i % 6 === 0 ? 'pending' : 'approved',
        addedBy: i % 3 === 0 ? accountant._id : manager._id,
        reviewedBy: i % 6 === 0 ? null : owner._id,
        reviewedAt: i % 6 === 0 ? null : dateOn(i * 2),
      });
    }
  }
  const insertedExpenses = await Expense.insertMany(expenses);

  for (const project of projects) {
    const approved = insertedExpenses
      .filter((e) => String(e.projectId) === String(project._id) && e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
    await Project.updateOne({ _id: project._id }, { $set: { spent: approved } });
  }

  // --- Daily reports for the last 12 days per site ---
  const reports = [];
  for (const project of projects) {
    for (let i = 0; i < 12; i += 1) {
      reports.push({
        projectId: project._id,
        addedBy: manager._id,
        date: dateOn(i),
        description: REPORT_NOTES[(i + projects.indexOf(project)) % REPORT_NOTES.length],
        workType: pick(WORK_TYPES),
        aiAnalysis: { progressDetected: true, delayRisk: i % 5 === 0, notes: REPORT_NOTES[(i + projects.indexOf(project)) % REPORT_NOTES.length] },
      });
    }
  }
  await DailyReport.insertMany(reports);

  // --- Subcontract: contract, milestones, assignment and payments ---
  const contractProject = projects[0];
  const contract = await Contract.create({
    companyId: company._id,
    projectId: contractProject._id,
    contractorId: contractor._id,
    contractAmount: 3600000,
    terms: 'Brickwork, plaster and flooring for blocks A and B. Material supplied by main contractor; labour and scaffolding by subcontractor. Payment within 15 days of milestone sign-off.',
    milestones: [
      { title: 'Block A brickwork', amount: 900000, dueDate: dateOn(60), status: 'paid' },
      { title: 'Block A plaster', amount: 1100000, dueDate: dateOn(20), status: 'completed' },
      { title: 'Block B flooring', amount: 1600000, dueDate: dateOn(-45), status: 'pending' },
    ],
    status: 'active',
  });

  await ProjectAssignment.create({
    companyId: company._id,
    projectId: contractProject._id,
    contractorId: contractor._id,
    role: 'Subcontractor — masonry and finishing',
    status: 'active',
    assignedBy: owner._id,
  });

  await Payment.insertMany([
    { companyId: company._id, projectId: contractProject._id, contractorId: contractor._id, contractId: contract._id, amount: 500000, paymentDate: dateOn(58), status: 'paid', paymentMethod: 'bank_transfer', referenceNumber: 'HBL-TRF-448120', notes: 'First milestone advance', recordedBy: owner._id },
    { companyId: company._id, projectId: contractProject._id, contractorId: contractor._id, contractId: contract._id, amount: 400000, paymentDate: dateOn(31), status: 'paid', paymentMethod: 'cheque', referenceNumber: 'CHQ-009214', notes: 'Brickwork completion', recordedBy: accountant._id },
    { companyId: company._id, projectId: contractProject._id, contractorId: contractor._id, contractId: contract._id, amount: 600000, paymentDate: dateOn(6), status: 'paid', paymentMethod: 'cash', referenceNumber: '', notes: 'Plaster stage payment', recordedBy: owner._id },
  ]);

  // --- SaaS billing history so receipts are demoable ---
  await SubscriptionPayment.insertMany([
    { companyId: company._id, submittedBy: owner._id, plan: '12_months', amount: 135000, method: 'bank_transfer', transactionReference: 'HBL-SUB-2026-000451', payerDetails: 'Khrais Builders — current account', status: 'approved', reviewedAt: dateOn(120), reviewNote: 'Verified against bank statement', gateway: { provider: null, orderId: null, capturedAt: dateOn(120) } },
    { companyId: company._id, submittedBy: owner._id, plan: '12_months', amount: 135000, method: 'easypaisa', transactionReference: 'EP-TID-7712093', payerDetails: '+92 300 1234567', status: 'pending', gateway: { provider: 'easypaisa', orderId: null } },
  ]);

  const totals = await Promise.all([
    Project.countDocuments({ companyId: company._id }),
    Worker.countDocuments({ projectId: { $in: projects.map((p) => p._id) } }),
    Attendance.countDocuments({ projectId: { $in: projects.map((p) => p._id) } }),
    Material.countDocuments({ projectId: { $in: projects.map((p) => p._id) } }),
    Expense.countDocuments({ companyId: company._id }),
    DailyReport.countDocuments({ projectId: { $in: projects.map((p) => p._id) } }),
  ]);

  console.log(`\nDemo tenant "${COMPANY_NAME}" ready.`);
  console.log(`  ${totals[0]} sites · ${totals[1]} workers · ${totals[2]} attendance rows`);
  console.log(`  ${totals[3]} materials · ${totals[4]} expenses · ${totals[5]} daily reports`);
  console.log('\nSign in at http://localhost:3000 (any of these, password ' + DEMO_PASSWORD + '):');
  console.log('  owner@demo.constructops.pk        — full control');
  console.log('  manager@demo.constructops.pk      — site operations');
  console.log('  accounts@demo.constructops.pk     — ledger and payments');
  console.log('  contractor@demo.constructops.pk   — assigned site only\n');

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Demo seed failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
