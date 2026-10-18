/**
 * Разовая привязка путевых заданий к договорам-пакетам по номеру договора.
 * Запуск: node scripts/backfill-waybill-task-package.mjs (из каталога backend).
 *
 * Правила (безопасно / идемпотентно):
 * — обрабатываются только задания с packageId IS NULL и непустым contractNumber;
 * — номер ищется среди НЕ удалённых пакетов (formData.contract.number);
 * — привязка выполняется только при однозначном совпадении (ровно один пакет
 *   с таким номером); при нескольких совпадениях задание пропускается;
 * — существующие данные задания (номер/заказчик/адрес) НЕ перезаписываются —
 *   только проставляется ссылка packageId.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function contractNumberOf(pkg) {
  const contract = pkg.formData && typeof pkg.formData === 'object' ? pkg.formData.contract : null;
  const n = contract && typeof contract === 'object' ? contract.number : null;
  return typeof n === 'string' ? n.trim() : '';
}

async function main() {
  const [tasks, packages] = await Promise.all([
    prisma.waybillTask.findMany({
      where: { packageId: null, deletedAt: null, contractNumber: { not: null } },
      select: { id: true, contractNumber: true },
    }),
    prisma.contractDocumentPackage.findMany({
      where: { deletedAt: null },
      select: { id: true, formData: true },
    }),
  ]);

  const packageIdsByNumber = new Map();
  for (const pkg of packages) {
    const number = contractNumberOf(pkg);
    if (!number) continue;
    const list = packageIdsByNumber.get(number) ?? [];
    list.push(pkg.id);
    packageIdsByNumber.set(number, list);
  }

  let linked = 0;
  let skippedAmbiguous = 0;
  let skippedNotFound = 0;
  for (const task of tasks) {
    const number = task.contractNumber?.trim();
    if (!number) continue;
    const matches = packageIdsByNumber.get(number);
    if (!matches || matches.length === 0) {
      skippedNotFound++;
      continue;
    }
    if (matches.length > 1) {
      skippedAmbiguous++;
      continue;
    }
    await prisma.waybillTask.update({
      where: { id: task.id },
      data: { packageId: matches[0] },
    });
    linked++;
  }

  console.log(
    `Заданий без привязки: ${tasks.length}; привязано: ${linked}; ` +
      `пропущено (несколько пакетов с номером): ${skippedAmbiguous}; ` +
      `пропущено (пакет не найден): ${skippedNotFound}.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
