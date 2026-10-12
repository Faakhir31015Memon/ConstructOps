import ExcelJS from 'exceljs';

const ACCENT = 'FFFF6B00';
const DARK = 'FF1E1E1E';
const MONEY = '#,##0';
const DATE = 'yyyy-mm-dd';
const DATETIME = 'yyyy-mm-dd hh:mm';

const MAX_EMBED_BYTES = 12 * 1024 * 1024;
const MAX_EMBED_IMAGES = 80;

const detectExtension = (buffer) => {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
  if (buffer.length > 3 && buffer[0] === 0x47 && buffer[1] === 0x49) return 'gif';
  return null;
};

export function decodeImage(src) {
  if (typeof src !== 'string') return null;
  const match = src.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,([\s\S]+)$/);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[1], 'base64');
    const extension = detectExtension(buffer);
    if (!extension) return null;
    return { buffer, extension };
  } catch {
    return null;
  }
}

const isRemote = (src) => typeof src === 'string' && /^https?:\/\//i.test(src);

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
}

function addTableSheet(wb, name, columns, rows) {
  const sheet = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns;
  styleHeader(sheet.getRow(1));
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((col) => {
    let width = String(col.header || '').length + 4;
    sheet.eachRow((row, i) => {
      if (i === 1) return;
      const value = row.getCell(col.key).value;
      const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
      width = Math.max(width, Math.min(text.length + 2, 46));
    });
    col.width = width;
  });
  return sheet;
}

function addSummarySheet(wb, blocks) {
  const sheet = wb.addWorksheet('Summary');
  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 44;
  for (const block of blocks) {
    const titleRow = sheet.addRow([block.title]);
    titleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
    for (const [label, value, fmt] of block.rows) {
      const row = sheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      if (fmt) row.getCell(2).numFmt = fmt;
    }
    sheet.addRow([]);
  }
  return sheet;
}

function addPhotosSheet(wb, reports, warnings) {
  const sheet = wb.addWorksheet('Site Photos');
  sheet.addRow(['Captions appear above each embedded image. Remote links are listed, not downloaded.']).font = {
    italic: true,
  };
  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 24;

  let embedded = 0;
  let bytes = 0;
  let row = 4;

  for (const report of reports) {
    for (const src of report.images || []) {
      const caption = `${report.date?.slice?.(0, 10) || ''} — ${report.workType || ''} — ${report.addedBy || ''}`;
      if (isRemote(src)) {
        const linkRow = sheet.getRow(row);
        linkRow.values = [caption, 'remote image', ''];
        const cell = linkRow.getCell(3);
        cell.value = { text: src.slice(0, 120), hyperlink: src };
        cell.font = { color: { argb: 'FF0563C1' }, underline: true };
        row += 1;
        continue;
      }
      const image = decodeImage(src);
      if (!image) {
        warnings.push(`Skipped an unsupported image format in the report of ${report.date}`);
        continue;
      }
      if (embedded >= MAX_EMBED_IMAGES || bytes + image.buffer.length > MAX_EMBED_BYTES) {
        warnings.push(
          `Image embed cap reached (${MAX_EMBED_IMAGES} images / ${Math.round(MAX_EMBED_BYTES / 1024 / 1024)} MB); remaining photos are in the app`
        );
        return sheet;
      }
      const captionRow = sheet.getRow(row);
      captionRow.values = [caption, `${(image.buffer.length / 1024).toFixed(0)} KB`, ''];
      captionRow.font = { bold: true };
      sheet.addImage(wb.addImage(image), 'B' + (row + 1) + ':F' + (row + 10));
      embedded += 1;
      bytes += image.buffer.length;
      row += 11;
    }
  }

  if (!embedded) sheet.addRow(['No site photos were attached to any daily report of this project.']);
  return sheet;
}

export async function buildProjectWorkbook(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ConstructOps';
  wb.created = new Date();
  const warnings = [];

  addSummarySheet(wb, [
    {
      title: 'Project',
      rows: [
        ['Project', data.project.name],
        ['Location', data.project.location],
        ['Status', data.project.status],
        ['Progress %', data.project.progress, '0"%"'],
        ['Start date', data.project.startDate, DATE],
        ['Target end date', data.project.endDate, DATE],
        ['Company', data.project.company],
        ['Owner', `${data.owner.name}${data.owner.email ? ` (${data.owner.email})` : ''}`],
      ],
    },
    {
      title: 'Money',
      rows: [
        ['Approved project budget', data.totals.budget, MONEY],
        ['Contractor contract value', data.totals.contractValue, MONEY],
        ['Paid to contractors', data.totals.paidToContractors, MONEY],
        ['Approved expenses', data.totals.approvedExpenses, MONEY],
        ['Pending expenses', data.totals.pendingExpenses, MONEY],
        ['Rejected expenses', data.totals.rejectedExpenses, MONEY],
        ['Labour cost (present days x wage)', data.totals.labourCost, MONEY],
        ['Budget left vs contract', data.totals.budget - data.totals.contractValue, MONEY],
      ],
    },
    {
      title: 'Site activity',
      rows: [
        ['Contractors on this project', data.totals.contractorCount],
        ['Workers (labour)', data.totals.workerCount],
        ['Labour present-days', data.totals.labourPresentDays],
        ['Material quantity purchased', data.totals.materialPurchased],
        ['Material quantity used', data.totals.materialUsed],
        ['Material remaining', data.totals.materialRemaining],
        ['Days with reports', data.totals.reportDays],
        ['Photos attached', data.totals.reportImages],
        ['Open alerts', data.totals.openAlerts],
        ['Generated at', data.meta.generatedAt, DATETIME],
        ['Generated by', `${data.meta.generatedBy.name} (${data.meta.generatedBy.role})`],
      ],
    },
  ]);

  addTableSheet(
    wb,
    'Contractors',
    [
      { header: 'Contractor', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Account status', key: 'accountStatus' },
      { header: 'Role on project', key: 'roleOnProject' },
      { header: 'Assigned on', key: 'assignedOn' },
      { header: 'Assigned by', key: 'assignedBy' },
      { header: 'Contract amount', key: 'contractAmount' },
      { header: 'Paid', key: 'paidTotal' },
      { header: 'Balance', key: 'balance' },
      { header: 'Contract status', key: 'contractStatus' },
      { header: 'Terms', key: 'terms' },
    ],
    data.contractors
  );

  addTableSheet(
    wb,
    'Milestones',
    [
      { header: 'Contractor', key: 'contractor' },
      { header: 'Milestone', key: 'title' },
      { header: 'Amount', key: 'amount' },
      { header: 'Due date', key: 'dueDate' },
      { header: 'Status', key: 'status' },
    ],
    data.contractors.flatMap((c) => c.milestones.map((m) => ({ contractor: c.name, ...m })))
  );

  const workerSheet = addTableSheet(
    wb,
    'Labour',
    [
      { header: 'Worker name', key: 'name' },
      { header: 'Work / role', key: 'role' },
      { header: 'Daily wage', key: 'dailyWage' },
      { header: 'Phone', key: 'phone' },
      { header: 'Present days', key: 'presentDays' },
      { header: 'Absent days', key: 'absentDays' },
      { header: 'Payable wages', key: 'payableWages' },
      { header: 'On project since', key: 'joinedOn' },
    ],
    data.workers
  );
  workerSheet.getColumn('dailyWage').numFmt = MONEY;
  workerSheet.getColumn('payableWages').numFmt = MONEY;

  const attendanceSheet = addTableSheet(
    wb,
    'Attendance',
    [
      { header: 'Date', key: 'date' },
      { header: 'Worker', key: 'worker' },
      { header: 'Work / role', key: 'workerRole' },
      { header: 'Status', key: 'status' },
      { header: 'Check-in', key: 'checkIn' },
    ],
    data.attendance
  );
  attendanceSheet.getColumn('date').numFmt = DATE;
  attendanceSheet.getColumn('checkIn').numFmt = DATETIME;

  addTableSheet(
    wb,
    'Materials',
    [
      { header: 'Material', key: 'name' },
      { header: 'Unit', key: 'unit' },
      { header: 'Total received', key: 'totalIn' },
      { header: 'Total used', key: 'totalUsed' },
      { header: 'Remaining', key: 'remaining' },
    ],
    data.materials
  );

  const logSheet = addTableSheet(
    wb,
    'Material movement',
    [
      { header: 'Date', key: 'date' },
      { header: 'Material', key: 'material' },
      { header: 'Unit', key: 'unit' },
      { header: 'Type', key: 'type' },
      { header: 'Quantity', key: 'quantity' },
      { header: 'Note', key: 'note' },
      { header: 'Recorded by', key: 'by' },
    ],
    data.materialLogs
  );
  logSheet.getColumn('date').numFmt = DATETIME;

  const expenseSheet = addTableSheet(
    wb,
    'Expenses',
    [
      { header: 'Date', key: 'date' },
      { header: 'Category', key: 'category' },
      { header: 'Amount', key: 'amount' },
      { header: 'Description', key: 'description' },
      { header: 'Status', key: 'status' },
      { header: 'Added by', key: 'addedBy' },
      { header: 'Reviewed by', key: 'reviewedBy' },
      { header: 'Rejection reason', key: 'rejectionReason' },
    ],
    data.expenses
  );
  expenseSheet.getColumn('amount').numFmt = MONEY;
  expenseSheet.getColumn('date').numFmt = DATE;

  const paymentSheet = addTableSheet(
    wb,
    'Contractor payments',
    [
      { header: 'Payment date', key: 'paymentDate' },
      { header: 'Paid to', key: 'contractor' },
      { header: 'Amount', key: 'amount' },
      { header: 'Status', key: 'status' },
      { header: 'Method', key: 'method' },
      { header: 'Reference', key: 'reference' },
      { header: 'Notes', key: 'notes' },
      { header: 'Recorded by', key: 'recordedBy' },
    ],
    data.payments
  );
  paymentSheet.getColumn('amount').numFmt = MONEY;
  paymentSheet.getColumn('paymentDate').numFmt = DATE;

  const reportSheet = addTableSheet(
    wb,
    'Daily reports',
    [
      { header: 'Date', key: 'date' },
      { header: 'Work type', key: 'workType' },
      { header: 'Description', key: 'description' },
      { header: 'Reported by', key: 'addedBy' },
      { header: 'Photos', key: 'photoCount' },
      { header: 'Photo links (remote)', key: 'remoteLinks' },
      { header: 'Delay risk', key: 'delayRisk' },
      { header: 'Analysis note', key: 'aiNotes' },
    ],
    data.reports.map((r) => ({
      date: r.date,
      workType: r.workType,
      description: r.description,
      addedBy: r.addedBy,
      photoCount: (r.images || []).length,
      remoteLinks: (r.images || []).filter(isRemote).join(' | '),
      delayRisk: r.delayRisk ? 'yes' : 'no',
      aiNotes: r.aiNotes,
    }))
  );
  reportSheet.getColumn('date').numFmt = DATE;

  addPhotosSheet(wb, data.reports, warnings);

  addTableSheet(
    wb,
    'Alerts',
    [
      { header: 'Created', key: 'createdAt' },
      { header: 'Type', key: 'type' },
      { header: 'Severity', key: 'severity' },
      { header: 'Message', key: 'message' },
      { header: 'Read', key: 'isRead' },
    ],
    data.alerts
  );

  if (warnings.length) {
    const sheet = wb.addWorksheet('Export notes');
    sheet.getColumn(1).width = 110;
    for (const warning of [...new Set(warnings)]) sheet.addRow([warning]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), warnings };
}

export async function buildCompanyWorkbook(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ConstructOps';
  wb.created = new Date();

  addSummarySheet(wb, [
    {
      title: 'Company',
      rows: [
        ['Company', data.company?.name || data.title],
        ['Plan', data.company?.plan || '-'],
        ['Owner', `${data.owner?.name || '-'}${data.owner?.email ? ` (${data.owner.email})` : ''}`],
        ['Projects', data.totals.projects],
        ['Total budget', data.totals.budget, MONEY],
        ['Contractor contract value', data.totals.contractValue, MONEY],
        ['Paid to contractors', data.totals.paidToContractors, MONEY],
        ['Approved expenses', data.totals.approvedExpenses, MONEY],
        ['Pending expenses', data.totals.pendingExpenses, MONEY],
        ['Labour present-days', data.totals.labourPresentDays],
        ['Workers', data.totals.workers],
        ['Contractors', data.totals.contractors],
        ['Material remaining (units)', data.totals.materialRemaining],
        ['Report days', data.totals.reportDays],
        ['Photos attached', data.totals.reportImages],
        ['Open alerts', data.totals.openAlerts],
        ['Generated at', data.meta.generatedAt, DATETIME],
        ['Generated by', `${data.meta.generatedBy.name} (${data.meta.generatedBy.role})`],
      ],
    },
  ]);

  const projectSheet = addTableSheet(
    wb,
    'Projects',
    [
      { header: 'Project', key: 'name' },
      { header: 'Location', key: 'location' },
      { header: 'Status', key: 'status' },
      { header: 'Progress %', key: 'progress' },
      { header: 'Budget', key: 'budget' },
      { header: 'Spent (recorded)', key: 'spent' },
      { header: 'Start', key: 'startDate' },
      { header: 'Target end', key: 'endDate' },
    ],
    data.projects
  );
  projectSheet.getColumn('budget').numFmt = MONEY;
  projectSheet.getColumn('spent').numFmt = MONEY;

  addTableSheet(
    wb,
    'Contractor to project',
    [
      { header: 'Contractor', key: 'contractor' },
      { header: 'Email', key: 'email' },
      { header: 'Project', key: 'project' },
      { header: 'Project status', key: 'projectStatus' },
      { header: 'Project budget', key: 'projectBudget' },
      { header: 'Contract amount', key: 'contractAmount' },
      { header: 'Paid', key: 'paid' },
      { header: 'Balance', key: 'balance' },
    ],
    data.contractorMap.flatMap((c) =>
      (c.projects || []).map((p) => ({
        contractor: c.name,
        email: c.email,
        project: p.name,
        projectStatus: p.status,
        projectBudget: p.budget,
        contractAmount: c.contractAmount,
        paid: c.paidTotal,
        balance: c.balance,
      }))
    )
  );

  const milestoneSheet = addTableSheet(
    wb,
    'Milestones',
    [
      { header: 'Contractor', key: 'contractor' },
      { header: 'Project', key: 'project' },
      { header: 'Milestone', key: 'title' },
      { header: 'Amount', key: 'amount' },
      { header: 'Due date', key: 'dueDate' },
      { header: 'Status', key: 'status' },
    ],
    data.contractorMap.flatMap((c) => c.milestones.map((m) => ({ contractor: c.name, ...m })))
  );
  milestoneSheet.getColumn('amount').numFmt = MONEY;

  addTableSheet(
    wb,
    'Workers',
    [
      { header: 'Project', key: 'project' },
      { header: 'Worker', key: 'name' },
      { header: 'Work / role', key: 'role' },
      { header: 'Daily wage', key: 'dailyWage' },
      { header: 'Present days', key: 'presentDays' },
      { header: 'Payable wages', key: 'payableWages' },
    ],
    data.bundles.flatMap((b) => b.workers.map((w) => ({ project: b.project.name, ...w })))
  );

  addTableSheet(
    wb,
    'Materials',
    [
      { header: 'Project', key: 'project' },
      { header: 'Material', key: 'name' },
      { header: 'Unit', key: 'unit' },
      { header: 'Received', key: 'totalIn' },
      { header: 'Used', key: 'totalUsed' },
      { header: 'Remaining', key: 'remaining' },
    ],
    data.bundles.flatMap((b) => b.materials.map((m) => ({ project: b.project.name, ...m })))
  );

  const expenseSheet = addTableSheet(
    wb,
    'Expenses',
    [
      { header: 'Project', key: 'project' },
      { header: 'Date', key: 'date' },
      { header: 'Category', key: 'category' },
      { header: 'Amount', key: 'amount' },
      { header: 'Description', key: 'description' },
      { header: 'Status', key: 'status' },
      { header: 'Added by', key: 'addedBy' },
    ],
    data.bundles.flatMap((b) => b.expenses.map((e) => ({ project: b.project.name, ...e })))
  );
  expenseSheet.getColumn('amount').numFmt = MONEY;

  const paymentSheet = addTableSheet(
    wb,
    'Contractor payments',
    [
      { header: 'Project', key: 'project' },
      { header: 'Date', key: 'paymentDate' },
      { header: 'Paid to', key: 'contractor' },
      { header: 'Amount', key: 'amount' },
      { header: 'Method', key: 'method' },
      { header: 'Reference', key: 'reference' },
    ],
    data.bundles.flatMap((b) => b.payments.map((p) => ({ project: b.project.name, ...p })))
  );
  paymentSheet.getColumn('amount').numFmt = MONEY;

  addTableSheet(
    wb,
    'Daily reports',
    [
      { header: 'Project', key: 'project' },
      { header: 'Date', key: 'date' },
      { header: 'Work type', key: 'workType' },
      { header: 'Description', key: 'description' },
      { header: 'Reported by', key: 'addedBy' },
      { header: 'Photos', key: 'photos' },
    ],
    data.bundles.flatMap((b) =>
      b.reports.map((r) => ({
        project: b.project.name,
        date: r.date,
        workType: r.workType,
        description: r.description,
        addedBy: r.addedBy,
        photos: (r.images || []).length,
      }))
    )
  );

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), warnings: [] };
}
