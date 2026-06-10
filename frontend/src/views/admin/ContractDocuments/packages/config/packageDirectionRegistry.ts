import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { RepairDocumentTabId } from '../directions/repair/documents/repairDocumentTabs';
import type { RepairLibraryTemplateTabId } from '../directions/repair/documents/repairLibraryTemplateTabs';
import type { PackageDirectionConfig, PackageDirectionFamily } from './types';

const PRODUCT_LIKE_HIDDEN_EDITOR_TABS: readonly RepairDocumentTabId[] = [
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

const PRODUCT_LIBRARY_EXCLUDED: readonly RepairLibraryTemplateTabId[] = [
  'actStart',
  'productionLog',
];

const REPAIR_LIBRARY_EXCLUDED: readonly RepairLibraryTemplateTabId[] = ['memo'];

const PRODUCT_TAB_LABEL_OVERRIDES: PackageDirectionConfig['tabLabelOverrides'] = {
  estimate: { full: 'Счёт-заказ', short: 'Счёт-заказ' },
};

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
    tabLabelOverrides: {},
    profilesKind: kind,
    settingsKind: 'REPAIR',
    estimateCatalogKind: kind,
    templatePresetsKind: kind,
    excludedLibraryTemplateTabs: REPAIR_LIBRARY_EXCLUDED,
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
    tabLabelOverrides: PRODUCT_TAB_LABEL_OVERRIDES,
    profilesKind: 'REPAIR',
    settingsKind: 'WINDOWS',
    estimateCatalogKind: 'REPAIR',
    templatePresetsKind: kind,
    excludedLibraryTemplateTabs: PRODUCT_LIBRARY_EXCLUDED,
  };
}

function unimplementedConfig(
  kind: ContractDocumentPackageKind,
  label: string
): PackageDirectionConfig {
  return {
    kind,
    family: 'UNIMPLEMENTED',
    label,
    createEnabled: false,
    hiddenEditorTabs: [...PRODUCT_LIKE_HIDDEN_EDITOR_TABS, 'specification'],
    memoTabVisible: false,
    tabLabelOverrides: {},
    profilesKind: 'REPAIR',
    settingsKind: 'REPAIR',
    estimateCatalogKind: 'REPAIR',
    templatePresetsKind: kind,
    excludedLibraryTemplateTabs: PRODUCT_LIBRARY_EXCLUDED,
  };
}

const PACKAGE_DIRECTION_REGISTRY: Record<ContractDocumentPackageKind, PackageDirectionConfig> = {
  REPAIR: repairLikeConfig('REPAIR', 'Ремонт', true),
  WINDOWS: productLikeConfig('WINDOWS', 'Окна'),
  DOORS: productLikeConfig('DOORS', 'Двери'),
  CEILINGS: unimplementedConfig('CEILINGS', 'Потолки'),
  BLINDS: unimplementedConfig('BLINDS', 'Жалюзи'),
  FURNITURE: unimplementedConfig('FURNITURE', 'Мебель'),
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

export function packageKindUiLabel(kind: ContractDocumentPackageKind): string {
  return getPackageDirectionConfig(kind).label;
}

export function packageKindsWithCreateEnabled(): ContractDocumentPackageKind[] {
  return (Object.keys(PACKAGE_DIRECTION_REGISTRY) as ContractDocumentPackageKind[]).filter(
    (k) => PACKAGE_DIRECTION_REGISTRY[k].createEnabled
  );
}

export const PACKAGE_DIRECTION_REGISTRY_LIST = Object.values(PACKAGE_DIRECTION_REGISTRY);
