// Анализ книги "Новая таблица 2025 (1).xlsx" — расчёт з/п
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');

const FILE = 'C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx';
const wb = XLSX.readFile(FILE, { cellFormula: true });

console.log('SHEETS:');
wb.SheetNames.forEach((n) => {
  const ws = wb.Sheets[n];
  console.log(JSON.stringify(n), '| range:', ws['!ref'], '| merges:', (ws['!merges'] || []).length);
});
