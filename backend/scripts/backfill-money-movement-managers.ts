/**
 * Пересчитывает историю журнала ДП (money_movements):
 * 1) managerId — фиксирует ответственного менеджера договора («Карточка менеджера
 *    из справочника») вместо пользователя, записавшего оплату;
 * 2) office — офис заключения договора («Офис закл.»), только для записей без значения.
 *
 * Повторный запуск безопасен: менеджеры пересчитываются идемпотентно,
 * существующие снимки офиса не перезаписываются.
 *
 * Локально: npx ts-node -r tsconfig-paths/register scripts/backfill-money-movement-managers.ts
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

function asObj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Та же цепочка, что computePackageEffectiveManagerUserId в list-pipeline. */
function effectiveManagerId(pkg: {
  responsibleManagerId: string | null;
  createdById: string | null;
  formData: unknown;
}): string {
  const responsible = pkg.responsibleManagerId?.trim();
  if (responsible) return responsible;
  const formData = asObj(pkg.formData) ?? {};
  const executor = asObj(formData.executor);
  const signatory =
    typeof executor?.signatoryCrmUserId === 'string' ? executor.signatoryCrmUserId.trim() : '';
  if (signatory) return signatory;
  return pkg.createdById?.trim() ?? '';
}

/** «Офис закл.» договора: formData.contract.officeId. */
function officeIdFromFormData(formData: unknown): string | null {
  const contract = asObj(asObj(formData)?.contract);
  const officeId = contract?.officeId;
  return typeof officeId === 'string' && officeId.trim() ? officeId.trim() : null;
}

async function backfillManagers(packageIds: string[]) {
  const packages = await prisma.contractDocumentPackage.findMany({
    where: { id: { in: packageIds } },
    select: { id: true, responsibleManagerId: true, createdById: true, formData: true },
  });
  const targetByPackage = new Map<string, string>();
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

async function backfillOffices(packageIds: string[]) {
  const packages = await prisma.contractDocumentPackage.findMany({
    where: { id: { in: packageIds } },
    select: { id: true, formData: true },
  });
  const officeIds = [
    ...new Set(
      packages
        .map((pkg) => officeIdFromFormData(pkg.formData))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const officeNameById = new Map(
    (
      await prisma.office.findMany({
        where: { id: { in: officeIds } },
        select: { id: true, name: true },
      })
    ).map((o) => [o.id, o.name] as const),
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
  const packageIds = [
    ...new Set(movements.map((m) => m.packageId).filter((id): id is string => Boolean(id))),
  ];
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
