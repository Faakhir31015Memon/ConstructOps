import ExcelJS from 'exceljs';
import fs from 'fs';
const OUT = process.env.LOCALAPPDATA + '/ConstructOps/export-check';
for (const f of ['http-project.xlsx', 'http-company.xlsx']) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(OUT + '/' + f);
  const imgs = wb.model.media ? wb.model.media.length : 0;
  console.log(f, '-> sheets:', wb.worksheets.map((w) => `${w.name}(${w.rowCount})`).join(', '), '| media items:', imgs);
}
const pdf = fs.readFileSync(OUT + '/http-project.pdf').toString('latin1');
console.log('pdf head', JSON.stringify(pdf.slice(0, 8)), 'eof', pdf.trimEnd().endsWith('%%EOF'),
  'images', (pdf.match(/\/Subtype\s*\/Image/g) || []).length,
  'pages', (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length,
  'latin-safe note', /non-Latin characters/.test(pdf));
