/**
 * CLI: импорт ручек Стройком (1 позиция сайта = 1 Product).
 *
 *   npx ts-node --transpile-only scripts/import-stroykom-handles.ts --limit=3 --ensure-category
 *   npx ts-node --transpile-only scripts/import-stroykom-handles.ts --supplierId=... --categoryId=...
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  DEFAULT_HANDLES_TARGET_CATEGORY_ID,
  StroykomHandlesImportService,
} from '../src/admin/catalog/products/services/stroykom-handles-import.service';

type CliOptions = {
  categoryId: string;
  supplierId?: string;
  limit?: number;
  delayMs: number;
  skipExisting: boolean;
  ensureCategory: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    categoryId: DEFAULT_HANDLES_TARGET_CATEGORY_ID,
    skipExisting: true,
    delayMs: 300,
    ensureCategory: false,
  };
  for (const arg of argv) {
    if (arg === '--ensure-category') opts.ensureCategory = true;
    else if (arg === '--skip-existing') opts.skipExisting = true;
    else if (arg === '--no-skip-existing') opts.skipExisting = false;
    else if (arg.startsWith('--categoryId=')) opts.categoryId = arg.slice('--categoryId='.length);
    else if (arg.startsWith('--supplierId=')) opts.supplierId = arg.slice('--supplierId='.length);
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--delayMs=')) opts.delayMs = Number(arg.slice('--delayMs='.length));
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('Options:', opts);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(StroykomHandlesImportService);
    const job = await svc.importSync({
      categoryId: opts.categoryId,
      supplierId: opts.supplierId,
      limit: opts.limit,
      delayMs: opts.delayMs,
      skipExisting: opts.skipExisting,
      ensureCategory: opts.ensureCategory,
    });

    console.log('Result:', {
      status: job.status,
      categoryId: job.categoryId,
      supplierId: job.supplierId,
      total: job.total,
      created: job.created,
      skipped: job.skipped,
      errors: job.errors.length,
      message: job.message,
    });
    if (job.errors.length) console.log('Errors sample:', job.errors.slice(0, 10));
    if (job.status === 'error') process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
