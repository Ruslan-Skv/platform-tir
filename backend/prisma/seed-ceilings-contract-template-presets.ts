/**
 * Сид библиотеки шаблонов «Натяжные потолки» в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-ceilings-contract-templates
 * Прод: CEILINGS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-ceilings-contract-templates
 *
 * Приоритет: backend/prisma/seed-data/ceilings-library-templates.seed.json → frontend .ts
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

import {
  seedContractTemplatePresetsForKind,
  type KindSeedConfig,
} from './seed-contract-template-presets-lib';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '..', '.env') });

/** Без накладной / actStart / productionLog (как в UI потолков). */
const LIBRARY_TABS = ['contract', 'consent', 'actAcceptance', 'memo'] as const;

const CFG: KindSeedConfig = {
  kind: 'CEILINGS',
  libraryTabs: LIBRARY_TABS,
  tabTitles: {
    contract: 'Договор',
    consent: 'Согласие на обработку персональных данных',
    actAcceptance: 'Акт сдачи-приёмки',
    memo: 'Памятка',
  },
  tabTemplateFiles: {
    contract: 'ceilingsTemplateContract.ts',
    consent: 'consent.ts',
    actAcceptance: 'doorsActAcceptance.ts',
    memo: 'ceilingsTemplateMemo.ts',
  },
  seedIdPrefix: 'seed-ceilings',
  envModeKey: 'CEILINGS_TEMPLATES_SEED_MODE',
};

const prisma = new PrismaClient();

export async function seedCeilingsContractTemplatePresets(): Promise<void> {
  await seedContractTemplatePresetsForKind(prisma, CFG);
}

async function main() {
  await seedCeilingsContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
