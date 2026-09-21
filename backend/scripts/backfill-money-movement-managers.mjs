/**
 * Пересчитывает историю журнала ДП (money_movements):
 * 1) managerId — фиксирует ответственного менеджера договора («Карточка менеджера
 *    из справочника») вместо пользователя, записавшего оплату;
 * 2) office — офис заключения договора («Офис закл.»), только для записей без значения.
 *
 * Повторный запуск безопасен: менеджеры пересчитываются идемпотентно,
 * существующие снимки офиса не перезаписываются.
 *
 * Запуск из каталога backend (локально): node scripts/backfill-money-movement-managers.mjs
 * В прод-контейнере (переменные БД уже в окружении, скрипт кладём в /app рядом с node_modules):
 *   docker cp scripts/backfill-money-movement-managers.mjs <backend-контейнер>:/app/backfill.mjs
 *   docker exec <backend-контейнер> node /app/backfill.mjs
 */
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env — только для локального запуска; в контейнере dotenv может не быть —
// тогда используем переменные окружения как есть.
try {
  const { config } = await import('dotenv');
  config({ path: path.join(process.cwd(), '.env') });
  config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv недоступен (прод-контейнер) — DATABASE_URL берём из окружения
}

const prisma = new PrismaClient();

function asObj(value) {
  return value && typeof value === 'object' ? value : null;
}

/** Приоритет как в MoneyMovementsService.resolveMovementManagerId:
 *  карточка менеджера → responsibleManagerId → createdBy. */
function effectiveManagerId(pkg) {
  const formData = asObj(pkg.formData) ?? {};
  const executor = asObj(formData.executor);
  const cardManagerId =
    typeof executor?.signatoryCrmUserId === 'string' ? executor.signatoryCrmUserId.trim() : '';
  if (cardManagerId) return cardManagerId;
  const responsible = pkg.responsibleManagerId?.trim();
  if (responsible) return responsible;
  return pkg.createdById?.trim() ?? '';
}

/** «Офис закл.» договора: formData.contract.officeId. */
function officeIdFromFormData(formData) {
  const contract = asObj(asObj(formData)?.contract);
  const officeId = contract?.officeId;
  return typeof officeId === 'string' && officeId.trim() ? officeId.trim() : null;
}

async function backfillManagers(packageIds) {
  const packages = await prisma.contractDocumentPackage.findMany({
    where: { id: { in: packageIds } },
    select: { id: true, responsibleManagerId: true, createdById: true, formData: true },
  });
  const targetByPackage = new Map();
  for (const pkg of packages) {
    const target = effectiveManagerId(pkg);
    if (target) targetByPackage.set(pkg.id, target);
  }

  const existingUsers = await prisma.user.findMany({
    where: { id: { in: [...new Set(targetByPackage.values())] } },
    select: { id: true },
  });
  const existingIds = new Set(existingUsers.map((u) => u.id));

  let updatedCount = 0;
  for (const [packageId, target] of targetByPackage) {
    if (!existingIds.has(target)) {
      console.warn(
        `Пропуск: пакет ${packageId} ссылается на несуществующего пользователя ${target}`,
      );
      continue;
    }
    const result = await prisma.moneyMovement.updateMany({
      where: {
        packageId,
        OR: [{ managerId: null }, { managerId: { not: target } }],
      },
      data: { managerId: target },
    });
    updatedCount += result.count;
  }
  console.log(`Менеджеры: обновлено записей ДП: ${updatedCount}`);
}

async function backfillOffices(packageIds) {
  const packages = await prisma.contractDocumentPackage.findMany({
    where: { id: { in: packageIds } },
    select: { id: true, formData: true },
  });
  const officeIds = [
    ...new Set(
      packages.map((pkg) => officeIdFromFormData(pkg.formData)).filter((id) => Boolean(id)),
    ),
  ];
  const officeNameById = new Map(
    (
      await prisma.office.findMany({
        where: { id: { in: officeIds } },
        select: { id: true, name: true },
      })
    ).map((o) => [o.id, o.name]),
  );

  let updatedCount = 0;
  for (const pkg of packages) {
    const officeId = officeIdFromFormData(pkg.formData);
    if (!officeId) continue;
    const name = officeNameById.get(officeId);
    if (!name) {
      console.warn(`Пропуск: пакет ${pkg.id} ссылается на несуществующий офис ${officeId}`);
      continue;
    }
    // Снимки офиса у записей после миграции не перезаписываем.
    const result = await prisma.moneyMovement.updateMany({
      where: { packageId: pkg.id, office: null },
      data: { office: name },
    });
    updatedCount += result.count;
  }
  console.log(`Офисы: обновлено записей ДП: ${updatedCount}`);
}

async function main() {
  const movements = await prisma.moneyMovement.findMany({
    where: { packageId: { not: null } },
    select: { packageId: true },
  });
  const packageIds = [...new Set(movements.map((m) => m.packageId).filter((id) => Boolean(id)))];
  if (!packageIds.length) {
    console.log('Записей ДП с договором не найдено — ничего обновлять.');
    return;
  }

  await backfillManagers(packageIds);
  await backfillOffices(packageIds);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
