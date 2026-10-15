/* Дев-скрипт проверки журнала выплат з/п: поднимает приложение и зовёт сервисы
   с тестовыми данными (создаёт и удаляет их сам). Запуск:
   npx ts-node -P tsconfig.json scripts/verify-salary-payouts.ts */
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { SalaryPayoutsService } from '../src/admin/salary-payouts/salary-payouts.service';
import { CashBookService } from '../src/admin/cash-book/cash-book.service';
import { BankEntriesService } from '../src/admin/bank-entries/bank-entries.service';
import { ManualEntriesService } from '../src/admin/money-movements/manual-entries.service';

async function main() {
  const { NestFactory } = await import('@nestjs/core');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const payouts = app.get(SalaryPayoutsService);
  const cashBook = app.get(CashBookService);
  const bank = app.get(BankEntriesService);
  const manual = app.get(ManualEntriesService);

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) throw new Error('Нет супер-админа в БД');
  const recipient = await prisma.user.findFirst({
    where: { role: 'MANAGER', isActive: true },
  });
  const recipientName = recipient
    ? [recipient.lastName, recipient.firstName].filter(Boolean).join(' ') || recipient.email
    : 'Тестов Тест Тестович';

  const created: { payoutIds: string[]; movementIds: string[] } = {
    payoutIds: [],
    movementIds: [],
  };

  try {
    // 1. Выплата раздела: наличные (должна попасть в кассу) и банк (в раздел «Банк»).
    const cashPayout = await payouts.create(
      {
        paidAt: '2026-10-15',
        amount: 15000,
        paymentMethod: 'CASH',
        category: 'SALARY',
        recipientUserId: recipient?.id,
        recipientName,
        note: 'e2e проверка: наличные',
      },
      admin.id,
    );
    created.payoutIds.push(cashPayout.id);
    const bankPayout = await payouts.create(
      {
        paidAt: '2026-10-15',
        amount: 42000.5,
        paymentMethod: 'BANK',
        category: 'BONUS',
        recipientName: 'Стороннее Лицо',
        note: 'e2e проверка: банк',
      },
      admin.id,
    );
    created.payoutIds.push(bankPayout.id);

    // 2. Ручная запись ДП «Зар/плата» (менеджер сам провёл наличные) —
    //    в журнал выплат попадает сразу, в кассу — только после сверки.
    const dpCash = await manual.createManualEntry(
      {
        managerId: admin.id,
        amount: -7000,
        paymentForm: 'CASH' as never,
        direction: 'Прочее',
        basis: 'Зар/плата',
        salaryRecipientUserId: recipient?.id,
        notes: 'e2e: ДП наличные',
      },
      admin.id,
    );
    created.movementIds.push(dpCash.id);
    const dpBank = await manual.createManualEntry(
      {
        managerId: admin.id,
        amount: -3000,
        paymentForm: 'LC_TRANSFER' as never,
        direction: 'Прочее',
        basis: 'Зар/плата',
        salaryRecipientUserId: recipient?.id,
        notes: 'e2e: ДП безнал',
      },
      admin.id,
    );
    created.movementIds.push(dpBank.id);

    // 3. Журнал выплат: обе записи раздела + обе записи ДП, итоги нал/банк.
    const journal = await payouts.findAll({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    console.log(
      '[журнал] всего:',
      journal.total,
      'сумма:',
      journal.totalSum,
      'нал:',
      journal.cashSum,
      'банк:',
      journal.bankSum,
    );
    console.log(
      '[журнал] строки:',
      journal.data
        .map(
          (r) =>
            `${r.source} ${r.paidAt} ${r.method} ${r.amount} → ${r.recipientName}` +
            (r.manualReconciledAt ? ' (свёрено)' : ''),
        )
        .join(' | '),
    );
    console.log('[журнал] по получателям:', JSON.stringify(journal.byRecipient.slice(0, 5)));

    // 4. Касса: наличная выплата раздела (сразу) + запись ДП после сверки.
    const cashBefore = await cashBook.findAll({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    const cashPayoutRows = cashBefore.data.filter((r) => r.salaryRecipientName === recipientName);
    console.log(
      '[касса] строк с получателем:',
      cashPayoutRows.length,
      cashPayoutRows.map((r) => `${r.basis} ${r.amount}`).join(' | '),
    );
    await prisma.moneyMovement.update({
      where: { id: dpCash.id },
      data: { manualReconciledAt: new Date() },
    });
    const cashAfter = await cashBook.findAll({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    console.log(
      '[касса] после сверки строк с получателем:',
      cashAfter.data.filter((r) => r.salaryRecipientName === recipientName).length,
    );

    // 5. Банк: безналичная выплата раздела + запись ДП безналом.
    const bankList = await bank.findAll({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    console.log(
      '[банк] проекции выплат:',
      bankList.data
        .filter((r) => (r as { isPayout?: boolean }).isPayout)
        .map(
          (r) =>
            `${(r as { payoutSource?: string }).payoutSource} ${(r as { counterparty?: string | null }).counterparty} ${(r as { amount?: string }).amount}`,
        )
        .join(' | ') || 'нет',
      '| итог выплат:',
      JSON.stringify(bankList.payouts),
    );

    // 6. Правка и удаление.
    const patched = await payouts.update(bankPayout.id, { amount: 43000, category: 'SALARY' });
    console.log('[правка] сумма:', patched.amount, 'категория:', patched.category);
    console.log('[удаление]', await payouts.remove(cashPayout.id));
    const journalAfter = await payouts.findAll({ dateFrom: '2026-10-01', dateTo: '2026-10-31' });
    console.log('[журнал после удаления] всего:', journalAfter.total);
  } finally {
    await prisma.moneyMovement.deleteMany({ where: { id: { in: created.movementIds } } });
    await prisma.salaryPayout.deleteMany({ where: { id: { in: created.payoutIds } } });
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
