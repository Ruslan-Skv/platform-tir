/**
 * Сид библиотеки шаблонов «Двери» в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-doors-contract-templates
 * Прод: DOORS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-doors-contract-templates
 *
 * Приоритет: backend/prisma/seed-data/doors-library-templates.seed.json → frontend .ts
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

const LIBRARY_TABS = ['contract', 'consent', 'actAcceptance', 'deliveryNote', 'memo'] as const;

const CFG: KindSeedConfig = {
  kind: 'DOORS',
  libraryTabs: LIBRARY_TABS,
  tabTitles: {
    contract: 'Договор',
    consent: 'Согласие на обработку персональных данных',
    actAcceptance: 'Акт приёма',
    deliveryNote: 'Накладная',
    memo: 'Памятка',
  },
  tabTemplateFiles: {
    contract: 'doorsTemplateContract.ts',
    consent: 'consent.ts',
    actAcceptance: 'doorsActAcceptance.ts',
    deliveryNote: 'doorsTemplateDeliveryNote.ts',
    memo: 'doorsTemplateMemo.ts',
  },
  seedIdPrefix: 'seed-doors',
  envModeKey: 'DOORS_TEMPLATES_SEED_MODE',
};

const prisma = new PrismaClient();

export async function seedDoorsContractTemplatePresets(): Promise<void> {
  await seedContractTemplatePresetsForKind(prisma, CFG);
}

async function main() {
  await seedDoorsContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
