import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import {
  applyRepairWorkPeriodToAllPackages,
  applyWindowsWorkPeriodToAllPackages,
  getContractDocumentRepairSettings,
  getContractDocumentWindowsSettings,
  putContractDocumentRepairSettings,
  putContractDocumentWindowsSettings,
} from '@/shared/api/admin-contract-document-packages';

import {
  DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
} from '../../platform/form/contractWorkPeriod';

export type WorkPeriodSettingsKind = Extract<ContractDocumentPackageKind, 'REPAIR' | 'WINDOWS'>;

export type ApplyWorkPeriodToAllResult = {
  updated: number;
  skippedSigned?: number;
  skippedManual?: number;
};

export const WORK_PERIOD_KIND_CONFIG: Record<
  WorkPeriodSettingsKind,
  {
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
  }
> = {
  REPAIR: {
    title: 'Ремонт',
    inputId: 'package_repair_default_work_period',
    fallbackDays: DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
    load: getContractDocumentRepairSettings,
    save: putContractDocumentRepairSettings,
    applyToAll: applyRepairWorkPeriodToAllPackages,
    applyConfirm: (days) =>
      `Установить срок ${days} рабочих дней во всех неподписанных договорах «Ремонт» без ручного срока? Подписанные договоры и договоры, где суперадмин задал срок в карточке, не изменятся.`,
    saveOk:
      'Срок по умолчанию для «Ремонт» сохранён. Новые договоры и договоры без ручного срока получат его при открытии (если не задан свой срок).',
  },
  WINDOWS: {
    title: 'Окна',
    inputId: 'package_windows_default_work_period',
    fallbackDays: DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
    load: getContractDocumentWindowsSettings,
    save: putContractDocumentWindowsSettings,
    applyToAll: applyWindowsWorkPeriodToAllPackages,
    applyConfirm: (days) =>
      `Установить срок ${days} рабочих дней во всех неподписанных договорах «Окна» без ручного срока? Подписанные договоры и договоры, где суперадмин задал срок в карточке, не изменятся.`,
    saveOk:
      'Срок по умолчанию для «Окна» сохранён. Новые договоры и договоры без ручного срока получат его при открытии (если не задан свой срок).',
  },
};
