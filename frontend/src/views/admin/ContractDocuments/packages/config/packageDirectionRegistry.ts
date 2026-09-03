import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTabId } from '../platform/tabs/packageDocumentTabs';
import type { PackageLibraryTemplateTabId } from '../platform/tabs/packageLibraryTemplateTabs';
import type { PackageDirectionConfig, PackageDirectionFamily } from './types';

const PRODUCT_LIKE_HIDDEN_EDITOR_TABS: readonly PackageDocumentTabId[] = [
  'actStart',
  'productionLog',
  'interactiveFinalEstimate',
  'finalEstimate',
  'finalWorkOrder',
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
];

const PRODUCT_LIBRARY_EXCLUDED: readonly PackageLibraryTemplateTabId[] = [
  'actStart',
  'productionLog',
  'deliveryNote',
];

const REPAIR_DIRECTION_LIBRARY_EXCLUDED: readonly PackageLibraryTemplateTabId[] = [
  'memo',
  'deliveryNote',
];

const PRODUCT_TAB_LABEL_OVERRIDES: PackageDirectionConfig['tabLabelOverrides'] = {
  estimate: { full: 'Счёт-заказ', short: 'Счёт-заказ' },
};

/** Товарные направления со спецификацией строками и накладной (как «Двери»). */
const PRODUCT_LINE_SPEC_LIBRARY_EXCLUDED: readonly PackageLibraryTemplateTabId[] = [
  'actStart',
  'productionLog',
];

/** Потолки: своя спецификация, без накладной. */
const CEILINGS_LIBRARY_EXCLUDED: readonly PackageLibraryTemplateTabId[] = [
  'actStart',
  'productionLog',
  'deliveryNote',
];

function repairLikeConfig(
  kind: ContractDocumentPackageKind,
  label: string,
  createEnabled: boolean
): PackageDirectionConfig {
  return {
    kind,
    family: 'REPAIR_LIKE',
    label,
    createEnabled,
    hiddenEditorTabs: ['specification'],
    memoTabVisible: false,
    deliveryNoteTabVisible: false,
    lineSpecificationEnabled: false,
    tabLabelOverrides: {},
    profilesKind: kind,
    settingsKind: 'REPAIR',
    estimateCatalogKind: kind,
    templatePresetsKind: kind,
    excludedLibraryTemplateTabs: REPAIR_DIRECTION_LIBRARY_EXCLUDED,
  };
}

function productLikeConfig(
  kind: ContractDocumentPackageKind,
  label: string
): PackageDirectionConfig {
  return {
    kind,
    family: 'PRODUCT_LIKE',
    label,
    createEnabled: true,
    hiddenEditorTabs: PRODUCT_LIKE_HIDDEN_EDITOR_TABS,
    memoTabVisible: true,
    deliveryNoteTabVisible: false,
    lineSpecificationEnabled: false,
    tabLabelOverrides: PRODUCT_TAB_LABEL_OVERRIDES,
    profilesKind: 'REPAIR',
    settingsKind: 'WINDOWS',
    estimateCatalogKind: 'REPAIR',
    templatePresetsKind: kind,
    excludedLibraryTemplateTabs: PRODUCT_LIBRARY_EXCLUDED,
  };
}

function productLikeWithLineSpecification(
  kind: ContractDocumentPackageKind,
  label: string
): PackageDirectionConfig {
  return {
    ...productLikeConfig(kind, label),
    deliveryNoteTabVisible: true,
    lineSpecificationEnabled: true,
    /** Срок договора — отдельная настройка по направлению (не общая с «Окна»). */
    settingsKind: kind,
    excludedLibraryTemplateTabs: PRODUCT_LINE_SPEC_LIBRARY_EXCLUDED,
  };
}

function furnitureLikeConfig(
  kind: ContractDocumentPackageKind,
  label: string
): PackageDirectionConfig {
  return {
    kind,
    family: 'FURNITURE_LIKE',
    label,
    createEnabled: true,
    /** Этап 4: deliveryNote = Переч техники — видна при включённой ноге (см. resolvePackageEditorVisibleTabs). */
    hiddenEditorTabs: [
      ...PRODUCT_LIKE_HIDDEN_EDITOR_TABS.filter((id) => id !== 'actStart'),
      'questionnaire1',
      'questionnaire2',
    ],
    memoTabVisible: true,
    deliveryNoteTabVisible: true,
    lineSpecificationEnabled: false,
    tabLabelOverrides: {
      memo: { full: 'Инструкция', short: 'Инструкция' },
      specification: { full: 'Спецификация', short: 'Спецификация' },
      actAcceptance: { full: 'Акт сдачи-приёмки', short: 'Акт приём.' },
      estimate: { full: 'Счёт-заказ (монтаж)', short: 'Счёт-заказ' },
      actStart: { full: 'Акт готовности к монтажу', short: 'Акт ГкМ' },
      workOrder: { full: 'Заказ-наряд', short: 'З-наряд' },
      deliveryNote: { full: 'Перечень товара', short: 'Перечень' },
    },
    profilesKind: 'REPAIR',
    settingsKind: kind,
    estimateCatalogKind: 'REPAIR',
    templatePresetsKind: kind,
    excludedLibraryTemplateTabs: ['productionLog', 'deliveryNote'],
  };
}

const PACKAGE_DIRECTION_REGISTRY: Record<ContractDocumentPackageKind, PackageDirectionConfig> = {
  REPAIR: repairLikeConfig('REPAIR', 'Ремонт', true),
  WINDOWS: productLikeConfig('WINDOWS', 'Окна'),
  DOORS: productLikeWithLineSpecification('DOORS', 'Двери'),
  CEILINGS: {
    ...productLikeWithLineSpecification('CEILINGS', 'Потолки'),
    deliveryNoteTabVisible: false,
    excludedLibraryTemplateTabs: CEILINGS_LIBRARY_EXCLUDED,
  },
  BLINDS: productLikeWithLineSpecification('BLINDS', 'Жалюзи'),
  FURNITURE: furnitureLikeConfig('FURNITURE', 'Мебель'),
};

export function getPackageDirectionConfig(
  kind: ContractDocumentPackageKind
): PackageDirectionConfig {
  return PACKAGE_DIRECTION_REGISTRY[kind];
}

export function getPackageDirectionFamily(
  kind: ContractDocumentPackageKind
): PackageDirectionFamily {
  return getPackageDirectionConfig(kind).family;
}

export function isProductLikePackageKind(
  kind: ContractDocumentPackageKind | undefined | null
): boolean {
  if (!kind) return false;
  return getPackageDirectionConfig(kind).family === 'PRODUCT_LIKE';
}

export function isRepairLikePackageKind(
  kind: ContractDocumentPackageKind | undefined | null
): boolean {
  if (!kind) return false;
  return getPackageDirectionConfig(kind).family === 'REPAIR_LIKE';
}

export function isFurnitureLikePackageKind(
  kind: ContractDocumentPackageKind | undefined | null
): boolean {
  if (!kind) return false;
  return getPackageDirectionConfig(kind).family === 'FURNITURE_LIKE';
}

/** Спецификация строками + накладная из этих строк (Двери, Жалюзи, …). */
export function packageUsesLineSpecification(
  kind: ContractDocumentPackageKind | undefined | null
): boolean {
  if (!kind) return false;
  return getPackageDirectionConfig(kind).lineSpecificationEnabled;
}

export function packageKindUiLabel(kind: ContractDocumentPackageKind): string {
  return getPackageDirectionConfig(kind).label;
}

export function packageKindsWithCreateEnabled(): ContractDocumentPackageKind[] {
  return (Object.keys(PACKAGE_DIRECTION_REGISTRY) as ContractDocumentPackageKind[]).filter(
    (k) => PACKAGE_DIRECTION_REGISTRY[k].createEnabled
  );
}

/** Пакет kind → slug CRM-направления (единый маппинг с backend). */
export const PACKAGE_KIND_DIRECTION_SLUG: Record<ContractDocumentPackageKind, string> = {
  REPAIR: 'repair',
  WINDOWS: 'windows',
  DOORS: 'doors',
  CEILINGS: 'stretch-ceilings',
  BLINDS: 'blinds',
  FURNITURE: 'furniture',
};

export const PACKAGE_DIRECTION_REGISTRY_LIST = Object.values(PACKAGE_DIRECTION_REGISTRY);
