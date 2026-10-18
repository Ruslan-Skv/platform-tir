/**
 * Тестовые данные для План-графика ОДПЖ (окна/двери/потолки/жалюзи).
 * Запуск: node scripts/seed-odpzh-test-data.mjs (из каталога backend).
 * Идемпотентно: пакеты ищутся по номеру договора (upsert по formData не поддерживается).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isoDaysFromToday(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function ruDate(iso) {
  const dd = iso.getUTCDate().toString().padStart(2, '0');
  const mm = (iso.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${dd}.${mm}.${iso.getUTCFullYear()}`;
}

function formData({ number, contractDate, workPeriod, totalAmount, fullName, address, phone, installerIds }) {
  return {
    contract: {
      number,
      date: ruDate(contractDate),
      workPeriod: String(workPeriod),
      totalAmount: totalAmount.replace('.', ','),
    },
    customer: {
      type: 'INDIVIDUAL',
      fullName,
      address,
      phone,
      phones: [phone],
    },
    object: { objectAddress: address },
    selectedInstallerIds: installerIds ?? [],
  };
}

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const seed = [
  {
    kind: 'WINDOWS',
    number: 'О-23/26-ТЕСТ',
    // договор 40 календарных дней назад, срок 21 раб. день → просрочен
    contractDate: isoDaysFromToday(-40),
    workPeriod: 21,
    totalAmount: '81795.00',
    fullName: 'Иванов Иван Иванович',
    address: 'г. Пермь, ул. Ленина, д. 10, кв. 5',
    phone: '+7 912 345-67-89',
    entries: [
      { date: isoDaysFromToday(-3), status: 'DONE', installer: 'Петров Пётр Петрович' },
      { date: isoDaysFromToday(2), dateEnd: isoDaysFromToday(3), status: 'PLANNED', installer: 'Петров Пётр Петрович' },
    ],
  },
  {
    kind: 'WINDOWS',
    number: 'О-24/26-ТЕСТ',
    // свежий договор, до срока далеко, один монтаж на следующей неделе
    contractDate: isoDaysFromToday(-5),
    workPeriod: 30,
    totalAmount: '154300.00',
    fullName: 'Сидорова Анна Сергеевна',
    address: 'г. Пермь, ул. Революции, д. 22, кв. 41',
    phone: '+7 902 111-22-33',
    entries: [{ date: isoDaysFromToday(7), status: 'PLANNED', installer: 'Смирнов Олег Иванович' }],
  },
  {
    kind: 'WINDOWS',
    number: 'О-25/26-ТЕСТ',
    // новый договор без монтажей («Новые договора»)
    contractDate: isoDaysFromToday(-2),
    workPeriod: 30,
    totalAmount: '62150.00',
    fullName: 'Кузнецов Артём Львович',
    address: 'г. Пермь, ул. Мира, д. 3, кв. 12',
    phone: '+7 982 555-44-33',
    entries: [],
  },
  {
    kind: 'DOORS',
    number: 'Д-17/26-ТЕСТ',
    contractDate: isoDaysFromToday(-15),
    workPeriod: 14,
    totalAmount: '98000.00',
    fullName: 'ООО «Ромашка»',
    address: 'г. Пермь, ул. Строителей, д. 7, оф. 2',
    phone: '+7 342 200-10-10',
    entries: [
      { date: isoDaysFromToday(1), status: 'PLANNED', installer: 'Волков Николай Игоревич' },
      { date: isoDaysFromToday(10), status: 'PLANNED', installer: 'Волков Николай Игоревич' },
    ],
  },
  {
    kind: 'CEILINGS',
    number: 'П-08/26-ТЕСТ',
    contractDate: isoDaysFromToday(-25),
    workPeriod: 10,
    totalAmount: '45600.00',
    fullName: 'Николаева Ольга Петровна',
    address: 'г. Пермь, ул. Свободы, д. 15, кв. 8',
    phone: '+7 919 777-88-99',
    entries: [
      // сорванный монтаж в прошлом
      { date: isoDaysFromToday(-7), status: 'FAILED', installer: 'Петров Пётр Петрович' },
      { date: isoDaysFromToday(5), status: 'PLANNED', installer: 'Смирнов Олег Иванович' },
    ],
  },
  {
    kind: 'DOORS',
    number: 'Д-18/26-ТЕСТ',
    // все монтажи выполнены — договор ещё «В работе» до закрытия по конвейеру
    contractDate: isoDaysFromToday(-20),
    workPeriod: 30,
    totalAmount: '132000.00',
    fullName: 'Ветрова Марина Сергеевна',
    address: 'г. Пермь, ул. Комсомольская, д. 18, кв. 33',
    phone: '+7 950 456-78-90',
    entries: [
      { date: isoDaysFromToday(-5), status: 'DONE', installer: 'Волков Николай Игоревич' },
      { date: isoDaysFromToday(-2), status: 'DONE', installer: 'Волков Николай Игоревич' },
    ],
  },
  {
    kind: 'BLINDS',
    number: 'Ж-03/26-ТЕСТ',
    contractDate: isoDaysFromToday(-8),
    workPeriod: 21,
    totalAmount: '24900.00',
    fullName: 'Морозов Дмитрий Юрьевич',
    address: 'г. Пермь, ул. Куйбышева, д. 40, кв. 2',
    phone: '+7 908 234-56-78',
    entries: [{ date: isoDaysFromToday(14), status: 'PLANNED', installer: 'Волков Николай Игоревич' }],
  },
];

async function main() {
  const existingPackages = await prisma.contractDocumentPackage.findMany({
    where: { kind: { in: ['WINDOWS', 'DOORS', 'CEILINGS', 'BLINDS'] } },
    select: { id: true, formData: true },
  });
  const byNumber = new Map(
    existingPackages.map((p) => [p.formData?.contract?.number ?? `#${p.id}`, p.id]),
  );

  for (const item of seed) {
    let packageId = byNumber.get(item.number);
    const data = formData(item);
    if (packageId) {
      await prisma.contractDocumentPackage.update({ where: { id: packageId }, data: { formData: data } });
    } else {
      packageId = (
        await prisma.contractDocumentPackage.create({
          data: {
            kind: item.kind,
            status: 'CONTRACT_CONCLUDED',
            formData: data,
          },
        })
      ).id;
    }

    // монтажи: пересоздаём только если их ещё нет у пакета
    const hasEntries = await prisma.installationScheduleEntry.count({
      where: { packageId, deletedAt: null },
    });
    if (!hasEntries) {
      for (const e of item.entries) {
        await prisma.installationScheduleEntry.create({
          data: {
            date: e.date,
            dateEnd: e.dateEnd ?? null,
            direction: item.kind,
            status: e.status,
            installerName: e.installer,
            packageId,
            contractNumber: item.number,
            customerName: item.fullName,
            customerAddress: item.address,
            customerPhone: item.phone,
            completedAt: e.status === 'DONE' ? new Date() : null,
          },
        });
      }
    }
    console.log(`ok: ${item.kind} ${item.number} (${item.entries.length} монтажей)`);
  }

  const totals = await prisma.contractDocumentPackage.groupBy({
    by: ['kind', 'status'],
    where: { kind: { in: ['WINDOWS', 'DOORS', 'CEILINGS', 'BLINDS'] } },
    _count: true,
  });
  console.log('packages:', JSON.stringify(totals));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
