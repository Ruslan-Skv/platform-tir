import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { getPackageDirectionConfig, isProductLikePackageKind } from '../../config';
import { isPackageEditorTabBarTab } from './isPackageEditorTabBarTab';
import { type PackageDocumentTabId, isPackageAddendumTabVisible } from './packageDocumentTabs';

const REPAIR_SUMMARY_TAIL_TAB_IDS: readonly PackageDocumentTabId[] = ['finalEstimate'];

const PRODUCT_SPEC_TAB_ID: PackageDocumentTabId = 'specification';

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

  return next;
}

function summaryTailTabIds(
  packageKind: ContractDocumentPackageKind
): readonly PackageDocumentTabId[] {
  return isProductLikePackageKind(packageKind)
    ? [PRODUCT_SPEC_TAB_ID]
    : REPAIR_SUMMARY_TAIL_TAB_IDS;
}

/** Видимые вкладки редактора с учётом направления, hub-скрытий и порядка PRODUCT_LIKE. */

export function resolvePackageEditorVisibleTabs(input: {
  tabOrder: readonly PackageDocumentTabId[];

  packageKind: ContractDocumentPackageKind;

  addendumSlotCount: number;
}): PackageDocumentTabId[] {
  const config = getPackageDirectionConfig(input.packageKind);

  const hidden = new Set(config.hiddenEditorTabs);

  const tailIds = summaryTailTabIds(input.packageKind);

  const visible = input.tabOrder.filter((id) => {
    if (id === 'payments') return false;

    if (!isPackageEditorTabBarTab(id)) return false;

    if (id === 'memo' && !config.memoTabVisible) return false;

    if (hidden.has(id)) return false;

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
