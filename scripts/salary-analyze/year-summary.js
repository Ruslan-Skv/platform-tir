// Итоговая сводка импортированных данных за 2026 год
const { PrismaClient } = require('C:\\Users\\user\\dev\\platform-tir\\backend\\node_modules\\@prisma\\client');
const prisma = new PrismaClient();
const {
  SalaryCalculationService,
} = require('C:\\Users\\user\\dev\\platform-tir\\backend\\dist\\src\\admin\\salary\\salary-calculation.service');

async function main() {
  const calc = new SalaryCalculationService(prisma);

  const total = await prisma.salaryContract.count();
  const extraBills = await prisma.salaryContractExtraBill.count();
  const noSigned = await prisma.salaryContract.count({ where: { signedAt: null } });
  console.log(`Договоров: ${total}, доп. счетов: ${extraBills}, без даты заключения: ${noSigned}`);

  const result = await calc.calculate({ dateFrom: '2026-01-01', dateTo: '2026-12-31' });
  const t = result.totals;
  console.log(`\nРасчёт за 2026 год (все офисы):`);
  console.log(`  договоров в расчёте: ${t.contractsCount}`);
  console.log(`  менеджеры (личные):   ${t.managerPersonalTotal.toFixed(2)} → к выплате ${t.managerPersonalNet.toFixed(2)}`);
  console.log(`  фонд замерщиков:      ${t.surveyorFund.toFixed(2)} → к выплате ${t.surveyorFundNet.toFixed(2)}`);
  console.log(`  бригадирский фонд:    ${t.brigadierFund.toFixed(2)} + общий пул ${t.commonPool.toFixed(2)} = ${t.brigadierTotal.toFixed(2)} → к выплате ${t.brigadierTotalNet.toFixed(2)}`);
  console.log(`  фонды ВС: ${t.vsTotal.toFixed(2)}`);
  for (const v of result.vsByCategory.filter((x) => x.gross > 0)) {
    console.log(`    ${v.categoryName}: ${v.gross.toFixed(2)} → к выплате ${v.net.toFixed(2)}`);
  }
  console.log(`  статистика: заключено ${t.stats.signedCount} шт / ${t.stats.signedAmount.toFixed(2)} ₽; закрыто ${t.stats.closedCount} шт / ${t.stats.closedAmount.toFixed(2)} ₽`);
  console.log(`  менеджеров с начислениями: ${result.byManager.length}`);
  console.log(`  замерщиков с начислениями: ${result.bySurveyor.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
