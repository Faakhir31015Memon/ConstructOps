import PDFDocument from 'pdfkit';
import { decodeImage } from './exportWorkbook.js';

const MARGIN = 34;
const ACCENT = '#F97316';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#D1D5DB';

const MAX_PDF_IMAGES = 24;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

const SUPPORTED = /^[\x20-\x7E¡-ÿ€–—‘’“”•…¬±°©®™×÷]+$/;

const toLatin = (value, notes) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (SUPPORTED.test(str)) return str;
  let out = '';
  let hidden = 0;
  for (const ch of str) {
    if (ch.charCodeAt(0) < 32) continue;
    if (/^[\x20-\x7E¡-ÿ€–—‘’“”•…¬±°©®™×÷]$/.test(ch)) out += ch;
    else hidden += 1;
  }
  if (hidden) {
    notes.nonLatin = true;
    return `${out}${out ? ' ' : ''}[${hidden} non-Latin characters - full text in the Excel file]`;
  }
  return out;
};

const money = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)).toLocaleString('en-US') : '0');
const shortDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-');
const dateTime = (d) => (d ? `${shortDate(d)} ${new Date(d).toISOString().slice(11, 16)}` : '-');
const boolText = (v) => (v ? 'yes' : 'no');

const text = (v, notes) => toLatin(v, notes);

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}...` : str;
}

class PdfReport {
  constructor(doc, notes) {
    this.doc = doc;
    this.notes = notes;
    this.pageCount = 0;
    this.doc.on('pageAdded', () => {
      this.pageCount += 1;
      this.drawPageChrome();
    });
  }

  get left() {
    return MARGIN;
  }

  get contentWidth() {
    return this.doc.page.width - MARGIN * 2;
  }

  get bottom() {
    return this.doc.page.height - MARGIN - 26;
  }

  drawPageChrome() {
    const doc = this.doc;
    const { width, height } = doc.page;
    doc.save();
    doc.rect(0, 0, width, 4).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
    doc.text(this.headerText || 'ConstructOps report', MARGIN, 12, { width: width - MARGIN * 2 - 90, lineBreak: false });
    doc.font('Helvetica').fontSize(8).text(
      `Page ${this.pageCount} - ${this.footerText || ''}`,
      width - MARGIN - 200,
      12,
      { width: 200, align: 'right', lineBreak: false }
    );
    doc.restore();
    doc.y = 34;
  }

  space(amount = 8) {
    this.doc.y += amount;
  }

  ensure(height) {
    if (this.doc.y + height > this.bottom) this.doc.addPage();
  }

  section(title) {
    this.ensure(46);
    const doc = this.doc;
    this.space(6);
    doc.rect(MARGIN, doc.y, this.contentWidth, 20).fill('#F3F4F6');
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(10.5);
    doc.text(title.toUpperCase(), MARGIN + 6, doc.y + 5, { continued: false, lineBreak: false });
    doc.fillColor(INK);
    this.space(8);
  }

  keyValueRows(pairs, firstWidth = 250, secondWidth = 300) {
    const doc = this.doc;
    for (const [label, value] of pairs) {
      this.ensure(16);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK);
      doc.text(label, MARGIN, doc.y, { width: firstWidth, lineBreak: false });
      doc.font('Helvetica').fontSize(9);
      const x = MARGIN + firstWidth;
      const y = doc.y;
      doc.text(truncate(text(value, this.notes), 120), x, y, { width: secondWidth, lineBreak: false });
      doc.moveDown(0.25);
    }
  }

  table(columns, rows, emptyMessage) {
    const doc = this.doc;
    const unit = this.contentWidth / columns.reduce((s, c) => s + c.weight, 0);
    const widths = columns.map((c) => c.weight * unit);

    if (!rows.length) {
      this.ensure(20);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED);
      doc.text(emptyMessage, MARGIN, doc.y);
      doc.fillColor(INK);
      this.space(6);
      return;
    }

    const drawHeader = () => {
      this.ensure(20);
      const y = doc.y;
      doc.rect(MARGIN, y, this.contentWidth, 17).fill(INK);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
      let x = MARGIN;
      columns.forEach((col, i) => {
        doc.text(col.label, x + 4, y + 5, { width: widths[i] - 8, lineBreak: false, align: col.align });
        x += widths[i];
      });
      doc.fillColor(INK);
      doc.y = y + 17;
    };

    drawHeader();

    rows.forEach((row, index) => {
      const cells = columns.map((col, i) => {
        const raw = col.get(row, index);
        const value = raw === null || raw === undefined ? '-' : typeof raw === 'number' ? money(raw) : String(raw);
        return truncate(text(value, this.notes), col.max || 90);
      });

      const heights = cells.map((cell, i) =>
        doc.font('Helvetica').fontSize(8).heightOfString(cell, { width: widths[i] - 8 })
      );
      const rowHeight = Math.max(...heights, 10) + 6;

      if (doc.y + rowHeight > this.bottom) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      if (index % 2 === 1) doc.rect(MARGIN, y, this.contentWidth, rowHeight).fill('#F9FAFB').fillColor(INK);
      let x = MARGIN;
      doc.font('Helvetica').fontSize(8).fillColor(INK);
      cells.forEach((cell, i) => {
        doc.text(cell, x + 4, y + 4, { width: widths[i] - 8, lineBreak: 'word', align: columns[i].align });
        x += widths[i];
      });
      doc.rect(MARGIN, y + rowHeight, this.contentWidth, 0.5).fill(LINE).fillColor(INK);
      doc.y = y + rowHeight + 1;
    });

    this.space(4);
  }

  photoBlock(reports) {
    const doc = this.doc;
    let embedded = 0;
    let bytes = 0;
    let skippedFormats = 0;
    let remoteLinks = 0;

    for (const report of reports) {
      const images = (report.images || []).slice(0, 3);
      if (report.images?.length > 3) this.notes.morePhotos = true;

      const items = [];
      for (const src of images) {
        if (/^https?:\/\//i.test(src)) {
          remoteLinks += 1;
          continue;
        }
        const image = decodeImage(src);
        if (!image || image.extension === 'gif') {
          skippedFormats += 1;
          continue;
        }
        items.push(image);
      }
      if (!items.length) continue;

      this.ensure(200);
      const caption = `${shortDate(report.date)} - ${report.workType} - ${truncate(report.description, 80)}`;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(ACCENT);
      doc.text(text(caption, this.notes), MARGIN, doc.y, { width: this.contentWidth, lineBreak: 'word' });

      const gap = 8;
      const slotWidth = (this.contentWidth - gap * (items.length - 1)) / items.length;
      const top = doc.y + 3;
      let x = MARGIN;
      let maxHeight = 0;

      for (const image of items) {
        if (embedded >= MAX_PDF_IMAGES || bytes + image.buffer.length > MAX_PDF_BYTES) {
          this.notes.imageCap = true;
          break;
        }
        try {
          const size = doc.openImage(image.buffer);
          const scale = Math.min(slotWidth / size.width, 180 / size.height, 1);
          const drawWidth = size.width * scale;
          const drawHeight = size.height * scale;
          doc.image(image.buffer, x, top, { fit: [drawWidth, drawHeight] });
          x += drawWidth + gap;
          maxHeight = Math.max(maxHeight, drawHeight);
          embedded += 1;
          bytes += image.buffer.length;
        } catch (error) {
          skippedFormats += 1;
          this.notes.badImage = error.message;
          x += slotWidth + gap;
        }
      }

      doc.y = top + Math.max(maxHeight, 10) + 8;
      doc.fillColor(INK);
    }

    this.ensure(24);
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTED);
    if (embedded === 0) {
      doc.text('No site photos could be embedded for this project (no images attached, or only remote links).', MARGIN, doc.y);
    } else {
      const bits = [`${embedded} photo(s) embedded`];
      if (remoteLinks) bits.push(`${remoteLinks} remote link(s) listed in the Daily reports table instead`);
      if (skippedFormats) bits.push(`${skippedFormats} unsupported image(s) skipped`);
      doc.text(bits.join(' - '), MARGIN, doc.y);
    }
    doc.fillColor(INK);
    this.space(6);
  }

  finalize() {
    const doc = this.doc;
    const notes = [];
    notes.push(`Generated by ${this.by} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
    if (this.notes.nonLatin) notes.push('Some descriptions used non-Latin script; PDF text is Latin-safe, the Excel file keeps the original script.');
    if (this.notes.morePhotos) notes.push('Only the first 3 photos per daily report are embedded in the PDF. The Excel file embeds up to 80.');
    if (this.notes.imageCap) notes.push('PDF image limit reached; remaining photos are available in the Excel export and in the app.');
    if (this.notes.badImage) notes.push(`One image could not be decoded: ${this.notes.badImage}`);

    for (let page = 1; page <= doc.bufferedPageRange().count; page += 1) {
      doc.switchToPage(page - 1);
      doc.font('Helvetica').fontSize(7).fillColor(MUTED);
      doc.text(notes.join('   |   '), MARGIN, doc.page.height - 24, {
        width: this.contentWidth,
        lineBreak: false,
      });
    }
    doc.end();
    return notes;
  }
}

function renderProject(doc, report, data) {
  report.section('Project summary');
  report.keyValueRows([
    ['Project', data.project.name],
    ['Location', data.project.location],
    ['Status', `${data.project.status} - ${data.project.progress}% progress`],
    ['Start / target end', `${shortDate(data.project.startDate)} to ${shortDate(data.project.endDate)}`],
    ['Company', data.project.company],
    ['Owner', `${data.owner.name}${data.owner.email ? ` (${data.owner.email})` : ''}`],
  ]);

  report.section('Money summary (PKR)');
  report.keyValueRows([
    ['Approved project budget', money(data.totals.budget)],
    ['Contractor contract value', money(data.totals.contractValue)],
    ['Paid to contractors', money(data.totals.paidToContractors)],
    ['Approved expenses', money(data.totals.approvedExpenses)],
    ['Pending expenses', money(data.totals.pendingExpenses)],
    ['Labour cost (present days x wage)', money(data.totals.labourCost)],
  ], 250, 200);

  report.section('Contractors on this project');
  report.table(
    [
      { label: 'Contractor', weight: 1.6, get: (r) => r.name },
      { label: 'Email', weight: 1.8, get: (r) => r.email },
      { label: 'Assigned on', weight: 1.1, get: (r) => shortDate(r.assignedOn) },
      { label: 'Contract amount', weight: 1.2, align: 'right', get: (r) => r.contractAmount },
      { label: 'Paid', weight: 1.1, align: 'right', get: (r) => r.paidTotal },
      { label: 'Balance', weight: 1.1, align: 'right', get: (r) => r.balance },
      { label: 'Contract status', weight: 1.1, get: (r) => r.contractStatus },
    ],
    data.contractors,
    'No contractor is assigned to this project yet.'
  );

  report.section('Milestones');
  report.table(
    [
      { label: 'Contractor', weight: 1.6, get: (r) => r.contractor },
      { label: 'Milestone', weight: 2.4, get: (r) => r.title, max: 60 },
      { label: 'Amount', weight: 1.2, align: 'right', get: (r) => r.amount },
      { label: 'Due date', weight: 1.1, get: (r) => shortDate(r.dueDate) },
      { label: 'Status', weight: 1, get: (r) => r.status },
    ],
    data.contractors.flatMap((c) => c.milestones.map((m) => ({ contractor: c.name, ...m }))),
    'No milestones recorded on any contract for this project.'
  );

  report.section('Labour (workers, wages, attendance)');
  report.table(
    [
      { label: 'Worker', weight: 1.5, get: (r) => r.name },
      { label: 'Work / role', weight: 1.6, get: (r) => r.role },
      { label: 'Daily wage', weight: 1.1, align: 'right', get: (r) => r.dailyWage },
      { label: 'Phone', weight: 1.2, get: (r) => r.phone },
      { label: 'Present', weight: 0.9, align: 'right', get: (r) => r.presentDays },
      { label: 'Absent', weight: 0.9, align: 'right', get: (r) => r.absentDays },
      { label: 'Payable wages', weight: 1.2, align: 'right', get: (r) => r.payableWages },
    ],
    data.workers,
    'No workers are registered on this project.'
  );

  report.section(`Attendance register (${data.attendance.length} entries)`);
  report.table(
    [
      { label: 'Date', weight: 1.1, get: (r) => shortDate(r.date) },
      { label: 'Worker', weight: 1.6, get: (r) => r.worker },
      { label: 'Work / role', weight: 1.6, get: (r) => r.workerRole },
      { label: 'Status', weight: 1, get: (r) => r.status },
      { label: 'Check-in', weight: 1.3, get: (r) => dateTime(r.checkIn) },
    ],
    data.attendance,
    'No attendance has been marked for this project.'
  );

  report.section('Materials (stock position)');
  report.table(
    [
      { label: 'Material', weight: 2.2, get: (r) => r.name },
      { label: 'Unit', weight: 1, get: (r) => r.unit },
      { label: 'Received', weight: 1.2, align: 'right', get: (r) => r.totalIn },
      { label: 'Used', weight: 1.2, align: 'right', get: (r) => r.totalUsed },
      { label: 'Remaining', weight: 1.2, align: 'right', get: (r) => r.remaining },
    ],
    data.materials,
    'No materials recorded for this project.'
  );

  report.section(`Material movement log (${data.materialLogs.length} entries)`);
  report.table(
    [
      { label: 'Date', weight: 1.2, get: (r) => dateTime(r.date) },
      { label: 'Material', weight: 1.8, get: (r) => r.material },
      { label: 'Type', weight: 0.8, get: (r) => r.type },
      { label: 'Quantity', weight: 1.1, align: 'right', get: (r) => r.quantity },
      { label: 'Unit', weight: 0.8, get: (r) => r.unit },
      { label: 'Note', weight: 2.2, get: (r) => r.note, max: 70 },
      { label: 'Recorded by', weight: 1.3, get: (r) => r.by },
    ],
    data.materialLogs,
    'No material in/out entries recorded.'
  );

  report.section(`Expenses (${data.expenses.length} entries)`);
  report.table(
    [
      { label: 'Date', weight: 1.1, get: (r) => shortDate(r.date) },
      { label: 'Category', weight: 1.1, get: (r) => r.category },
      { label: 'Amount', weight: 1.2, align: 'right', get: (r) => r.amount },
      { label: 'Description', weight: 3, get: (r) => r.description, max: 90 },
      { label: 'Status', weight: 1, get: (r) => r.status },
      { label: 'Added by', weight: 1.3, get: (r) => r.addedBy },
      { label: 'Reviewed by', weight: 1.3, get: (r) => r.reviewedBy },
    ],
    data.expenses,
    'No expenses recorded.'
  );

  report.section('Contractor payments');
  report.table(
    [
      { label: 'Date', weight: 1.2, get: (r) => shortDate(r.paymentDate) },
      { label: 'Paid to', weight: 1.8, get: (r) => r.contractor },
      { label: 'Amount', weight: 1.2, align: 'right', get: (r) => r.amount },
      { label: 'Method', weight: 1.2, get: (r) => r.method },
      { label: 'Status', weight: 1, get: (r) => r.status },
      { label: 'Reference', weight: 1.4, get: (r) => r.reference },
      { label: 'Recorded by', weight: 1.3, get: (r) => r.recordedBy },
    ],
    data.payments,
    'No payments recorded against this project.'
  );

  report.section(`Daily site reports (${data.reports.length} entries)`);
  report.table(
    [
      { label: 'Date', weight: 1.1, get: (r) => shortDate(r.date) },
      { label: 'Work type', weight: 1.2, get: (r) => r.workType },
      { label: 'Description', weight: 4.2, get: (r) => r.description, max: 160 },
      { label: 'Reported by', weight: 1.4, get: (r) => r.addedBy },
      { label: 'Photos', weight: 0.8, align: 'right', get: (r) => (r.images || []).length },
      { label: 'Delay risk', weight: 0.9, get: (r) => boolText(r.delayRisk) },
    ],
    data.reports,
    'No daily reports submitted yet.'
  );

  report.section('Site photos');
  report.photoBlock(data.reports);

  report.section('Alerts');
  report.table(
    [
      { label: 'Created', weight: 1.3, get: (r) => dateTime(r.createdAt) },
      { label: 'Type', weight: 1, get: (r) => r.type },
      { label: 'Severity', weight: 1, get: (r) => r.severity },
      { label: 'Message', weight: 5, get: (r) => r.message, max: 160 },
      { label: 'Read', weight: 0.8, get: (r) => boolText(r.isRead) },
    ],
    data.alerts,
    'No alerts raised on this project.'
  );
}

function renderCompany(doc, report, data) {
  report.section('Company summary');
  report.keyValueRows([
    ['Company', data.company?.name || data.title],
    ['Owner', `${data.owner?.name || '-'}`],
    ['Projects', data.totals.projects],
    ['Total budget', money(data.totals.budget)],
    ['Contractor contract value', money(data.totals.contractValue)],
    ['Paid to contractors', money(data.totals.paidToContractors)],
    ['Workers', data.totals.workers],
    ['Labour present-days', data.totals.labourPresentDays],
    ['Photos attached', data.totals.reportImages],
  ]);

  report.section('Projects');
  report.table(
    [
      { label: 'Project', weight: 2, get: (r) => r.name },
      { label: 'Location', weight: 1.8, get: (r) => r.location },
      { label: 'Status', weight: 1, get: (r) => r.status },
      { label: 'Progress %', weight: 1, align: 'right', get: (r) => r.progress },
      { label: 'Budget', weight: 1.3, align: 'right', get: (r) => r.budget },
      { label: 'Start', weight: 1.1, get: (r) => shortDate(r.startDate) },
      { label: 'Target end', weight: 1.1, get: (r) => shortDate(r.endDate) },
    ],
    data.projects,
    'No projects created yet.'
  );

  report.section('Which contractor got which project (and budget)');
  report.table(
    [
      { label: 'Contractor', weight: 1.6, get: (r) => r.contractor },
      { label: 'Email', weight: 1.8, get: (r) => r.email },
      { label: 'Project', weight: 1.8, get: (r) => r.project },
      { label: 'Project status', weight: 1.1, get: (r) => r.projectStatus },
      { label: 'Project budget', weight: 1.3, align: 'right', get: (r) => r.projectBudget },
      { label: 'Contract amount', weight: 1.3, align: 'right', get: (r) => r.contractAmount },
      { label: 'Paid', weight: 1.1, align: 'right', get: (r) => r.paid },
      { label: 'Balance', weight: 1.1, align: 'right', get: (r) => r.balance },
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
    ),
    'No contractor has been assigned to any project yet.'
  );

  report.section('All workers');
  report.table(
    [
      { label: 'Project', weight: 1.8, get: (r) => r.project },
      { label: 'Worker', weight: 1.5, get: (r) => r.name },
      { label: 'Work / role', weight: 1.6, get: (r) => r.role },
      { label: 'Daily wage', weight: 1.1, align: 'right', get: (r) => r.dailyWage },
      { label: 'Present days', weight: 1.1, align: 'right', get: (r) => r.presentDays },
      { label: 'Payable wages', weight: 1.3, align: 'right', get: (r) => r.payableWages },
    ],
    data.bundles.flatMap((b) => b.workers.map((w) => ({ project: b.project.name, ...w }))),
    'No workers registered across projects.'
  );

  report.section('Material position');
  report.table(
    [
      { label: 'Project', weight: 1.8, get: (r) => r.project },
      { label: 'Material', weight: 2, get: (r) => r.name },
      { label: 'Unit', weight: 0.9, get: (r) => r.unit },
      { label: 'Received', weight: 1.1, align: 'right', get: (r) => r.totalIn },
      { label: 'Used', weight: 1.1, align: 'right', get: (r) => r.totalUsed },
      { label: 'Remaining', weight: 1.1, align: 'right', get: (r) => r.remaining },
    ],
    data.bundles.flatMap((b) => b.materials.map((m) => ({ project: b.project.name, ...m }))),
    'No materials recorded.'
  );

  report.section('Expenses');
  report.table(
    [
      { label: 'Project', weight: 1.6, get: (r) => r.project },
      { label: 'Date', weight: 1.1, get: (r) => shortDate(r.date) },
      { label: 'Category', weight: 1.1, get: (r) => r.category },
      { label: 'Amount', weight: 1.2, align: 'right', get: (r) => r.amount },
      { label: 'Description', weight: 2.6, get: (r) => r.description, max: 80 },
      { label: 'Status', weight: 1, get: (r) => r.status },
    ],
    data.bundles.flatMap((b) => b.expenses.map((e) => ({ project: b.project.name, ...e }))),
    'No expenses recorded.'
  );

  report.section('Contractor payments');
  report.table(
    [
      { label: 'Project', weight: 1.6, get: (r) => r.project },
      { label: 'Date', weight: 1.2, get: (r) => shortDate(r.paymentDate) },
      { label: 'Paid to', weight: 1.6, get: (r) => r.contractor },
      { label: 'Amount', weight: 1.2, align: 'right', get: (r) => r.amount },
      { label: 'Method', weight: 1.2, get: (r) => r.method },
      { label: 'Reference', weight: 1.4, get: (r) => r.reference },
    ],
    data.bundles.flatMap((b) => b.payments.map((p) => ({ project: b.project.name, ...p }))),
    'No payments recorded.'
  );
}

export async function buildExportPdf(data) {
  const notes = {};
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: MARGIN, bufferPages: true });
  doc.info = {
    Title: `ConstructOps ${data.scope} report - ${data.title}`,
    Author: 'ConstructOps',
    Producer: 'ConstructOps',
  };

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const report = new PdfReport(doc, notes);
  report.headerText = `ConstructOps - ${data.title}`;
  report.footerText = `${data.project?.company || data.company?.name || ''}`;
  report.by = `${data.meta.generatedBy.name} (${data.meta.generatedBy.role})`;

  report.pageCount = 1;
  report.drawPageChrome();

  doc.fontSize(9).fillColor(INK);
  if (data.scope === 'project') renderProject(doc, report, data);
  else renderCompany(doc, report, data);
  const noteLines = report.finalize();

  const buffer = await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  return { buffer, warnings: noteLines };
}
