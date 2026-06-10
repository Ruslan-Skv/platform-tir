import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { getPackageDirectionConfig } from '../../config';

/**
 * Вкладки библиотеки шаблонов «Ремонт» — только документы, редактируемые через пресеты.
 * Сметы, Д/с, заказ-наряды и анкеты формируются отдельно.
 */
export const PACKAGE_LIBRARY_TEMPLATE_TAB_IDS = [
  'contract',
  'actStart',
  'actAcceptance',
  'memo',
  'cashOrder',
  'paymentInvoice',
  'productionLog',
] as const;

export type PackageLibraryTemplateTabId = (typeof PACKAGE_LIBRARY_TEMPLATE_TAB_IDS)[number];

export const PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS: Record<PackageLibraryTemplateTabId, string> = {
  contract: 'Договор',
  actStart: 'Акт начала работ',
  actAcceptance: 'Акт сдачи-приёмки',
  memo: 'Памятка',
  cashOrder: 'ПКО',
  paymentInvoice: 'Счёт на оплату',
  productionLog: 'Производственный журнал',
};

export function isPackageLibraryTemplateTabId(id: string): id is PackageLibraryTemplateTabId {
  return (PACKAGE_LIBRARY_TEMPLATE_TAB_IDS as readonly string[]).includes(id);
}

/** tabId пресета для отображения в библиотеке; legacy-вкладки не показываются (пометьте архивом). */
export function packageLibraryTemplateTabIdFromPreset(
  value: string | undefined
): PackageLibraryTemplateTabId | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (isPackageLibraryTemplateTabId(v)) return v;
  return null;
}

/** Нормализация при выборе вкладки в UI (всегда одна из пяти рабочих). */
export function normalizePackageLibraryTemplateTabId(
  value: string | undefined
): PackageLibraryTemplateTabId {
  return packageLibraryTemplateTabIdFromPreset(value) ?? 'contract';
}

/** Вкладки библиотеки для направления — из реестра `packages/config`. */
export function libraryTemplateTabIdsForPackageKind(
  kind: ContractDocumentPackageKind
): readonly PackageLibraryTemplateTabId[] {
  const excluded = new Set(getPackageDirectionConfig(kind).excludedLibraryTemplateTabs);
  return PACKAGE_LIBRARY_TEMPLATE_TAB_IDS.filter((tab) => !excluded.has(tab));
}

export function normalizeLibraryTemplateTabForPackageKind(
  value: string | undefined,
  kind: ContractDocumentPackageKind
): PackageLibraryTemplateTabId {
  const tab = normalizePackageLibraryTemplateTabId(value);
  const allowed = libraryTemplateTabIdsForPackageKind(kind);
  return (allowed as readonly string[]).includes(tab) ? tab : 'contract';
}
