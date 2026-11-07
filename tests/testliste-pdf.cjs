// Erzeugt eine Test-PDF im Aufbau der Vorwerk-Kundenliste (Tabelle, Querformat, mehrere Seiten,
// Kopfzeile je Seite, Fußzeile „Seite x von y“, umbrochene Notizen). Alle Namen frei erfunden.
// Nutzung: node tests/testliste-pdf.cjs [ziel.pdf]  – oder require(...).erzeugen()
const fs = require('fs');

const SPALTEN = [
  ['Name', 30], ['Straße', 165], ['PLZ', 285], ['Ort', 325], ['Telefon', 425], ['Sperre', 515], ['EWE', 560], ['EWE-Belegdatum', 600], ['BNW', 690], ['Notizen', 725],
];

const ZEILEN = [
  ['Ahrens, Gisela', 'Lindenweg 3', '38268', 'Lengede', '05344 112233', '', 'ja', '12.03.2025', '1', 'VK7 seit 2023, Tüten'],
  ['Bode, Hartmut', 'Am Sportplatz 7', '38268', 'Lengede', '05344 445566', 'X', '', '', '', 'keine Werbung'],
  ['Fricke, Monika', 'Rosenstraße 12', '31224', 'Peine', '05171 778899', '', 'ja', '01.10.2024', '2', 'Service fällig, bitte im Frühjahr anrufen, Wartung'],
  ['Fricke, Jens', 'Rosenstraße 12', '31224', 'Peine', '05171 778899', '', '', '', '', 'Ehemann, gleicher Haushalt'],
  ['Gödecke, Waltraud', 'Birkenstraße 5', '38159', 'Vechelde', '05302 3344', '', 'nein', '', '', ''],
  ['Gödecke, Waltraud', 'Birkenstraße 5', '38159', 'Vechelde', '', '', '', '', '', 'doppelt in Liste'],
  ['Kassebaum, Uwe', 'Kastanienallee 21', '38226', 'Salzgitter', '05341 909090', '', 'ja', '15.06.2025', '1', 'VT300, Polsterboy'],
];
for (let i = 0; i < 26; i++) ZEILEN.push([`Testkunde${i + 1}, Erika`, `Wiesengrund ${i + 1}`, '31241', 'Ilsede', `05172 ${100000 + i}`, '', i % 3 ? '' : 'ja', i % 3 ? '' : '0' + ((i % 9) + 1) + '.05.2025', String(i % 4), i % 5 ? '' : 'Rückruf erwünscht']);

// WinAnsi: Umlaute als Oktal-Escapes
const win = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[äöüÄÖÜß]/g, (c) => `\\${({ ä: 344, ö: 366, ü: 374, Ä: 304, Ö: 326, Ü: 334, ß: 337 })[c]}`);
const text = (x, y, s, gr = 8) => `BT /F1 ${gr} Tf ${x} ${y} Td (${win(s)}) Tj ET`;

function erzeugen() {
  const proSeite = 20;
  const seiten = [];
  const anzahl = Math.ceil(ZEILEN.length / proSeite);
  for (let s = 0; s < anzahl; s++) {
    const ops = [text(30, 560, `Kundenliste Bezirk Lengede - Stand 07.11.2026`, 12)];
    let y = 530;
    for (const [k, x] of SPALTEN) ops.push(text(x, y, k, 8));
    ops.push(`0.5 w 30 ${y - 4} m 812 ${y - 4} l S`);
    y -= 18;
    for (const z of ZEILEN.slice(s * proSeite, (s + 1) * proSeite)) {
      SPALTEN.forEach(([, x], i) => {
        let v = z[i];
        if (i === 9 && v.length > 30) { const cut = v.lastIndexOf(' ', 30); ops.push(text(x, y - 9, v.slice(cut).trim(), 8)); v = v.slice(0, cut); }
        if (v) ops.push(text(x, y, v, 8));
      });
      y -= z[9].length > 30 ? 24 : 15;
    }
    ops.push(text(400, 20, `Seite ${s + 1} von ${anzahl}`, 8));
    seiten.push(ops.join('\n'));
  }
  // PDF-Objekte
  const obj = [];
  obj.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = seiten.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  obj.push(`<< /Type /Pages /Kids [${kids}] /Count ${seiten.length} >>`);
  obj.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  seiten.forEach((inhalt, i) => {
    obj.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    const bytes = Buffer.from(inhalt, 'latin1');
    obj.push(`<< /Length ${bytes.length} >>\nstream\n${inhalt}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offs = [];
  obj.forEach((o, i) => { offs.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

module.exports = { erzeugen, ZEILEN };
if (require.main === module) {
  const ziel = process.argv[2] || 'testliste.pdf';
  fs.writeFileSync(ziel, erzeugen());
  console.log(`${ziel}: ${ZEILEN.length} Zeilen`);
}
