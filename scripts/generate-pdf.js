// Generates the single-page A4 company profile / line card at build time:
// public/downloads/amr-universal-profile.pdf
// Typeset in the house manner with PDFKit's built-in Times/Helvetica.

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const company = require('../src/company-config');

const OUT_DIR = path.join(__dirname, '..', 'public', 'downloads');
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, 'amr-universal-profile.pdf');

const GREEN = '#12291f';
const BRASS = '#9c874f';
const CHARCOAL = '#26251f';
const INK_SOFT = '#56544a';
const IVORY = '#f6f2e9';

const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;   // 595.28
const H = doc.page.height;  // 841.89
const M = 56;               // page margin
const COL = (W - 2 * M - 24) / 2;

// Ivory ground
doc.rect(0, 0, W, H).fill(IVORY);

// ---- Masthead band ----
doc.rect(0, 0, W, 120).fill(GREEN);
doc.rect(M, 26, 44, 44).lineWidth(1.2).stroke(BRASS);
doc.rect(M + 4, 30, 36, 36).lineWidth(0.4).stroke(BRASS);
doc.font('Times-Roman').fontSize(15).fillColor(BRASS).text('AMR', M, 42, { width: 44, align: 'center' });

doc.font('Times-Roman').fontSize(26).fillColor(IVORY).text('AMR Universal LTD', M + 62, 32);
doc.font('Helvetica').fontSize(7.5).fillColor(BRASS)
  .text('INTERNATIONAL TRADING · PAPER & BOARD · FERROUS & NON-FERROUS', M + 62, 66, { characterSpacing: 1.6 });
doc.fillColor('#cfc9b8').text(company.geographies.replace(/·/g, '  ·  '), M + 62, 80, { characterSpacing: 1.6 });

let y = 150;

const smallcaps = (text, x, yy, opts = {}) => {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(BRASS)
    .text(text.toUpperCase(), x, yy, { characterSpacing: 1.8, ...opts });
};
const rule = (x, yy, w) => doc.moveTo(x, yy).lineTo(x + w, yy).lineWidth(0.5).stroke('#c9c2b0');

// ---- Statement ----
doc.font('Times-Roman').fontSize(14.5).fillColor(CHARCOAL)
  .text('We buy and sell paper. We have done so across three continents, in every grade, at every scale.', M, y, { width: W - 2 * M, lineGap: 3 });
y = doc.y + 8;
doc.font('Helvetica').fontSize(9).fillColor(INK_SOFT)
  .text('A discreet, relationship-driven trading house moving physical commodity between mills, printers, converters, foundries and yards. Founded by ' + company.founder + '.', M, y, { width: W - 2 * M, lineGap: 2 });
y = doc.y + 18;
rule(M, y, W - 2 * M);
y += 18;

// ---- Two columns: desks ----
const colText = (x, title, items) => {
  smallcaps(title, x, y);
  let yy = y + 16;
  doc.font('Helvetica').fontSize(8.6).fillColor(CHARCOAL);
  for (const [head, body] of items) {
    doc.font('Times-Roman').fontSize(10.5).fillColor(CHARCOAL).text(head, x, yy, { width: COL });
    yy = doc.y + 1;
    doc.font('Helvetica').fontSize(8.4).fillColor(INK_SOFT).text(body, x, yy, { width: COL, lineGap: 1.5 });
    yy = doc.y + 8;
  }
  return yy;
};

const leftEnd = colText(M, 'Paper & Board — The Primary Desk', [
  ['Prime reels & sheets', 'Testliner, kraftliner, fluting; coated and uncoated woodfree; folding boxboard and other boards. Full runs and regular programmes.'],
  ['Stocklots & side-runs', 'Over-makings, trial runs, non-standard sizes, single-lot clearances — described honestly.'],
  ['Redundant & surplus', 'Aged and cancelled stock purchased outright. Collection anywhere in the UK and Europe, with discretion.'],
  ['Recovered grades', 'Printed and unprinted waste, converter offcuts, baled grades for mill consumption.'],
]);

const rightEnd = colText(M + COL + 24, 'Metals — The Second Desk', [
  ['Steel', 'HMS 1&2, shredded, plate and structural. ISRI basis, containers or bulk, weighbridge tickets supplied.'],
  ['Aluminium', 'Extrusions, castings, UBC, wheels. Clean, segregated, assay on request.'],
  ['Cast iron', 'Machine breaks, engine blocks, demolition arisings. Drained, free of contamination.'],
]);

y = Math.max(leftEnd, rightEnd) + 6;
rule(M, y, W - 2 * M);
y += 18;

// ---- Terms summary ----
smallcaps('Terms, In Brief', M, y);
y += 16;
doc.font('Helvetica').fontSize(8.4).fillColor(INK_SOFT).text(
  'Incoterms® 2020 — EXW, FOB, CIF, DAP.   Payment — LC at sight, CAD, TT against documents.   ' +
  'Weights — certified loading weights, 0.5% franchise.   Claims — fourteen days, on evidence, settled quickly.   ' +
  'Law — England & Wales. Every contract concluded individually.',
  M, y, { width: W - 2 * M, lineGap: 2.5 });
y = doc.y + 18;
rule(M, y, W - 2 * M);
y += 18;

// ---- Contact block ----
smallcaps('The Desk', M, y);
doc.font('Helvetica').fontSize(8.6).fillColor(CHARCOAL)
  .text(company.contact.addressLines.join('\n') + '\n' + company.contact.email + '\n' + company.contact.phone, M, y + 16, { lineGap: 2 });

smallcaps('The Live Desk', M + COL + 24, y);
doc.font('Helvetica').fontSize(8.6).fillColor(CHARCOAL)
  .text('Current lots and material wanted, updated live:\n' + (process.env.BASE_URL || 'https://amr-universal.onrender.com') + '/live-desk', M + COL + 24, y + 16, { width: COL, lineGap: 2 });

// ---- Foot band ----
doc.rect(0, H - 54, W, 54).fill(GREEN);
doc.font('Helvetica').fontSize(6.8).fillColor('#cfc9b8')
  .text(`${company.name} · Registered in ${company.registeredIn} · Company No. ${company.companyNumber} · Registered office: ${company.registeredOffice}`,
    M, H - 36, { width: W - 2 * M, align: 'center', characterSpacing: 0.4 });

doc.end();
console.log('[pdf] wrote ' + OUT);
