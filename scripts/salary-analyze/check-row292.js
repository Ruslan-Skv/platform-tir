// Диагностика строки 292 листа 37о (№ 371д-473)
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');
const wb = XLSX.readFile('C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx', { cellFormula: true });
const ws = wb.Sheets['37о'];

const cols = [
  ['B', '% зам'], ['C', '% ВС'], ['D', '% мен'], ['E', 'зам'], ['F', 'м'],
  ['J', 'замерщик'], ['K', 'менеджер'], ['L', '№'], ['M', 'дата закл'], ['N', 'дата закр'],
  ['O', 'ФИО'], ['P', 'изделия'], ['R', 'монтаж'],
  ['S', 'дс1 сумма'], ['T', 'дс1 дата'], ['U', 'дс2 сумма'], ['V', 'дс2 дата'], ['X', 'дс3 сумма'], ['Y', 'дс3 дата'],
  ['AN', 'З/п менеджер кэш'], ['AP', 'ВС кэш'], ['AI', '0.7 часть'], ['AJ', '0.3 часть'],
  ['AK', 'зп дс1'], ['AL', 'зп дс2'], ['AM', 'зп дс3'],
];
for (const r of [292]) {
  console.log(`=== строка ${r} ===`);
  for (const [col, label] of cols) {
    const cell = ws[`${col}${r}`];
    if (cell && (cell.v !== undefined || cell.f)) {
      console.log(`${col}${r} (${label}): v=${JSON.stringify(cell.v)} t=${cell.t}${cell.f ? ' f=' + cell.f : ''}`);
    }
  }
}
// И ячейки периода
console.log('M5 (период с):', JSON.stringify(ws['M5']));
console.log('N5 (период по):', JSON.stringify(ws['N5']));
