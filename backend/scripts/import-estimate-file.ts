/*
 * Импорт файла переноса расчёта в локальную базу (без UI): сервисный уровень,
 * тот же код, что и у эндпоинта суперадмина.
 * Запуск: npx ts-node --transpile-only scripts/import-estimate-file.ts <путь-к-файлу.json>
 */
import { readFileSync } from 'fs';

import { ContractDocumentPackageKind } from '@prisma/client';

import { PrismaService } from '../src/database/prisma.service';
import { ContractDocumentPackageEstimatePresetsService } from '../src/admin/contract-document-packages/contract-document-package-estimate-presets.service';
import {
  ContractDocumentPackageEstimateTransferService,
  ESTIMATE_TRANSFER_FORMAT,
  ESTIMATE_TRANSFER_VERSION,
  type EstimateTransferPayload,
} from '../src/admin/contract-document-packages/contract-document-package-estimate-transfer.service';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Укажите путь к JSON-файлу переноса расчёта');
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(filePath, 'utf8')) as EstimateTransferPayload;
  if (payload.format !== ESTIMATE_TRANSFER_FORMAT || payload.version !== ESTIMATE_TRANSFER_VERSION) {
    console.error('Файл не похож на экспорт расчёта (формат/версия)');
    process.exit(1);
  }

  const prisma = new PrismaService();
  const presets = new ContractDocumentPackageEstimatePresetsService(prisma);
  const transfer = new ContractDocumentPackageEstimateTransferService(prisma, presets);

  const report = await transfer.importEstimatePreset(payload, undefined);
  console.log('Импорт выполнен:');
  console.log(`  направление: ${report.kind}`);
  console.log(`  объекты: ${report.groupTitles.join('; ')}`);
  console.log(
    `  каталог: категорий создано ${report.catalogCategoriesCreated}, позиций создано ${report.catalogItemsCreated}, обновлено ${report.catalogItemsUpdated}`
  );

  const raw = await presets.loadEstimatePresetsRaw(ContractDocumentPackageKind.REPAIR);
  console.log(`Созданные расчёты (всего в базе теперь ${raw.items.length}):`);
  const byNewId = new Map(report.presets.map((r) => [r.id, r.title]));
  for (const preset of raw.items) {
    const title = byNewId.get(preset.id);
    if (title === undefined) continue;
    const keys = Array.isArray(preset.estimateWorkScopeKeys)
      ? `${preset.estimateWorkScopeKeys.length} ключей`
      : 'нет (доля = вся смета)';
    const base = preset.snapshot?.total ?? 0;
    console.log(
      `  [${preset.id}] «${preset.title}» — база ${base.toFixed(2)}, с наценкой ${(base * 1.2).toFixed(2)}, доля: ${keys}, связка: ${preset.splitBundleId ?? '—'}`
    );
  }
  await prisma.$disconnect();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
