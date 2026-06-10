import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { RepairDocumentTabId } from '../directions/repair/documents/repairDocumentTabs';
import type { RepairLibraryTemplateTabId } from '../directions/repair/documents/repairLibraryTemplateTabs';

/** Семейство пакета: ремонтный конвейер или «товарное» направление (окна, двери, …). */
export type PackageDirectionFamily = 'REPAIR_LIKE' | 'PRODUCT_LIKE' | 'UNIMPLEMENTED';

export type PackageTabLabelOverride = {
  full: string;
  short: string;
};

export type PackageDirectionConfig = {
  kind: ContractDocumentPackageKind;
  family: PackageDirectionFamily;
  label: string;
  /** Кнопка «Создать» в списке договоров. */
  createEnabled: boolean;
  /** Вкладки, скрытые из строки табов редактора (hub-модалки и т.п. — отдельно). */
  hiddenEditorTabs: readonly RepairDocumentTabId[];
  /** Памятка в строке вкладок (только PRODUCT_LIKE). */
  memoTabVisible: boolean;
  /** Переопределения подписей вкладок (счёт-заказ, …). */
  tabLabelOverrides: Partial<Record<RepairDocumentTabId, PackageTabLabelOverride>>;
  profilesKind: ContractDocumentPackageKind;
  settingsKind: ContractDocumentPackageKind;
  estimateCatalogKind: ContractDocumentPackageKind;
  templatePresetsKind: ContractDocumentPackageKind;
  excludedLibraryTemplateTabs: readonly RepairLibraryTemplateTabId[];
};
