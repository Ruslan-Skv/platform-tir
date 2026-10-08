// Smoke-тест расчёта з/п напрямую через скомпилированные сервисы (без HTTP/auth).
const { PrismaClient } = require('C:\\Users\\user\\dev\\platform-tir\\backend\\node_modules\\@prisma\\client');
const prisma = new PrismaClient();

const {
  SalarySettingsService,
} = require('C:\\Users\\user\\dev\\platform-tir\\backend\\dist\\src\\admin\\salary\\salary-settings.service');
const {
  SalaryCalculationService,
} = require('C:\\Users\\user\\dev\\platform-tir\\backend\\dist\\src\\admin\\salary\\salary-calculation.service');
const {
  SalaryContractsService,
} = require('C:\\Users\\user\\dev\\platform-tir\\backend\\dist\\src\\admin\\salary\\salary-contracts.service');

async function main() {
  const settings = new SalarySettingsService(prisma);
  const calc = new SalaryCalculationService(prisma);
  const contracts = new SalaryContractsService(prisma);

  // 1) Настройки: посев категорий и глобальной строки
  const s = await settings.getSettings();
  console.log('categories:', s.categories.map((c) => `${c.code}(ВС ${c.vsPercent}%, мен ${c.managerPercent}%, ${c.splitSign}/${c.splitClose})`).join(', '));
  console.log('global:', JSON.stringify(s.global));
  if (s.categories.length < 7) throw new Error('Ожидалось 7 категорий по умолчанию');

  const office = await prisma.office.findFirst({ where: { isActive: true } });
  if (!office) throw new Error('В БД нет активных офисов');
  const windows = s.categories.find((c) => c.code === 'WINDOWS');

  // 2) Тестовый договор: база 100000, заключён и закрыт в периоде, дс +20000 в периоде
  const created = await contracts.create({
    officeId: office.id,
    categoryId: windows.id,
    number: 'SMOKE-TEST-001',
    signedAt: '2026-09-10',
    closedAt: '2026-09-25',
    customerName: 'Тест расчёта',
    managerName: 'Тест Менеджер',
    surveyorName: 'Тест Замерщик',
    baseAmount: 100000,
    extraBills: [{ amount: 20000, date: '2026-09-20', note: 'дс' }],
  });
  console.log('contract created:', created.id);

  try {
    const result = await calc.calculate({ dateFrom: '2026-09-01', dateTo: '2026-09-30' });
    const row = result.rows.find((r) => r.number === 'SMOKE-TEST-001');
    if (!row) throw new Error('Договор не попал в расчёт');
    console.log('row:', JSON.stringify({
      parts: row.parts,
      managerAmount: row.managerAmount,
      surveyorAmount: row.surveyorAmount,
      vsAmount: row.vsAmount,
    }, null, 0));

    const expect = (name, actual, expected) => {
      const ok = Math.abs(actual - expected) < 0.01;
      console.log(`${ok ? 'OK' : 'FAIL'} ${name}: ${actual} (ожидалось ${expected})`);
      if (!ok) process.exitCode = 1;
    };
    expect('managerAmount (з/п менеджера)', row.managerAmount, 3600);
    expect('surveyorAmount (замерщик)', row.surveyorAmount, 3600);
    expect('vsAmount (ВС)', row.vsAmount, 1800);
    expect('totals.vsTotal', result.totals.vsTotal, row.vsAmount);
    expect('byManager[0].amount', result.byManager[0]?.amount ?? 0, 3600);
    expect('stats.signedCount', result.totals.stats.signedCount, 1);
    expect('stats.signedAmount', result.totals.stats.signedAmount, 100000);
    expect('stats.closedAmount', result.totals.stats.closedAmount, 120000);
    console.log('vsByCategory:', result.vsByCategory.filter((v) => v.gross > 0).map((v) => `${v.categoryName}: gross ${v.gross} / net ${v.net}`).join('; '));
  } finally {
    await prisma.salaryContract.delete({ where: { id: created.id } });
    console.log('contract deleted');
  }
}

main()
  .catch((e) => {
    console.error('SMOKE FAIL:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
