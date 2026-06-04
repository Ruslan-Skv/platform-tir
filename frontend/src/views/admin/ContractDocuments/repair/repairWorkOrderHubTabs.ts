import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import {
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TAB_LABELS_SHORT,
  type RepairDocumentTabId,
  isRepairAddendumTabVisible,
  isRepairWorkOrderAddendumTab,
} from './repairDocumentTabs';

/** Вкладки заказ-нарядов и связанных итоговых смет — в модалке и (пока) в редакторе пакета. */
export const REPAIR_WORK_ORDER_HUB_TAB_IDS = [
  'workOrder',
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
  'interactiveFinalEstimate',
  'finalWorkOrder',
] as const;

export type RepairWorkOrderHubTabId = (typeof REPAIR_WORK_ORDER_HUB_TAB_IDS)[number];

export const REPAIR_WORK_ORDER_HUB_MODAL_TITLE = 'Заказ-наряды';

export function formatRepairWorkOrderHubModalTitle(
  contractNumberLabel?: string,
  contractDateLabel?: string | null
): string {
  const num = contractNumberLabel?.trim();
  if (!num) return REPAIR_WORK_ORDER_HUB_MODAL_TITLE;
  const dateSuffix = contractDateLabel ? ` от ${contractDateLabel}` : '';
  return `Заказ-наряды договора №${num}${dateSuffix}`;
}

export function isRepairWorkOrderHubTab(id: string): id is RepairWorkOrderHubTabId {
  return (REPAIR_WORK_ORDER_HUB_TAB_IDS as readonly string[]).includes(id);
}

/** Вкладки пакета, перенесённые в модалку «Заказ-наряды» (не показывать в строке вкладок редактора). */
export function isRepairWorkOrderHubTabHiddenFromPackageEditor(id: string): boolean {
  return isRepairWorkOrderHubTab(id);
}

const WINDOWS_WORK_ORDER_HUB_TAB_LABELS_SHORT: Partial<Record<RepairWorkOrderHubTabId, string>> = {
  interactiveFinalEstimate: 'Инт. счёт-заказ',
};

const WINDOWS_WORK_ORDER_HUB_TAB_LABELS: Partial<Record<RepairWorkOrderHubTabId, string>> = {
  interactiveFinalEstimate: 'Интерактивный счёт-заказ',
};

export function repairWorkOrderHubTabsForPackage(
  addendumSlotCount: number,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): RepairWorkOrderHubTabId[] {
  return REPAIR_WORK_ORDER_HUB_TAB_IDS.filter((id) => {
    if (packageKind === 'WINDOWS' && isRepairWorkOrderAddendumTab(id)) {
      return false;
    }
    if (isRepairWorkOrderAddendumTab(id)) {
      return isRepairAddendumTabVisible(id as RepairDocumentTabId, addendumSlotCount);
    }
    return true;
  });
}

export function repairWorkOrderHubTabLabel(
  id: RepairWorkOrderHubTabId,
  short = true,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): string {
  if (packageKind === 'WINDOWS') {
    const override = short
      ? WINDOWS_WORK_ORDER_HUB_TAB_LABELS_SHORT[id]
      : WINDOWS_WORK_ORDER_HUB_TAB_LABELS[id];
    if (override) return override;
  }
  return short ? REPAIR_DOCUMENT_TAB_LABELS_SHORT[id] : REPAIR_DOCUMENT_TAB_LABELS[id];
}

export function defaultRepairWorkOrderHubTab(
  preferred: RepairDocumentTabId | null,
  addendumSlotCount: number,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): RepairWorkOrderHubTabId {
  const visible = repairWorkOrderHubTabsForPackage(addendumSlotCount, packageKind);
  if (preferred && isRepairWorkOrderHubTab(preferred) && visible.includes(preferred)) {
    return preferred;
  }
  return visible[0] ?? 'workOrder';
}
