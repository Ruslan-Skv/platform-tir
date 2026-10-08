// Дамп листа книги: значения и формулы, компактно, только непустые строки/столбцы
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');
const fs = require('fs');

const FILE = 'C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx';
const sheetName = process.argv[2];
const mode = process.argv[3] || 'values'; // values | formulas

const wb = XLSX.readFile(FILE, { cellFormula: true, cellNF: true });
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error('No sheet:', sheetName);
  process.exit(1);
}

// Найти фактические границы непустых ячеек
let maxR = 0, maxC = 0;
for (const addr of Object.keys(ws)) {
  if (!addr.startsWith('!') && ws[addr] && ws[addr][mode === 'values' ? 'v' : 'f'] !== undefined && ws[addr][mode === 'values' ? 'v' : 'f'] !== null) {
    const c = XLSX.utils.decode_cell(addr);
    if (ws[addr].t !== 'z') {
      maxR = Math.max(maxR, c.r);
      maxC = Math.max(maxC, c.c);
    }
  }
}

const lines = [];
lines.push(`=== SHEET: ${sheetName} | mode: ${mode} | actual: ${XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:maxR,c:maxC}})} ===`);

for (let r = 0; r <= maxR; r++) {
  const cells = [];
  let hasData = false;
  for (let c = 0; c <= maxC; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    let out = '';
    if (cell) {
      let v = mode === 'values' ? cell.v : cell.f;
      if (v !== undefined && v !== null) {
        if (typeof v === 'number' && !Number.isInteger(v)) v = Math.round(v * 10000) / 10000;
        out = String(v);
        hasData = true;
      }
    }
    cells.push(out);
  }
  if (hasData) {
    // обрезать хвостовые пустые
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    lines.push(`R${r + 1}\t` + cells.join('\t'));
  }
}

fs.writeFileSync(`C:\\Users\\user\\dev\\platform-tir\\scripts\\salary-analyze\\dump_${sheetName}_${mode}.txt`, lines.join('\n'), 'utf8');
console.log(`Written dump_${sheetName}_${mode}.txt, ${lines.length} lines`);
