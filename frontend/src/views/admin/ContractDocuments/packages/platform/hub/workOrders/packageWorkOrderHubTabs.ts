import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import {
  PACKAGE_DOCUMENT_TAB_LABELS,
  PACKAGE_DOCUMENT_TAB_LABELS_SHORT,
  type PackageDocumentTabId,
  isPackageAddendumTabVisible,
  isPackageWorkOrderAddendumTab,
} from '../../tabs/packageDocumentTabs';

/** Вкладки заказ-нарядов и связанных итоговых смет — в модалке и (пока) в редакторе пакета. */
export const PACKAGE_WORK_ORDER_HUB_TAB_IDS = [
  'workOrder',
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
  'interactiveFinalEstimate',
  'finalWorkOrder',
] as const;

export type PackageWorkOrderHubTabId = (typeof PACKAGE_WORK_ORDER_HUB_TAB_IDS)[number];

export const PACKAGE_WORK_ORDER_HUB_MODAL_TITLE = 'Заказ-наряды';

export function formatPackageWorkOrderHubModalTitle(
  contractNumberLabel?: string,
  contractDateLabel?: string | null
): string {
  const num = contractNumberLabel?.trim();
  if (!num) return PACKAGE_WORK_ORDER_HUB_MODAL_TITLE;
  const dateSuffix = contractDateLabel ? ` от ${contractDateLabel}` : '';
  return `Заказ-наряды договора №${num}${dateSuffix}`;
}

export function isPackageWorkOrderHubTab(id: string): id is PackageWorkOrderHubTabId {
  return (PACKAGE_WORK_ORDER_HUB_TAB_IDS as readonly string[]).includes(id);
}

/** Вкладки пакета, перенесённые в модалку «Заказ-наряды» (не показывать в строке вкладок редактора). */
export function isPackageWorkOrderHubTabHiddenFromPackageEditor(id: string): boolean {
  return isPackageWorkOrderHubTab(id);
}

const WINDOWS_WORK_ORDER_HUB_TAB_LABELS_SHORT: Partial<Record<PackageWorkOrderHubTabId, string>> = {
  interactiveFinalEstimate: 'Инт. счёт-заказ',
};

const WINDOWS_WORK_ORDER_HUB_TAB_LABELS: Partial<Record<PackageWorkOrderHubTabId, string>> = {
  interactiveFinalEstimate: 'Интерактивный счёт-заказ',
};

export function packageWorkOrderHubTabsForPackage(
  addendumSlotCount: number,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): PackageWorkOrderHubTabId[] {
  return PACKAGE_WORK_ORDER_HUB_TAB_IDS.filter((id) => {
    if (isPackageWorkOrderAddendumTab(id)) {
      return isPackageAddendumTabVisible(id as PackageDocumentTabId, addendumSlotCount);
    }
    return true;
  });
}

export function packageWorkOrderHubTabLabel(
  id: PackageWorkOrderHubTabId,
  short = true,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): string {
  if (isProductDirectionPackageKind(packageKind)) {
    const override = short
      ? WINDOWS_WORK_ORDER_HUB_TAB_LABELS_SHORT[id]
      : WINDOWS_WORK_ORDER_HUB_TAB_LABELS[id];
    if (override) return override;
  }
  return short ? PACKAGE_DOCUMENT_TAB_LABELS_SHORT[id] : PACKAGE_DOCUMENT_TAB_LABELS[id];
}

export function defaultPackageWorkOrderHubTab(
  preferred: PackageDocumentTabId | null,
  addendumSlotCount: number,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): PackageWorkOrderHubTabId {
  const visible = packageWorkOrderHubTabsForPackage(addendumSlotCount, packageKind);
  if (preferred && isPackageWorkOrderHubTab(preferred) && visible.includes(preferred)) {
    return preferred;
  }
  return visible[0] ?? 'workOrder';
}
