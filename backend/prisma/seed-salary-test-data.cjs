/**
 * Тестовые данные для раздела /admin/accounting/salary.
 * Запуск: node prisma/seed-salary-test-data.cjs
 * Идемпотентен: повторный запуск обновляет/дополняет те же записи по ключам.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OFFICE_KEYS = ['salary-test-office-1', 'salary-test-office-2'];
const USER_EMAILS = [
  'salary.test.manager1@example.com',
  'salary.test.manager2@example.com',
  'salary.test.surveyor@example.com',
  'salary.test.vs@example.com',
  'salary.test.brigadier@example.com',
];

async function main() {
  // ── Офисы ──────────────────────────────────────────────────────────────
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

  // ── Сотрудники ─────────────────────────────────────────────────────────
  const mkUser = (email, firstName, lastName, role, jobTitle) =>
    prisma.user.upsert({
      where: { email },
      update: { firstName, lastName, role, jobTitle },
      create: { email, password: 'test-data-no-login', firstName, lastName, role, jobTitle },
    });

  const [manager1, manager2, surveyor, vs, brigadier] = await Promise.all([
    mkUser(USER_EMAILS[0], 'Иван', 'Тестовый Менеджер', 'MANAGER', 'Менеджер'),
    mkUser(USER_EMAILS[1], 'Ольга', 'Тестовый Менеджер', 'MANAGER', 'Менеджер'),
    mkUser(USER_EMAILS[2], 'Пётр', 'Тестовый Замерщик', 'SURVEYOR', 'Замерщик'),
    mkUser(USER_EMAILS[3], 'Анна', 'Тестовый ВС', 'LEAD_SPECIALIST_WINDOWS_DOORS', 'Ведущий специалист'),
    mkUser(USER_EMAILS[4], 'Семён', 'Тестовый Бригадир', 'BRIGADIER', 'Бригадир'),
  ]);

  // ── Привязки ВС/бригадира ──────────────────────────────────────────────
  await prisma.salaryGlobalSetting.update({
    where: { id: 'singleton' },
    data: { brigadierUserId: brigadier.id },
  });
  const cats = await prisma.salaryCategory.findMany();
  const catBy = (code) => cats.find((c) => c.code === code);
  await prisma.salaryCategory.update({
    where: { id: catBy('WINDOWS').id },
    data: { leadSpecialistUserId: vs.id },
  });

  // ── Договоры ───────────────────────────────────────────────────────────
  const d = (iso) => new Date(iso);

  const contracts = [
    // Закрытый договор по окнам, с доп. соглашением
    {
      key: 'test-sal-001', office: office1, cat: catBy('WINDOWS'), number: 'ТС-001',
      customer: 'Иванов И.И.', signedAt: d('2026-09-05'), closedAt: d('2026-09-28'),
      manager: manager1, surveyor, base: 185000, source: 'яндекс',
      extraBills: [{ amount: 12500, date: d('2026-09-20'), note: 'доп. подоконники' }],
    },
    // Открытый договор по потолкам (не закрыт)
    {
      key: 'test-sal-002', office: office1, cat: catBy('CEILINGS'), number: 'ПТ-002',
      customer: 'Смирнова А.В.', signedAt: d('2026-09-12'), closedAt: null,
      manager: manager2, surveyor, base: 74000, source: 'уже обращался',
      extraBills: [],
    },
    // Ремонт — есть бригадирский процент
    {
      key: 'test-sal-003', office: office2, cat: catBy('REPAIR'), number: 'РМ-003',
      customer: 'ООО «Ромашка»', signedAt: d('2026-09-02'), closedAt: d('2026-10-01'),
      manager: manager1, surveyor: null, base: 1250000, source: 'наружка',
      extraBills: [{ amount: 90000, date: d('2026-09-25'), note: 'доп. электрика' }],
    },
    // Двери без замера — з/п замерщику не считается
    {
      key: 'test-sal-004', office: office2, cat: catBy('DOORS'), number: 'ДВ-004',
      customer: 'Кузнецов С.П.', signedAt: d('2026-09-18'), closedAt: null,
      manager: manager2, surveyor: null, base: 96500, surveyorHandled: false, source: 'сайт',
      extraBills: [],
    },
    // Жалюзи, менеджер не вёл — часть ×2 в общий пул
    {
      key: 'test-sal-005', office: office1, cat: catBy('BLINDS'), number: 'ЖЛ-005',
      customer: 'Фёдорова М.Н.', signedAt: d('2026-10-01'), closedAt: null,
      manager: manager1, surveyor, base: 38400, managerHandled: false, source: 'яндекс',
      extraBills: [],
    },
    // Мебель с переопределением процента менеджера
    {
      key: 'test-sal-006', office: office2, cat: catBy('FURNITURE'), number: 'МБ-006',
      customer: 'Тестов Тест Тестович', signedAt: d('2026-10-03'), closedAt: null,
      manager: manager2, surveyor: null, base: 310000, managerPercentOverride: 2.5, source: 'рекомендация',
      extraBills: [{ amount: -8200, date: d('2026-10-08'), note: 'скидка по рекламации' }],
    },
    // Договор без даты заключения (не даёт долю «при заключении»)
    {
      key: 'test-sal-007', office: office1, cat: catBy('WINDOWS'), number: 'ТС-007',
      customer: 'Гость без даты', signedAt: null, closedAt: d('2026-09-30'),
      manager: manager1, surveyor, base: 152000, source: 'телефон',
      extraBills: [],
    },
    // Менеджер снапшотом-именем, без привязки к пользователю
    {
      key: 'test-sal-008', office: office2, cat: catBy('CEILINGS'), number: 'ПТ-008',
      customer: 'Сидорова В.К.', signedAt: d('2026-10-05'), closedAt: null,
      manager: null, managerName: 'Внешний менеджер (снапшот)', surveyor, base: 52800, source: 'сайт',
      extraBills: [],
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
      managerName:
        c.managerName ?? (c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : null),
      surveyorId: c.surveyor?.id ?? null,
      surveyorName: c.surveyor ? `${c.surveyor.firstName} ${c.surveyor.lastName}` : null,
      managerHandled: c.managerHandled ?? true,
      surveyorHandled: c.surveyorHandled ?? true,
      baseAmount: c.base,
      managerPercentOverride: c.managerPercentOverride ?? null,
      source: c.source,
      note: 'тестовые данные (seed)',
    };
    const existing = await prisma.salaryContract.findFirst({
      where: { officeId: c.office.id, number: c.number },
      include: { extraBills: true },
    });
    if (existing) {
      await prisma.salaryContractExtraBill.deleteMany({ where: { contractId: existing.id } });
      await prisma.salaryContract.update({ where: { id: existing.id }, data });
      for (const b of c.extraBills) {
        await prisma.salaryContractExtraBill.create({
          data: { contractId: existing.id, amount: b.amount, date: b.date, note: b.note },
        });
      }
      console.log('updated', c.number);
    } else {
      const created = await prisma.salaryContract.create({ data });
      for (const b of c.extraBills) {
        await prisma.salaryContractExtraBill.create({
          data: { contractId: created.id, amount: b.amount, date: b.date, note: b.note },
        });
      }
      console.log('created', c.number);
    }
  }

  console.log('Готово: тестовые данные зарплаты добавлены.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
