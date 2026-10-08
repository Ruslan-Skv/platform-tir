// Печать конкретных ячеек с адресами
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');
const FILE = 'C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx';
const wb = XLSX.readFile(FILE, { cellFormula: true });

function show(sheet, addrs) {
  const ws = wb.Sheets[sheet];
  console.log(`\n=== ${sheet} ===`);
  for (const [addr, label] of addrs) {
    const c = ws[addr];
    if (!c) { console.log(`${addr} (${label}): <empty>`); continue; }
    const v = c.v;
    const f = c.f ? `  [f: ${c.f}]` : '';
    console.log(`${addr} (${label}): ${JSON.stringify(v)}${f}`);
  }
}

// Шапки листов-категорий для контекста
for (const s of ['19', '19м', '19А', '77о', '37о', '77-5050', '37-5050']) {
  const ws = wb.Sheets[s];
  if (!ws) continue;
  console.log(`\n### HEADER ROWS of "${s}" (rows 1-7):`);
  for (let r = 1; r <= 7; r++) {
    const row = [];
    for (let c = 0; c < 50; c++) {
      const addr = XLSX.utils.encode_cell({ r: r - 1, c });
      const cell = ws[addr];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        row.push(`${addr}=${JSON.stringify(cell.v).slice(0, 40)}${cell.f ? '{f=' + cell.f.slice(0, 60) + '}' : ''}`);
      }
    }
    if (row.length) console.log(`R${r}: ` + row.join(' | '));
  }
}

// Точные адреса сводных ячеек листа 19о (строки 1-6, столбцы AN-AW)
show('19о', [
  ['AO1', '?'], ['AP1', '?'], ['AQ1', 'ВС м1+м2?'], ['AR1', '?'],
  ['AO2', '?'], ['AP2', '?'], ['AQ2', 'ВС тек.блок'], ['AQ3', '?'],
  ['AO4', 'ЗпМен период'], ['AP4', 'Зам период'], ['AQ4', 'ВС период'],
  ['AR4', '?'], ['AS4', '?'], ['AT4', '?'], ['AU4', '?'], ['AV4', '?'], ['AW4', '?'],
  ['AR5', 'заключено шт'], ['AS5', 'закрыто шт'], ['AT5', 'сумма закл'], ['AU5', 'сумма закр'],
  ['AV5', 'сумма общих?'], ['AW5', '?'],
  ['AU1', 'label'], ['AV1', 'двери+потолки значение'], ['AU2', 'label'], ['AV2', 'окна значение'], ['AU3', 'label'], ['AV3', 'жалюзи'],
]);
