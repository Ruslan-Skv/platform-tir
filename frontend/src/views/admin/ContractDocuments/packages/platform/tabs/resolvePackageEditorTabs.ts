import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import {
  getPackageDirectionConfig,
  isFurnitureLikePackageKind,
  isProductLikePackageKind,
} from '../../config';
import { isPackageEditorTabBarTab } from './isPackageEditorTabBarTab';
import { type PackageDocumentTabId, isPackageAddendumTabVisible } from './packageDocumentTabs';

const REPAIR_SUMMARY_TAIL_TAB_IDS: readonly PackageDocumentTabId[] = ['finalEstimate'];

const PRODUCT_SPEC_TAB_ID: PackageDocumentTabId = 'specification';

const FURNITURE_MONTAGE_ONLY_TABS: readonly PackageDocumentTabId[] = [
  'estimate',
  'actStart',
  'workOrder',
];

const FURNITURE_APPLIANCES_ONLY_TABS: readonly PackageDocumentTabId[] = ['deliveryNote'];

function reorderProductLikeEditorTabs(tabs: PackageDocumentTabId[]): PackageDocumentTabId[] {
  const next = [...tabs];

  const specIndex = next.indexOf(PRODUCT_SPEC_TAB_ID);

  if (specIndex >= 0) {
    next.splice(specIndex, 1);

    const invoiceOrderIndex = next.indexOf('estimate');

    const insertAt = invoiceOrderIndex >= 0 ? invoiceOrderIndex : 0;

    next.splice(insertAt, 0, PRODUCT_SPEC_TAB_ID);
  }

  const memoIndex = next.indexOf('memo');

  if (memoIndex >= 0) {
    next.splice(memoIndex, 1);

    const actIndex = next.indexOf('actAcceptance');

    const memoInsertAt = actIndex >= 0 ? actIndex + 1 : next.length;

    next.splice(memoInsertAt, 0, 'memo');
  }

  const deliveryNoteIndex = next.indexOf('deliveryNote');

  if (deliveryNoteIndex >= 0) {
    next.splice(deliveryNoteIndex, 1);

    const memoIdx = next.indexOf('memo');

    const deliveryInsertAt =
      memoIdx >= 0
        ? memoIdx
        : next.indexOf('actAcceptance') >= 0
          ? next.indexOf('actAcceptance') + 1
          : next.length;

    next.splice(deliveryInsertAt, 0, 'deliveryNote');
  }

  return next;
}

function summaryTailTabIds(
  packageKind: ContractDocumentPackageKind
): readonly PackageDocumentTabId[] {
  if (isProductLikePackageKind(packageKind)) return [PRODUCT_SPEC_TAB_ID];
  if (isFurnitureLikePackageKind(packageKind)) return [PRODUCT_SPEC_TAB_ID];
  return REPAIR_SUMMARY_TAIL_TAB_IDS;
}

/** Видимые вкладки редактора с учётом направления, hub-скрытий и порядка PRODUCT_LIKE. */
export function resolvePackageEditorVisibleTabs(input: {
  tabOrder: readonly PackageDocumentTabId[];
  packageKind: ContractDocumentPackageKind;
  addendumSlotCount: number;
  /** Мебель: вкладки монтажа только при включённой ноге. */
  furnitureMontageEnabled?: boolean;
  /** Мебель: перечень техники только при включённой ноге. */
  furnitureAppliancesEnabled?: boolean;
}): PackageDocumentTabId[] {
  const config = getPackageDirectionConfig(input.packageKind);

  const hidden = new Set(config.hiddenEditorTabs);

  const tailIds = summaryTailTabIds(input.packageKind);

  const montageEnabled = input.furnitureMontageEnabled === true;
  const appliancesEnabled = input.furnitureAppliancesEnabled === true;

  const visible = input.tabOrder.filter((id) => {
    if (id === 'payments') return false;

    if (!isPackageEditorTabBarTab(id, input.packageKind)) return false;

    if (id === 'memo' && !config.memoTabVisible) return false;

    if (id === 'deliveryNote' && !config.deliveryNoteTabVisible) return false;

    if (hidden.has(id)) return false;

    if (
      isFurnitureLikePackageKind(input.packageKind) &&
      (FURNITURE_MONTAGE_ONLY_TABS as readonly string[]).includes(id) &&
      !montageEnabled
    ) {
      return false;
    }

    if (
      isFurnitureLikePackageKind(input.packageKind) &&
      (FURNITURE_APPLIANCES_ONLY_TABS as readonly string[]).includes(id) &&
      !appliancesEnabled
    ) {
      return false;
    }

    return isPackageAddendumTabVisible(id, input.addendumSlotCount);
  });

  const baseOrdered = [
    ...visible.filter((id) => !tailIds.includes(id)),

    ...tailIds.filter((id) => visible.includes(id)),
  ];

  if (isProductLikePackageKind(input.packageKind)) {
    return reorderProductLikeEditorTabs(baseOrdered);
  }

  return baseOrdered;
}
