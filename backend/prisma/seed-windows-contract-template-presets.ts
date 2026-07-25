/**
 * Сид библиотеки шаблонов «Окна» в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-windows-contract-templates
 * Прод: WINDOWS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-windows-contract-templates
 *
 * Приоритет: backend/prisma/seed-data/windows-library-templates.seed.json → frontend .ts
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

/** Вкладки библиотеки «Окна» (без actStart / productionLog / deliveryNote). */
const LIBRARY_TABS = [
  'contract',
  'consent',
  'actAcceptance',
  'memo',
  'cashOrder',
] as const;

const CFG: KindSeedConfig = {
  kind: 'WINDOWS',
  libraryTabs: LIBRARY_TABS,
  tabTitles: {
    contract: 'Договор',
    consent: 'Согласие на обработку персональных данных',
    actAcceptance: 'Акт сдачи-приёмки',
    memo: 'Памятка',
    cashOrder: 'ПКО',
  },
  tabTemplateFiles: {
    contract: 'contract.ts',
    consent: 'consent.ts',
    actAcceptance: 'windowsActAcceptance.ts',
    memo: 'memo.ts',
    cashOrder: 'cashOrder.ts',
  },
  seedIdPrefix: 'seed-windows',
  envModeKey: 'WINDOWS_TEMPLATES_SEED_MODE',
};

const prisma = new PrismaClient();

export async function seedWindowsContractTemplatePresets(): Promise<void> {
  await seedContractTemplatePresetsForKind(prisma, CFG);
}

async function main() {
  await seedWindowsContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
