/**
 * Сид библиотеки шаблонов «Жалюзи» в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-blinds-contract-templates
 * Прод: BLINDS_TEMPLATES_SEED_MODE=replace-library npm run prisma:seed-blinds-contract-templates
 *
 * Приоритет: backend/prisma/seed-data/blinds-library-templates.seed.json → frontend .ts
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
  kind: 'BLINDS',
  libraryTabs: LIBRARY_TABS,
  tabTitles: {
    contract: 'Договор',
    consent: 'Согласие на обработку персональных данных',
    actAcceptance: 'Акт приёма',
    deliveryNote: 'Накладная',
    memo: 'Памятка',
  },
  tabTemplateFiles: {
    contract: 'blindsTemplateContract.ts',
    consent: 'consent.ts',
    actAcceptance: 'blindsActAcceptance.ts',
    deliveryNote: 'blindsTemplateDeliveryNote.ts',
    memo: 'blindsTemplateMemo.ts',
  },
  seedIdPrefix: 'seed-blinds',
  envModeKey: 'BLINDS_TEMPLATES_SEED_MODE',
};

const prisma = new PrismaClient();

export async function seedBlindsContractTemplatePresets(): Promise<void> {
  await seedContractTemplatePresetsForKind(prisma, CFG);
}

async function main() {
  await seedBlindsContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
