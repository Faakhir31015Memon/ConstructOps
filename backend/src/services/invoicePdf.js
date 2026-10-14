import PDFDocument from 'pdfkit';

const MARGIN = 44;
const ACCENT = '#FF6B00';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';

const money = (value, currency = 'PKR') =>
  `${currency} ${(Math.round(Number(value) || 0)).toLocaleString('en-US')}`;
const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '-');

const sanitize = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  // pdfkit's built-in Helvetica cannot draw non-Latin glyphs.
  return str.replace(/[^\x20-\x7E]/g, '').slice(0, 120);
};

/**
 * Renders a one-page A4 invoice/receipt.
 * doc = { number, kind, issuedAt, dueLabel, from, to, lines, subtotal, tax, total,
 *         currency, method, reference, status, notes }
 */
export const buildInvoicePdf = (doc) =>
  new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: `${doc.kind} ${doc.number}` } });
    const chunks = [];
    let bytes = 0;
    pdf.on('data', (c) => {
      bytes += c.length;
      if (bytes > 6 * 1024 * 1024) {
        pdf.end();
        reject(new Error('Invoice too large'));
        return;
      }
      chunks.push(c);
    });
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const width = pdf.page.width - MARGIN * 2;

    // Header band
    pdf.rect(0, 0, pdf.page.width, 96).fill(ACCENT);
    pdf.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold').text('ConstructOps', MARGIN, 30);
    pdf.fontSize(10).font('Helvetica').text('Construction site management for Pakistani contractors', MARGIN, 62);
    pdf.fontSize(18).font('Helvetica-Bold')
      .text(doc.kind.toUpperCase(), MARGIN, 34, { width, align: 'right' });
    pdf.fontSize(10).font('Helvetica')
      .text(`#${sanitize(doc.number)}`, MARGIN, 58, { width, align: 'right' });

    let y = 130;

    // Parties
    const partyTop = y;
    pdf.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('FROM', MARGIN, partyTop);
    pdf.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(sanitize(doc.from.name), MARGIN, partyTop + 14, { width: width / 2 - 20 });
    pdf.fontSize(9.5).font('Helvetica').fillColor(MUTED)
      .text(sanitize(doc.from.line1), MARGIN, partyTop + 30, { width: width / 2 - 20 })
      .text(sanitize(doc.from.line2 || ''), MARGIN, partyTop + 43, { width: width / 2 - 20 })
      .text(sanitize(doc.from.contact || ''), MARGIN, partyTop + 56, { width: width / 2 - 20 });

    const rightX = MARGIN + width / 2 + 10;
    pdf.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('BILLED TO', rightX, partyTop);
    pdf.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(sanitize(doc.to.name), rightX, partyTop + 14, { width: width / 2 - 20 });
    pdf.fontSize(9.5).font('Helvetica').fillColor(MUTED)
      .text(sanitize(doc.to.line1 || ''), rightX, partyTop + 30, { width: width / 2 - 20 })
      .text(sanitize(doc.to.line2 || ''), rightX, partyTop + 43, { width: width / 2 - 20 })
      .text(sanitize(doc.to.contact || ''), rightX, partyTop + 56, { width: width / 2 - 20 });

    y = partyTop + 84;

    // Meta strip
    pdf.moveTo(MARGIN, y).lineTo(MARGIN + width, y).strokeColor(LINE).stroke();
    y += 12;
    pdf.fontSize(9.5).font('Helvetica');
    const meta = [
      ['Issue date', day(doc.issuedAt)],
      [doc.dueLabel || 'Period', doc.periodLabel || day(doc.dueAt)],
      ['Status', sanitize(doc.status || '-')],
      ['Payment method', sanitize(doc.method || '-')],
    ];
    meta.forEach(([label, value], index) => {
      const colX = MARGIN + (index % 2) * (width / 2);
      const rowY = y + Math.floor(index / 2) * 16;
      pdf.fillColor(MUTED).text(`${label}:`, colX, rowY, { continued: true, width: width / 2 - 4 });
      pdf.fillColor(INK).text(` ${value}`);
    });
    y += 16 * Math.ceil(meta.length / 2) + 16;

    // Line items table
    const cols = [0, width - 260, width - 130, width];
    pdf.rect(MARGIN, y, width, 26).fill('#F3F4F6');
    pdf.fillColor(INK).fontSize(9).font('Helvetica-Bold');
    pdf.text('DESCRIPTION', MARGIN + 8, y + 8);
    pdf.text('QTY', MARGIN + cols[1] + 8, y + 8);
    pdf.text('RATE', MARGIN + cols[2] + 8, y + 8, { width: 96, align: 'right' });
    pdf.text('AMOUNT', MARGIN + cols[3] - 8, y + 8, { width: 96, align: 'right' });
    y += 26;

    pdf.font('Helvetica').fontSize(9.5);
    (doc.lines || []).slice(0, 60).forEach((line) => {
      const rowHeight = 24;
      pdf.fillColor(INK).text(sanitize(line.description), MARGIN + 8, y + 6, { width: cols[1] - 24 });
      pdf.fillColor(MUTED).text(sanitize(line.qty ?? '-'), MARGIN + cols[1] + 8, y + 6);
      pdf.text(line.rate === undefined ? '-' : money(line.rate, doc.currency), MARGIN + cols[2] + 8, y + 6, { width: 96, align: 'right' });
      pdf.fillColor(INK).text(money(line.amount, doc.currency), MARGIN + cols[3] - 8, y + 6, { width: 96, align: 'right' });
      y += rowHeight;
      pdf.moveTo(MARGIN, y).lineTo(MARGIN + width, y).strokeColor(LINE).linewidth(0.5).stroke();
    });

    y += 14;

    // Totals
    const totals = [
      ['Subtotal', money(doc.subtotal ?? doc.total, doc.currency)],
      ...(doc.tax !== undefined && doc.tax !== null ? [['Tax', money(doc.tax, doc.currency)]] : []),
    ];
    totals.forEach(([label, value]) => {
      pdf.fillColor(MUTED).fontSize(9.5).font('Helvetica').text(`${label}`, MARGIN + cols[2], y, { width: 110, align: 'right' });
      pdf.fillColor(INK).text(value, MARGIN + cols[3], y, { width: 104, align: 'right' });
      y += 15;
    });

    pdf.rect(MARGIN + cols[2] - 10, y + 2, width - (cols[2] - 10), 26).fill('#FFF3E8');
    pdf.fillColor(ACCENT).font('Helvetica-Bold').fontSize(12).text('TOTAL DUE', MARGIN + cols[2], y + 9, { width: 110, align: 'right' });
    pdf.fillColor(INK).text(money(doc.total, doc.currency), MARGIN + cols[3], y + 9, { width: 104, align: 'right' });
    y += 40;

    if (doc.reference) {
      pdf.fillColor(MUTED).fontSize(9).font('Helvetica')
        .text(`Reference: ${sanitize(doc.reference)}`, MARGIN, y, { width });
      y += 14;
    }

    if (doc.notes) {
      pdf.fillColor(MUTED).fontSize(9).font('Helvetica').text(sanitize(doc.notes), MARGIN, y, { width });
      y += 28;
    }

    pdf.fillColor('#9CA3AF').fontSize(8).font('Helvetica')
      .text(
        `Generated by ConstructOps on ${new Date().toISOString().slice(0, 10)} — ${sanitize(doc.number)} — this document is a computer-generated invoice and is valid without a signature.`,
        MARGIN,
        Math.min(y + 10, pdf.page.height - 70),
        { width, align: 'left' }
      );

    pdf.end();
  });

export default buildInvoicePdf;
