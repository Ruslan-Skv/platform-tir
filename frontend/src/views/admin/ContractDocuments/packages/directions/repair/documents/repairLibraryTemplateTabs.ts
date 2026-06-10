import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { getPackageDirectionConfig } from '../../../config';

/**
 * Вкладки библиотеки шаблонов «Ремонт» — только документы, редактируемые через пресеты.
 * Сметы, Д/с, заказ-наряды и анкеты формируются отдельно.
 */
export const REPAIR_LIBRARY_TEMPLATE_TAB_IDS = [
  'contract',
  'actStart',
  'actAcceptance',
  'memo',
  'cashOrder',
  'paymentInvoice',
  'productionLog',
] as const;

export type RepairLibraryTemplateTabId = (typeof REPAIR_LIBRARY_TEMPLATE_TAB_IDS)[number];

export const REPAIR_LIBRARY_TEMPLATE_TAB_LABELS: Record<RepairLibraryTemplateTabId, string> = {
  contract: 'Договор',
  actStart: 'Акт начала работ',
  actAcceptance: 'Акт сдачи-приёмки',
  memo: 'Памятка',
  cashOrder: 'ПКО',
  paymentInvoice: 'Счёт на оплату',
  productionLog: 'Производственный журнал',
};

export function isRepairLibraryTemplateTabId(id: string): id is RepairLibraryTemplateTabId {
  return (REPAIR_LIBRARY_TEMPLATE_TAB_IDS as readonly string[]).includes(id);
}

/** tabId пресета для отображения в библиотеке; legacy-вкладки не показываются (пометьте архивом). */
export function repairLibraryTemplateTabIdFromPreset(
  value: string | undefined
): RepairLibraryTemplateTabId | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (isRepairLibraryTemplateTabId(v)) return v;
  return null;
}

/** Нормализация при выборе вкладки в UI (всегда одна из пяти рабочих). */
export function normalizeRepairLibraryTemplateTabId(
  value: string | undefined
): RepairLibraryTemplateTabId {
  return repairLibraryTemplateTabIdFromPreset(value) ?? 'contract';
}

/** Вкладки библиотеки для направления — из реестра `packages/config`. */
export function libraryTemplateTabIdsForPackageKind(
  kind: ContractDocumentPackageKind
): readonly RepairLibraryTemplateTabId[] {
  const excluded = new Set(getPackageDirectionConfig(kind).excludedLibraryTemplateTabs);
  return REPAIR_LIBRARY_TEMPLATE_TAB_IDS.filter((tab) => !excluded.has(tab));
}

export function normalizeLibraryTemplateTabForPackageKind(
  value: string | undefined,
  kind: ContractDocumentPackageKind
): RepairLibraryTemplateTabId {
  const tab = normalizeRepairLibraryTemplateTabId(value);
  const allowed = libraryTemplateTabIdsForPackageKind(kind);
  return (allowed as readonly string[]).includes(tab) ? tab : 'contract';
}
