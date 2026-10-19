/**
 * Тестовые данные раздела «План-график ОДПЖ» (локальная БД).
 *
 * Раздел ничего не хранит — это живая проекция пакетов договоров направлений
 * Окна/Двери/Потолки/Жалюзи со статусом CONTRACT_CONCLUDED. Скрипт создаёт
 * такие пакеты (+ записи графика монтажей и оплаты), чтобы в списке появились
 * строки во всех секциях: Новые / В работе / Монтажи выполнены / Закрытые.
 *
 * Идемпотентен: все строки имеют префикс id `test_odpzh_` и пересоздаются.
 * Удаление: delete from contract_document_packages where id like 'test_odpzh_%'
 * (платы и монтажи удалятся каскадом).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_PREFIX = 'test_odpzh_';

/** сегодня = 2026-10-19; даты подобраны под разные уровни просрочки (D20/D10/D3/OVERDUE) */
function pkg(id, kind, contractNumber, date, workPeriod, total, customer, object, extra = {}) {
  return {
    id: `${TEST_PREFIX}${id}`,
    kind,
    title: `ТЕСТ ОДПЖ — ${contractNumber}`,
    status: 'CONTRACT_CONCLUDED',
    formData: {
      contract: {
        number: contractNumber,
        date,
        workPeriod: String(workPeriod),
        totalAmount: total,
      },
      customer,
      object,
      executor: { selectedSignatoryProfileTitle: 'ТЕСТ' },
      ...extra,
    },
  };
}

const PACKAGES = [
  // Новые (монтажей в графике нет)
  pkg(
    'windows_01',
    'WINDOWS',
    'ТЕСТ-ОКН-101',
    '01.10.2026',
    15,
    '185 000',
    { fullName: 'Иванов Иван Иванович', phone: '+7 900 000-00-01' },
    {
      objectAddress: 'г. Пенза, ул. Ленина, 10, кв. 5',
      objectFloor: '3',
      objectDescription: 'Замена 5 оконных блоков (пластик, поворотно-откидные)',
      managerNote: 'Начало работ — после 25.10, ключи у соседей сверху',
    },
  ),
  pkg(
    'windows_02',
    'WINDOWS',
    'ТЕСТ-ОКН-102',
    '05.09.2026',
    20,
    '240 000',
    { fullName: 'Смирнова Анна Петровна', phone: '+7 900 000-00-02' },
    {
      objectAddress: 'г. Пенза, пр-т Победы, 22, кв. 41',
      objectFloor: '7',
      objectDescription: 'Остекление балкона + 2 окна на кухне',
      managerNote: 'Ожидаем поставку профиля, поставщик перенёс на 22.10',
    },
  ),
  pkg(
    'doors_01',
    'DOORS',
    'ТЕСТ-ДВР-201',
    '05.10.2026',
    20,
    '96 000',
    { type: 'COMPANY', organizationName: 'ООО «Ромашка»', phone: '+7 900 000-00-03' },
    {
      objectAddress: 'г. Пенза, ул. Суворова, 145, оф. 12',
      objectDescription: 'Входная группа: 3 двери, обшивка наличником',
      managerNote: 'Доступ в офис после 18:00, согласовывать с администратором',
    },
  ),
  pkg(
    'blinds_01',
    'BLINDS',
    'ТЕСТ-ЖЛЗ-401',
    '06.10.2026',
    25,
    '34 500',
    { fullName: 'Кузнецов Олег Викторович', phone: '+7 900 000-00-04' },
    {
      objectAddress: 'г. Пенза, ул. Кирова, 74, кв. 18',
      objectFloor: '2',
      objectDescription: 'Жалюзи на 6 окон, день-ночь',
      managerNote: '',
    },
  ),

  // В работе (есть незакрытые монтажи)
  pkg(
    'windows_03',
    'WINDOWS',
    'ТЕСТ-ОКН-103',
    '12.10.2026',
    25,
    '320 000',
    { fullName: 'Попов Дмитрий Сергеевич', phone: '+7 900 000-00-05' },
    {
      objectAddress: 'г. Пенза, ул. Володарского, 5, кв. 62',
      objectFloor: '5',
      objectDescription: 'Замена 9 окон во всей квартире',
      managerNote: 'Первый этаж — монтаж по согласованию с УК',
    },
  ),
  pkg(
    'doors_02',
    'DOORS',
    'ТЕСТ-ДВР-202',
    '29.09.2026',
    19,
    '132 000',
    { fullName: 'Николаева Мария Ивановна', phone: '+7 900 000-00-06' },
    {
      objectAddress: 'г. Пенза, ул. Пушкина, 31, кв. 9',
      objectFloor: '4',
      objectDescription: 'Межкомнатные двери, 7 шт., массив',
      managerNote: 'Замер финальный 21.10, монтаж частями',
    },
  ),
  pkg(
    'ceilings_01',
    'CEILINGS',
    'ТЕСТ-ПТЛ-301',
    '13.10.2026',
    22,
    '78 000',
    { fullName: 'Васильев Артём Николаевич', phone: '+7 900 000-00-07' },
    {
      objectAddress: 'г. Пенза, ул. Баумана, 12, кв. 33',
      objectFloor: '9',
      objectDescription: 'Натяжные потолки, 4 комнаты, 56 м²',
      managerNote: 'Мебель вынесут к 24.10, начинать после',
    },
  ),

  // Монтажи выполнены (все записи DONE, договор не закрыт — оплачен не полностью)
  pkg(
    'windows_04',
    'WINDOWS',
    'ТЕСТ-ОКН-104',
    '25.09.2026',
    30,
    '150 000',
    { fullName: 'Фёдорова Елена Юрьевна', phone: '+7 900 000-00-08' },
    {
      objectAddress: 'г. Пенза, ул. Окружная, 58, кв. 2',
      objectFloor: '1',
      objectDescription: 'Замена 3 окон и балконного блока',
      managerNote: 'Ждём остаток оплаты 45 000 ₽, тогда закроем договор',
    },
  ),

  // Закрытый: все монтажи DONE + полная оплата + contractClosed
  // (для продуктовых направлений сумма к оплате = estimate.snapshot.total)
  pkg(
    'blinds_02',
    'BLINDS',
    'ТЕСТ-ЖЛЗ-402',
    '10.09.2026',
    15,
    '58 000',
    { fullName: 'Морозов Павел Андреевич', phone: '+7 900 000-00-09' },
    {
      objectAddress: 'г. Пенза, ул. Центральная, 1, кв. 7',
      objectFloor: '1',
      objectDescription: 'Рулонные шторы, 4 окна',
      managerNote: 'Закрыт полностью, претензий нет',
    },
    { estimate: { snapshot: { total: 58000 } }, contractClosed: true },
  ),
];

const ENTRIES = [
  // windows_03: один монтаж сделан, второй запланирован → «В работе»
  {
    pkg: 'windows_03',
    id: 'windows_03_e1',
    date: '2026-10-16',
    status: 'DONE',
    completedAt: '2026-10-16T15:30:00Z',
    installerName: 'Петров Пётр Петрович',
    direction: 'WINDOWS',
  },
  {
    pkg: 'windows_03',
    id: 'windows_03_e2',
    date: '2026-10-28',
    status: 'PLANNED',
    installerName: 'Петров Пётр Петрович',
    direction: 'WINDOWS',
  },
  // doors_02: два запланированных монтажа
  {
    pkg: 'doors_02',
    id: 'doors_02_e1',
    date: '2026-10-20',
    status: 'PLANNED',
    installerName: 'Сидоров Сергей Иванович',
    direction: 'DOORS',
  },
  {
    pkg: 'doors_02',
    id: 'doors_02_e2',
    date: '2026-10-27',
    status: 'PLANNED',
    installerName: 'Сидоров Сергей Иванович',
    direction: 'DOORS',
  },
  // ceilings_01: монтаж на 3 дня
  {
    pkg: 'ceilings_01',
    id: 'ceilings_01_e1',
    date: '2026-10-26',
    dateEnd: '2026-10-28',
    status: 'PLANNED',
    installerName: 'Козлов Кирилл Алексеевич',
    direction: 'CEILINGS',
  },
  // windows_04: оба монтажа выполнены
  {
    pkg: 'windows_04',
    id: 'windows_04_e1',
    date: '2026-10-08',
    status: 'DONE',
    completedAt: '2026-10-08T16:00:00Z',
    installerName: 'Петров Пётр Петрович',
    direction: 'WINDOWS',
  },
  {
    pkg: 'windows_04',
    id: 'windows_04_e2',
    date: '2026-10-09',
    status: 'DONE',
    completedAt: '2026-10-09T14:00:00Z',
    installerName: 'Петров Пётр Петрович',
    direction: 'WINDOWS',
  },
  // blinds_02: монтаж выполнен
  {
    pkg: 'blinds_02',
    id: 'blinds_02_e1',
    date: '2026-09-30',
    status: 'DONE',
    completedAt: '2026-09-30T13:00:00Z',
    installerName: 'Мишин Михаил Михайлович',
    direction: 'BLINDS',
  },
];

const PAYMENTS = [
  // windows_04: аванс 70% — договор не закрыт
  {
    pkg: 'windows_04',
    date: '2026-09-26',
    amount: 105000,
    type: 'PREPAYMENT',
    form: 'BANK_APP',
    basis: 'Аванс 70% по договору ТЕСТ-ОКН-104',
  },
  // blinds_02: полная оплата (40 600 + 17 400 = 58 000 = estimate.snapshot.total)
  {
    pkg: 'blinds_02',
    date: '2026-09-11',
    amount: 40600,
    type: 'PREPAYMENT',
    form: 'CASH',
    basis: 'Аванс по договору ТЕСТ-ЖЛЗ-402',
  },
  {
    pkg: 'blinds_02',
    date: '2026-10-02',
    amount: 17400,
    type: 'FINAL',
    form: 'CASH',
    basis: 'Окончательный расчёт по договору ТЕСТ-ЖЛЗ-402',
  },
];

async function main() {
  const removed = await prisma.contractDocumentPackage.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  if (removed.count > 0) console.log(`Удалено предыдущих тестовых пакетов: ${removed.count}`);

  const pkgById = new Map(PACKAGES.map((p) => [p.id, p]));

  for (const p of PACKAGES) {
    await prisma.contractDocumentPackage.create({
      data: { id: p.id, kind: p.kind, title: p.title, status: p.status, formData: p.formData },
    });
  }
  for (const e of ENTRIES) {
    const parent = pkgById.get(`${TEST_PREFIX}${e.pkg}`);
    await prisma.installationScheduleEntry.create({
      data: {
        id: `${TEST_PREFIX}entry_${e.id}`,
        packageId: parent.id,
        date: new Date(e.date),
        ...(e.dateEnd ? { dateEnd: new Date(e.dateEnd) } : {}),
        direction: e.direction,
        status: e.status,
        installerName: e.installerName,
        contractNumber: parent.formData.contract.number,
        ...(e.completedAt ? { completedAt: new Date(e.completedAt) } : {}),
      },
    });
  }
  for (const pay of PAYMENTS) {
    const parent = pkgById.get(`${TEST_PREFIX}${pay.pkg}`);
    await prisma.contractDocumentPackagePayment.create({
      data: {
        id: `${TEST_PREFIX}payment_${pay.pkg}_${pay.date}`,
        packageId: parent.id,
        paymentDate: new Date(pay.date),
        amount: pay.amount,
        paymentType: pay.type,
        paymentForm: pay.form,
        basis: pay.basis,
      },
    });
  }

  console.log(
    `Создано пакетов: ${PACKAGES.length}, монтажей: ${ENTRIES.length}, оплат: ${PAYMENTS.length}`,
  );
}

main()
  .catch((e) => {
    console.error('Ошибка наполнения:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
