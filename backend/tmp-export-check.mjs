import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

const B = './src';
process.env.DB_URI = 'mongodb://localhost:27017/constructops_export_test';
process.env.NODE_ENV = 'test';

const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.DB_URI, { dbName: 'constructops_export_test' });
await mongoose.connection.dropDatabase();

const Company = (await import(`${B}/models/company.model.js`)).default;
const User = (await import(`${B}/models/user.model.js`)).default;
const Project = (await import(`${B}/models/project.model.js`)).default;
const Worker = (await import(`${B}/models/worker.model.js`)).default;
const Attendance = (await import(`${B}/models/attendance.model.js`)).default;
const Material = (await import(`${B}/models/material.model.js`)).default;
const MaterialLog = (await import(`${B}/models/materialLog.model.js`)).default;
const Expense = (await import(`${B}/models/expense.model.js`)).default;
const DailyReport = (await import(`${B}/models/dailyReport.model.js`)).default;
const Alert = (await import(`${B}/models/alert.model.js`)).default;
const Contract = (await import(`${B}/models/contract.model.js`)).default;
const Payment = (await import(`${B}/models/payment.model.js`)).default;
const ProjectAssignment = (await import(`${B}/models/projectAssignment.model.js`)).default;

// ---- PNG builder (no image libs): solid colour, with Urdu text irrelevant ----
function crc32(buf) {
  let c = -1;
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      const shade = (x + y) % 40 < 20 ? 1 : 0.7;
      row[1 + x * 3] = Math.round(rgb[0] * shade);
      row[2 + x * 3] = Math.round(rgb[1] * shade);
      row[3 + x * 3] = Math.round(rgb[2] * shade);
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const GIF = Buffer.concat([
  Buffer.from('GIF89a', 'ascii'),
  Buffer.from([0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
]);

const b64 = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;

// ---------------- seed ----------------
const company = await Company.create({ name: 'Al-Bareej Builders', subscriptionPlan: 'pro' });
const otherCompany = await Company.create({ name: 'Rival Construction Pvt' });
const owner = await User.create({
  name: 'Abdul Rehman',
  email: 'owner@test.com',
  password: 'Passw0rd!23',
  role: 'owner',
  companyId: company._id,
});
const contractor = await User.create({
  name: 'Ustad Bashir (Civil)',
  email: 'contractor@test.com',
  password: 'Passw0rd!23',
  role: 'contractor',
  companyId: company._id,
});
const rivalOwner = await User.create({
  name: 'Rival Owner',
  email: 'rival@test.com',
  password: 'Passw0rd!23',
  role: 'owner',
  companyId: otherCompany._id,
});

const project = await Project.create({
  companyId: company._id,
  name: 'Khadija Manzil - Block B',
  location: 'DHA Phase 6, Karachi',
  budget: 25000000,
  spent: 0,
  startDate: new Date('2026-07-01'),
  endDate: new Date('2026-12-30'),
  status: 'active',
  progress: 45,
});
const emptyProject = await Project.create({
  companyId: company._id,
  name: 'Brand New Site (no data yet)',
  location: 'Clifton',
  budget: 1000,
  spent: 0,
  startDate: new Date('2026-11-01'),
  endDate: new Date('2026-11-30'),
});
const rivalProject = await Project.create({
  companyId: otherCompany._id,
  name: 'Rival Tower',
  location: 'Lahore',
  budget: 5000,
  spent: 0,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-02-01'),
});

await ProjectAssignment.create({
  companyId: company._id,
  projectId: project._id,
  contractorId: contractor._id,
  role: 'structural contractor',
  assignedBy: owner._id,
});
await Contract.create({
  companyId: company._id,
  projectId: project._id,
  contractorId: contractor._id,
  contractAmount: 12000000,
  terms: ' slab + finishing chhorne ka kaam, PKR, material owner side se',
  status: 'active',
  milestones: [
    { title: 'Foundation casting', amount: 3000000, dueDate: new Date('2026-07-25'), status: 'paid' },
    { title: 'Plinth beam', amount: 2500000, dueDate: new Date('2026-08-15'), status: 'completed' },
    { title: 'Roof slab', amount: 4000000, dueDate: new Date('2026-09-30'), status: 'pending' },
    { title: ' plaster + paint', amount: 2500000, dueDate: new Date('2026-12-10'), status: 'pending' },
  ],
});
await Payment.create([
  {
    companyId: company._id,
    projectId: project._id,
    contractorId: contractor._id,
    amount: 3000000,
    paymentDate: new Date('2026-07-28'),
    status: 'paid',
    paymentMethod: 'bank_transfer',
    referenceNumber: 'HBL-4471902',
    notes: 'Foundation milestone',
    recordedBy: owner._id,
  },
  {
    companyId: company._id,
    projectId: project._id,
    contractorId: contractor._id,
    amount: 1200000,
    paymentDate: new Date('2026-08-20'),
    status: 'paid',
    paymentMethod: 'cheque',
    referenceNumber: 'CHK-0091',
    notes: 'Partial plinth payment',
    recordedBy: owner._id,
  },
]);

const welder = await Worker.create({
  projectId: project._id,
  name: 'Shafi Muhammad',
  role: 'bar bender / welder',
  dailyWage: 3500,
  phone: '+92 300 1112223',
});
const mason = await Worker.create({
  projectId: project._id,
  name: 'Gul Rehman',
  role: 'mason (raj mistri)',
  dailyWage: 4200,
  phone: '+92 333 9998877',
});
const helper = await Worker.create({
  projectId: project._id,
  name: 'Imran (mazdoor)',
  role: 'helper',
  dailyWage: 2000,
  phone: '+92 345 5554433',
});

const att = [];
for (let d = 1; d <= 10; d++) {
  const date = new Date(Date.UTC(2026, 7, d));
  att.push({ workerId: welder._id, projectId: project._id, date, status: d === 4 ? 'absent' : 'present', checkInTime: date });
  att.push({ workerId: mason._id, projectId: project._id, date, status: 'present', checkInTime: date });
  if (d % 2 === 0)
    att.push({ workerId: helper._id, projectId: project._id, date, status: 'present', checkInTime: date });
}
await Attendance.insertMany(att);

const cement = await Material.create({ projectId: project._id, name: 'Cement (Chilata DTEC)', unit: 'bags', totalIn: 900, totalUsed: 640, remaining: 260 });
const steel = await Material.create({ projectId: project._id, name: 'Sui Steel 16mm', unit: 'tons', totalIn: 42.5, totalUsed: 31.2, remaining: 11.3 });
const bricks = await Material.create({ projectId: project._id, name: 'Awan bricks', unit: 'pieces', totalIn: 65000, totalUsed: 41250, remaining: 23750 });

await MaterialLog.create([
  { projectId: project._id, materialId: cement._id, type: 'IN', quantity: 500, date: new Date('2026-07-05'), note: 'Truck load 1 - invoice 4411', createdBy: owner._id },
  { projectId: project._id, materialId: cement._id, type: 'IN', quantity: 400, date: new Date('2026-08-02'), note: 'Truck load 2', createdBy: owner._id },
  { projectId: project._id, materialId: cement._id, type: 'OUT', quantity: 320, date: new Date('2026-07-20'), note: 'Foundation casting', createdBy: contractor._id },
  { projectId: project._id, materialId: steel._id, type: 'IN', quantity: 25, date: new Date('2026-07-08'), note: '', createdBy: owner._id },
  { projectId: project._id, materialId: steel._id, type: 'OUT', quantity: 18.4, date: new Date('2026-08-11'), note: 'Column + slab reinforcement', createdBy: contractor._id },
  { projectId: project._id, materialId: bricks._id, type: 'OUT', quantity: 41250, date: new Date('2026-09-01'), note: 'Ground floor walls', createdBy: contractor._id },
]);

await Expense.create([
  { companyId: company._id, projectId: project._id, category: 'material', amount: 4200000, description: 'Cement + steel supply', date: new Date('2026-07-06'), status: 'approved', addedBy: owner._id, reviewedBy: owner._id },
  { companyId: company._id, projectId: project._id, category: 'labor', amount: 780000, description: 'Labour wages July', date: new Date('2026-07-31'), status: 'approved', addedBy: owner._id, reviewedBy: owner._id },
  { companyId: company._id, projectId: project._id, category: 'transport', amount: 95000, description: 'Truck freight , ', date: new Date('2026-08-03'), status: 'pending', addedBy: contractor._id },
  { companyId: company._id, projectId: project._id, category: 'misc', amount: 30000, description: 'Site electricity bill', date: new Date('2026-08-09'), status: 'rejected', addedBy: contractor._id, reviewedBy: owner._id, rejectionReason: 'Bill amount se zyada invoice attach hai' },
]);

const reportImages = [
  b64(png(320, 200, [210, 120, 40]), 'image/png'),
  b64(png(240, 300, [70, 110, 180]), 'image/png'),
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
];
await DailyReport.create([
  {
    projectId: project._id,
    addedBy: contractor._id,
    date: new Date('2026-08-02'),
    description: 'Ground floor slab casting complete howa. Aaj 12 mazdoor hajir thay. 400 bags cement lagi.',
    workType: 'Slab',
    images: reportImages,
    aiAnalysis: { progressDetected: true, delayRisk: false, notes: 'Positive structural progression confirmed.' },
  },
  {
    projectId: project._id,
    addedBy: contractor._id,
    date: new Date('2026-08-05'),
    description: 'Barish ki wajah se kaam ruka. Chhat ki finishing kal hogi.',
    workType: 'Finishing',
    images: [],
    aiAnalysis: { progressDetected: false, delayRisk: true, notes: 'Delay risk identified.' },
  },
  {
    projectId: project._id,
    addedBy: owner._id,
    date: new Date('2026-08-09'),
    description: 'یہ رپورٹ اردو میں لکھی گئی ہے اور slab کی چھائی دکھاتی ہے۔',
    workType: 'Structure',
    images: [b64(GIF, 'image/gif'), b64(png(200, 140, [30, 160, 90]), 'image/png')],
    aiAnalysis: { progressDetected: true, delayRisk: false, notes: 'Standard progress.' },
  },
]);

await Alert.create([
  { projectId: project._id, type: 'budget', message: 'Budget utilisation crossed 60% of approved amount', severity: 'high', isRead: false },
  { projectId: project._id, type: 'material', message: 'Cement remaining 260 bags - reorder suggested', severity: 'medium', isRead: true },
]);

// ---------------- export ----------------
const { buildProjectExport, buildCompanyExport } = await import(`${B}/services/exportData.js`);
const { buildProjectWorkbook, buildCompanyWorkbook } = await import(`${B}/services/exportWorkbook.js`);
const { buildExportPdf } = await import(`${B}/services/exportPdf.js`);

const OUT = process.env.LOCALAPPDATA + '/ConstructOps/export-check';
fs.mkdirSync(OUT, { recursive: true });
const results = [];

async function run(label, fn) {
  try {
    const value = await fn();
    results.push({ label, ok: true, detail: value });
    console.log(`PASS  ${label} -> ${JSON.stringify(value)}`);
  } catch (error) {
    results.push({ label, ok: false, detail: error.message });
    console.log(`FAIL  ${label} -> ${error.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
}

await run('project xlsx (full data)', async () => {
  const data = await buildProjectExport(project._id.toString(), owner);
  const { buffer, warnings } = await buildProjectWorkbook(data);
  const file = path.join(OUT, 'project-full.xlsx');
  fs.writeFileSync(file, buffer);
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return {
    bytes: buffer.length,
    sheets: wb.worksheets.map((w) => `${w.name}:${w.rowCount}`),
    warnings,
    totals: data.totals,
  };
});

await run('project pdf (full data)', async () => {
  const data = await buildProjectExport(project._id.toString(), owner);
  const { buffer, warnings } = await buildExportPdf(data);
  const file = path.join(OUT, 'project-full.pdf');
  fs.writeFileSync(file, buffer);
  const head = buffer.subarray(0, 5).toString();
  const pages = buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length || 0;
  const images = buffer.toString('latin1').match(/\/Subtype\s*\/Image/g)?.length || 0;
  return { bytes: buffer.length, head, pages, images, warnings };
});

await run('project xlsx (EMPTY project, no reports/images)', async () => {
  const data = await buildProjectExport(emptyProject._id.toString(), owner);
  const { buffer, warnings } = await buildProjectWorkbook(data);
  fs.writeFileSync(path.join(OUT, 'project-empty.xlsx'), buffer);
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(OUT, 'project-empty.xlsx'));
  return { bytes: buffer.length, sheets: wb.worksheets.map((w) => `${w.name}:${w.rowCount}`), warnings };
});

await run('project pdf (EMPTY project, no reports/images)', async () => {
  const data = await buildProjectExport(emptyProject._id.toString(), owner);
  const { buffer, warnings } = await buildExportPdf(data);
  fs.writeFileSync(path.join(OUT, 'project-empty.pdf'), buffer);
  return { bytes: buffer.length, pages: buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length || 0, warnings };
});

await run('company xlsx + pdf', async () => {
  const data = await buildCompanyExport(owner);
  const x = await buildCompanyWorkbook(data);
  const p = await buildExportPdf(data);
  fs.writeFileSync(path.join(OUT, 'company.xlsx'), x.buffer);
  fs.writeFileSync(path.join(OUT, 'company.pdf'), p.buffer);
  return {
    projects: data.totals.projects,
    contractorRows: data.contractorMap.length,
    xlsxBytes: x.buffer.length,
    pdfBytes: p.buffer.length,
    pdfPages: p.buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length || 0,
    totals: data.totals,
  };
});

await run('contractor role sees only own project', async () => {
  const own = await buildProjectExport(project._id.toString(), contractor);
  const foreign = await buildProjectExport(rivalProject._id.toString(), contractor);
  const emptyScope = await buildProjectExport(emptyProject._id.toString(), contractor);
  const companyData = await buildCompanyExport(contractor);
  return { ownOk: Boolean(own), rivalBlocked: foreign === null, unassignedBlocked: emptyScope === null, companyProjects: companyData.projects.length };
});

await run('cross-tenant owner blocked', async () => {
  const data = await buildProjectExport(project._id.toString(), rivalOwner);
  return { blocked: data === null };
});

await run('labour maths: presentDays x dailyWage', async () => {
  const data = await buildProjectExport(project._id.toString(), owner);
  return data.workers.map((w) => `${w.name}: ${w.presentDays}x${w.dailyWage}=${w.payableWages}`);
});

await mongoose.disconnect();
console.log('\nFiles in', OUT, ':', fs.readdirSync(OUT).join(', '));
console.log('SUMMARY:', results.filter((r) => r.ok).length, 'pass /', results.filter((r) => !r.ok).length, 'fail');
