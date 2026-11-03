/**
 * Тестовые данные для проверки фильтра по направлению в /admin/accounting/salary.
 * Договоры датированы ноябрём 2026 (текущий месяц) — видны в расчёте сразу
 * при открытии раздела с дефолтным периодом.
 * Запуск: node prisma/seed-salary-filter-test-data.cjs
 * Идемпотентен: повторный запуск обновляет те же записи по ключу (офис, номер).
 * Глобальные настройки з/п (бригадир, привязки ВС) не трогает.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OFFICE_KEYS = ['salary-test-office-1', 'salary-test-office-2'];
const USER_EMAILS = {
  manager1: 'salary.test.manager1@example.com',
  manager2: 'salary.test.manager2@example.com',
  surveyor: 'salary.test.surveyor@example.com',
};

async function main() {
  // ── Офисы (общие с seed-salary-test-data.cjs — не дублируются) ─────────
  const office1 = await prisma.office.upsert({
    where: { id: OFFICE_KEYS[0] },
    update: {},
    create: { id: OFFICE_KEYS[0], name: 'Тестовый офис — Центральный', prefix: 'Ц' },
  });
  const office2 = await prisma.office.upsert({
    where: { id: OFFICE_KEYS[1] },
    update: {},
    create: { id: OFFICE_KEYS[1], name: 'Тестовый офис — Заречный', prefix: 'З' },
  });

  // ── Сотрудники (только менеджеры и замерщик; настройки не меняем) ──────
  const mkUser = (email, firstName, lastName, role, jobTitle) =>
    prisma.user.upsert({
      where: { email },
      update: { firstName, lastName, role, jobTitle },
      create: { email, password: 'test-data-no-login', firstName, lastName, role, jobTitle },
    });

  const [manager1, manager2, surveyor] = await Promise.all([
    mkUser(USER_EMAILS.manager1, 'Иван', 'Тестовый Менеджер', 'MANAGER', 'Менеджер'),
    mkUser(USER_EMAILS.manager2, 'Ольга', 'Тестовый Менеджер', 'MANAGER', 'Менеджер'),
    mkUser(USER_EMAILS.surveyor, 'Пётр', 'Тестовый Замерщик', 'SURVEYOR', 'Замерщик'),
  ]);

  const cats = await prisma.salaryCategory.findMany();
  const catBy = (code) => cats.find((c) => c.code === code);

  // ── Договоры ноября 2026 по всем направлениям ───────────────────────────
  const d = (iso) => new Date(iso);
  const contracts = [
    // Окна — два договора: в фильтре направление покажет «2 из 7»
    {
      office: office1, cat: catBy('WINDOWS'), number: 'ТС-Н101',
      customer: 'Тестов Иван И.И. (окна)', signedAt: d('2026-11-01'), closedAt: null,
      manager: manager1, surveyor, base: 210000, source: 'яндекс', extraBills: [],
    },
    {
      office: office1, cat: catBy('WINDOWS'), number: 'ТС-Н102',
      customer: 'Тестова Анна С. (окна)', signedAt: d('2026-11-02'), closedAt: d('2026-11-03'),
      manager: manager2, surveyor, base: 158500, source: 'сайт',
      extraBills: [{ amount: 14000, date: d('2026-11-03'), note: 'доп. подоконники' }],
    },
    {
      office: office1, cat: catBy('CEILINGS'), number: 'ПТ-Н103',
      customer: 'Тестов Пётр П. (потолки)', signedAt: d('2026-11-02'), closedAt: null,
      manager: manager1, surveyor, base: 82000, source: 'сайт', extraBills: [],
    },
    // Без замера — з/п замерщику не считается
    {
      office: office2, cat: catBy('DOORS'), number: 'ДВ-Н104',
      customer: 'Тестова Мария К. (двери)', signedAt: d('2026-11-03'), closedAt: null,
      manager: manager2, surveyor: null, surveyorHandled: false, base: 64000, source: 'телефон',
      extraBills: [],
    },
    // Ремонт — закрыт в периоде, есть д/с
    {
      office: office2, cat: catBy('REPAIR'), number: 'РМ-Н105',
      customer: 'ООО «Тест-Ромашка» (ремонт)', signedAt: d('2026-11-01'), closedAt: d('2026-11-03'),
      manager: manager1, surveyor: null, base: 980000, source: 'наружка',
      extraBills: [{ amount: 45000, date: d('2026-11-02'), note: 'доп. электрика' }],
    },
    {
      office: office2, cat: catBy('BLINDS'), number: 'ЖЛ-Н106',
      customer: 'Тестов Сергей В. (жалюзи)', signedAt: d('2026-11-03'), closedAt: null,
      manager: manager1, surveyor, base: 29900, source: 'яндекс', extraBills: [],
    },
    // Отрицательное д/с — возврат/скидка
    {
      office: office2, cat: catBy('FURNITURE'), number: 'МБ-Н107',
      customer: 'Тестова Ольга Н. (мебель)', signedAt: d('2026-11-02'), closedAt: null,
      manager: manager2, surveyor, base: 145000, source: 'рекомендация',
      extraBills: [{ amount: -5200, date: d('2026-11-03'), note: 'скидка по рекламации' }],
    },
  ];

  for (const c of contracts) {
    const data = {
      officeId: c.office.id,
      categoryId: c.cat.id,
      number: c.number,
      signedAt: c.signedAt,
      closedAt: c.closedAt,
      customerName: c.customer,
      managerId: c.manager?.id ?? null,
      managerName: c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : null,
      surveyorId: c.surveyor?.id ?? null,
      surveyorName: c.surveyor ? `${c.surveyor.firstName} ${c.surveyor.lastName}` : null,
      managerHandled: c.managerHandled ?? true,
      surveyorHandled: c.surveyorHandled ?? true,
      baseAmount: c.base,
      source: c.source,
      note: 'тест фильтра направлений (seed)',
    };
    const existing = await prisma.salaryContract.findFirst({
      where: { officeId: c.office.id, number: c.number },
      include: { extraBills: true },
    });
    if (existing) {
      await prisma.salaryContractExtraBill.deleteMany({ where: { contractId: existing.id } });
      await prisma.salaryContract.update({ where: { id: existing.id }, data });
    } else {
      await prisma.salaryContract.create({ data });
    }
    const saved = existing ?? (await prisma.salaryContract.findFirst({ where: { officeId: c.office.id, number: c.number } }));
    for (const b of c.extraBills) {
      await prisma.salaryContractExtraBill.create({
        data: { contractId: saved.id, amount: b.amount, date: b.date, note: b.note },
      });
    }
    console.log('ok', c.cat.code, c.number, 'base=' + c.base);
  }

  console.log('Готово: тестовые договоры ноября 2026 добавлены (7 шт., 6 направлений).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
