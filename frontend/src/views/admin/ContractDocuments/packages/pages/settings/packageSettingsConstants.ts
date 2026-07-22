import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import {
  applyRepairWorkPeriodToAllPackages,
  applyWindowsWorkPeriodToAllPackages,
  applyWorkPeriodToAllPackagesByKind,
  getContractDocumentRepairSettings,
  getContractDocumentWindowsSettings,
  getContractDocumentWorkPeriodSettings,
  putContractDocumentRepairSettings,
  putContractDocumentWindowsSettings,
  putContractDocumentWorkPeriodSettings,
} from '@/shared/api/admin-contract-document-packages';

import {
  DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
} from '../../platform/form/contractWorkPeriod';

export type WorkPeriodSettingsKind = Extract<
  ContractDocumentPackageKind,
  'REPAIR' | 'WINDOWS' | 'DOORS' | 'BLINDS' | 'CEILINGS'
>;

export type ApplyWorkPeriodToAllResult = {
  updated: number;
  skippedSigned?: number;
  skippedManual?: number;
};

type WorkPeriodKindConfigEntry = {
  title: string;
  inputId: string;
  fallbackDays: number;
  load: () => Promise<{ defaultWorkPeriodDays: number; updatedAt: string | null }>;
  save: (body: { defaultWorkPeriodDays: number }) => Promise<{
    defaultWorkPeriodDays: number;
    updatedAt: string | null;
  }>;
  applyToAll: (body: { workPeriodDays: number }) => Promise<ApplyWorkPeriodToAllResult>;
  applyConfirm: (days: number) => string;
  saveOk: string;
};

function productKindConfig(
  kind: Extract<WorkPeriodSettingsKind, 'DOORS' | 'BLINDS' | 'CEILINGS'>,
  title: string
): WorkPeriodKindConfigEntry {
  return {
    title,
    inputId: `package_${kind.toLowerCase()}_default_work_period`,
    fallbackDays: DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
    load: () => getContractDocumentWorkPeriodSettings(kind),
    save: (body) =>
      putContractDocumentWorkPeriodSettings({
        kind,
        defaultWorkPeriodDays: body.defaultWorkPeriodDays,
      }),
    applyToAll: (body) =>
      applyWorkPeriodToAllPackagesByKind({ kind, workPeriodDays: body.workPeriodDays }),
    applyConfirm: (days) =>
      `Срок по умолчанию сохранён (${days} дн.). Применить его ко всем неподписанным договорам «${title}» без ручного срока? Подписанные и с ручным сроком в карточке не изменятся.`,
    saveOk: `Срок по умолчанию для «${title}» сохранён.`,
  };
}

export const WORK_PERIOD_KIND_CONFIG: Record<WorkPeriodSettingsKind, WorkPeriodKindConfigEntry> = {
  REPAIR: {
    title: 'Ремонт',
    inputId: 'package_repair_default_work_period',
    fallbackDays: DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
    load: getContractDocumentRepairSettings,
    save: putContractDocumentRepairSettings,
    applyToAll: applyRepairWorkPeriodToAllPackages,
    applyConfirm: (days) =>
      `Срок по умолчанию сохранён (${days} дн.). Применить его ко всем неподписанным договорам «Ремонт» без ручного срока? Подписанные и с ручным сроком в карточке не изменятся.`,
    saveOk: 'Срок по умолчанию для «Ремонт» сохранён.',
  },
  WINDOWS: {
    title: 'Окна',
    inputId: 'package_windows_default_work_period',
    fallbackDays: DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
    load: getContractDocumentWindowsSettings,
    save: putContractDocumentWindowsSettings,
    applyToAll: applyWindowsWorkPeriodToAllPackages,
    applyConfirm: (days) =>
      `Срок по умолчанию сохранён (${days} дн.). Применить его ко всем неподписанным договорам «Окна» без ручного срока? Подписанные и с ручным сроком в карточке не изменятся.`,
    saveOk: 'Срок по умолчанию для «Окна» сохранён.',
  },
  DOORS: productKindConfig('DOORS', 'Двери'),
  BLINDS: productKindConfig('BLINDS', 'Жалюзи'),
  CEILINGS: productKindConfig('CEILINGS', 'Натяжные потолки'),
};
