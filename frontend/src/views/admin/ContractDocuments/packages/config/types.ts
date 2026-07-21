import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTabId } from '../platform/tabs/packageDocumentTabs';
import type { PackageLibraryTemplateTabId } from '../platform/tabs/packageLibraryTemplateTabs';

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
  hiddenEditorTabs: readonly PackageDocumentTabId[];
  /** Памятка в строке вкладок (только PRODUCT_LIKE). */
  memoTabVisible: boolean;
  /** Накладная в строке вкладок (Двери, Жалюзи, …). */
  deliveryNoteTabVisible: boolean;
  /**
   * Спецификация строками (как «Двери»), а не файлом+суммой (как «Окна»).
   * Позиции хранятся в `doorsSpecificationLines` до обобщения модели.
   */
  lineSpecificationEnabled: boolean;
  /** Переопределения подписей вкладок (счёт-заказ, …). */
  tabLabelOverrides: Partial<Record<PackageDocumentTabId, PackageTabLabelOverride>>;
  profilesKind: ContractDocumentPackageKind;
  settingsKind: ContractDocumentPackageKind;
  estimateCatalogKind: ContractDocumentPackageKind;
  templatePresetsKind: ContractDocumentPackageKind;
  excludedLibraryTemplateTabs: readonly PackageLibraryTemplateTabId[];
};
