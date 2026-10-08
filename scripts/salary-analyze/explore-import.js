// Разведка перед импортом: офисы в БД + структура листов (колонки, блоки категорий, %ВС по блокам)
const { PrismaClient } = require('C:\\Users\\user\\dev\\platform-tir\\backend\\node_modules\\@prisma\\client');
const prisma = new PrismaClient();
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');

const FILE = 'C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx';

async function main() {
  const offices = await prisma.office.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log('OFFICES in DB:');
  offices.forEach((o) => console.log(`  ${o.id} | ${o.name} | prefix=${o.prefix} | active=${o.isActive}`));

  const cats = await prisma.salaryCategory.findMany();
  console.log('CATEGORIES in DB:', cats.map((c) => `${c.code}:${c.id}`).join(', '));

  const contractsCount = await prisma.salaryContract.count();
  console.log('Existing salary contracts:', contractsCount);

  const wb = XLSX.readFile(FILE, { cellFormula: true });

  // Для 'о' листов: колонки заголовков (строка 6), метки категорий (строки 1-3) и блоки
  for (const sheetName of ['19о', '77о', '37о']) {
    const ws = wb.Sheets[sheetName];
    console.log(`\n=== ${sheetName} ===`);
    // Заголовки строки 6
    const header = {};
    for (let c = 1; c < 55; c++) {
      const addr = XLSX.utils.encode_cell({ r: 5, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'string' && cell.v.trim()) header[XLSX.utils.encode_col(c)] = cell.v.trim();
    }
    console.log('headers R6:', JSON.stringify(header));
    // Метки категорий (ищем в строках 1-3 ячейки с текстом двери/окна/жалюзи)
    for (let r = 0; r < 4; r++) {
      for (let c = 30; c < 55; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'string' && /(двери|окна|жалюзи)/i.test(cell.v)) {
          console.log(`label ${addr}: "${cell.v}" (соседняя формула: ${JSON.stringify(ws[XLSX.utils.encode_cell({ r, c: c + 1 })]?.f)})`);
        }
      }
    }
  }

  // Для -5050: заголовки строки 3 и метки дс в строке 2
  for (const sheetName of ['19-5050', '77-5050', '37-5050']) {
    const ws = wb.Sheets[sheetName];
    console.log(`\n=== ${sheetName} ===`);
    const header = {};
    for (let c = 1; c < 50; c++) {
      const addr = XLSX.utils.encode_cell({ r: 2, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'string' && cell.v.trim()) header[XLSX.utils.encode_col(c)] = cell.v.trim();
    }
    console.log('headers R3:', JSON.stringify(header));
    const dsLabels = [];
    for (let c = 1; c < 50; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'string' && /^дс\d/.test(cell.v.trim())) {
        dsLabels.push(`${XLSX.utils.encode_col(c)}=${cell.v.trim()}`);
      }
    }
    console.log('ds labels R2:', dsLabels.join(', '));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
