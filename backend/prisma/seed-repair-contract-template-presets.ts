/**
 * Сид библиотеки шаблонов «Ремонт» в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-repair-contract-templates
 * Прод: REPAIR_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-repair-contract-templates
 *
 * Приоритет: backend/prisma/seed-data/repair-library-templates.seed.json → frontend .ts
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

const LIBRARY_TABS = [
  'contract',
  'consent',
  'actStart',
  'actAcceptance',
  'cashOrder',
  'productionLog',
] as const;

const CFG: KindSeedConfig = {
  kind: 'REPAIR',
  libraryTabs: LIBRARY_TABS,
  tabTitles: {
    contract: 'Договор',
    consent: 'Согласие на обработку персональных данных',
    actStart: 'Акт начала работ',
    actAcceptance: 'Акт сдачи-приёмки',
    cashOrder: 'ПКО',
    productionLog: 'Производственный журнал',
  },
  tabTemplateFiles: {
    contract: 'contract.ts',
    consent: 'consent.ts',
    actStart: 'actStart.ts',
    actAcceptance: 'actAcceptance.ts',
    cashOrder: 'cashOrder.ts',
    productionLog: 'productionLog.ts',
  },
  seedIdPrefix: 'seed-repair',
  envModeKey: 'REPAIR_TEMPLATES_SEED_MODE',
};

const prisma = new PrismaClient();

export async function seedRepairContractTemplatePresets(): Promise<void> {
  await seedContractTemplatePresetsForKind(prisma, CFG);
}

async function main() {
  await seedRepairContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
