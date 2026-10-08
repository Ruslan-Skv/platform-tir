// Построчное сравнение: расчёт из БД против кэша листа 37о за сентябрь 2026
const { PrismaClient } = require('C:\\Users\\user\\dev\\platform-tir\\backend\\node_modules\\@prisma\\client');
const prisma = new PrismaClient();
const XLSX = require('C:\\Users\\user\\dev\\platform-tir\\frontend\\node_modules\\xlsx');
const {
  SalaryCalculationService,
} = require('C:\\Users\\user\\dev\\platform-tir\\backend\\dist\\src\\admin\\salary\\salary-calculation.service');

async function main() {
  const calc = new SalaryCalculationService(prisma);
  const result = await calc.calculate({ dateFrom: '2026-09-01', dateTo: '2026-09-30' });
  const office = await prisma.office.findFirst({ where: { prefix: '37' } });
  const wb = XLSX.readFile('C:\\Users\\user\\Desktop\\Новая таблица 2025 (1).xlsx');
  const ws = wb.Sheets['37о'];

  const rows = result.rows.filter(
    (r) => r.officeId === office.id && ['WINDOWS', 'DOORS_CEILINGS', 'BLINDS'].includes(r.categoryCode),
  );
  for (const row of rows) {
    const contract = await prisma.salaryContract.findUnique({ where: { id: row.id } });
    const m = contract?.note?.match(/строка (\d+)/);
    if (!m) {
      console.log('нет note:', row.number);
      continue;
    }
    const r = +m[1];
    const cachedMgr = ws[`AN${r}`]?.v; // З/п менеджер (кэш)
    const sheetMgr = typeof cachedMgr === 'number' ? cachedMgr : 0;
    const diff = Math.abs(sheetMgr - row.managerAmount);
    console.log(
      `row ${String(r).padStart(3)} №${row.number.padEnd(12)} dbMgr=${String(row.managerAmount).padEnd(9)} sheetMgr=${sheetMgr.toFixed(2).padEnd(9)} ${diff > 0.01 ? '<<< DIFF ' + diff.toFixed(2) : 'ok'}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
