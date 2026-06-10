import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { RepairLibraryTemplateTabId } from '../directions/repair/documents/repairLibraryTemplateTabs';
import type { RepairDocumentTemplateTabId } from '../directions/repair/formDataTemplateStorage';
import { repairTemplateActAcceptance } from './actAcceptance';
import { repairTemplateActStart } from './actStart';
import { repairTemplateAddendum } from './addendum';
import { repairTemplateCashOrder } from './cashOrder';
import { repairTemplateContract } from './contract';
import { doorsTemplateActAcceptance } from './doorsActAcceptance';
import { doorsTemplateContract } from './doorsTemplateContract';
import { doorsTemplateMemo } from './doorsTemplateMemo';
import { repairLibraryFallbackStub } from './libraryFallbackStub';
import { windowsTemplateMemo } from './memo';
import { repairTemplatePaymentInvoice } from './paymentInvoice';
import { repairTemplateProductionLog } from './productionLog';
import { windowsTemplateActAcceptance } from './windowsActAcceptance';
import {
  repairTemplateWindowsWorkOrderAddendum,
  repairTemplateWorkOrder,
  repairTemplateWorkOrderAddendum,
} from './workOrder';

const stub = (title: string) => repairLibraryFallbackStub(title);

/** Резервный HTML, если в библиотеке нет пресета (вкладки библиотеки + заглушки для прочих вкладок пакета). */
export const REPAIR_LIBRARY_TEMPLATE_HTML: Record<RepairLibraryTemplateTabId, string> = {
  contract: repairTemplateContract,
  actStart: repairTemplateActStart,
  actAcceptance: repairTemplateActAcceptance,
  memo: windowsTemplateMemo,
  cashOrder: repairTemplateCashOrder,
  paymentInvoice: repairTemplatePaymentInvoice,
  productionLog: repairTemplateProductionLog,
};

const WINDOWS_LIBRARY_TEMPLATE_OVERRIDES: Partial<Record<RepairLibraryTemplateTabId, string>> = {
  actAcceptance: windowsTemplateActAcceptance,
  memo: windowsTemplateMemo,
};

const DOORS_LIBRARY_TEMPLATE_OVERRIDES: Partial<Record<RepairLibraryTemplateTabId, string>> = {
  contract: doorsTemplateContract,
  actAcceptance: doorsTemplateActAcceptance,
  memo: doorsTemplateMemo,
};

/** Резервный HTML вкладки библиотеки с учётом направления пакета. */
export function libraryTemplateFallbackHtml(
  kind: ContractDocumentPackageKind,
  tab: RepairLibraryTemplateTabId
): string {
  if (kind === 'DOORS') {
    const doorsHtml = DOORS_LIBRARY_TEMPLATE_OVERRIDES[tab];
    if (doorsHtml) return doorsHtml;
  }
  if (kind === 'WINDOWS') {
    const windowsHtml = WINDOWS_LIBRARY_TEMPLATE_OVERRIDES[tab];
    if (windowsHtml) return windowsHtml;
  }
  return REPAIR_LIBRARY_TEMPLATE_HTML[tab];
}

const WINDOWS_DOCUMENT_TEMPLATE_OVERRIDES: Partial<Record<RepairDocumentTemplateTabId, string>> = {
  workOrderAddendum1: repairTemplateWindowsWorkOrderAddendum,
  workOrderAddendum2: repairTemplateWindowsWorkOrderAddendum,
  workOrderAddendum3: repairTemplateWindowsWorkOrderAddendum,
  workOrderAddendum4: repairTemplateWindowsWorkOrderAddendum,
  workOrderAddendum5: repairTemplateWindowsWorkOrderAddendum,
};

const DOORS_DOCUMENT_TEMPLATE_OVERRIDES: Partial<Record<RepairDocumentTemplateTabId, string>> =
  WINDOWS_DOCUMENT_TEMPLATE_OVERRIDES;

/** Резервный HTML вкладки редактора с учётом направления пакета. */
export function repairDocumentTemplateFallbackHtml(
  kind: ContractDocumentPackageKind,
  tab: RepairDocumentTemplateTabId
): string {
  if (kind === 'DOORS') {
    const doorsDocHtml = DOORS_DOCUMENT_TEMPLATE_OVERRIDES[tab];
    if (doorsDocHtml) return doorsDocHtml;
    const doorsLibraryTab = tab as RepairLibraryTemplateTabId;
    const doorsHtml = DOORS_LIBRARY_TEMPLATE_OVERRIDES[doorsLibraryTab];
    if (doorsHtml) return doorsHtml;
  }
  if (kind === 'WINDOWS') {
    const windowsHtml = WINDOWS_DOCUMENT_TEMPLATE_OVERRIDES[tab];
    if (windowsHtml) return windowsHtml;
  }
  return REPAIR_DOCUMENT_TEMPLATES[tab];
}

export const REPAIR_DOCUMENT_TEMPLATES: Record<RepairDocumentTemplateTabId, string> = {
  ...REPAIR_LIBRARY_TEMPLATE_HTML,
  estimate: stub('Смета'),
  finalEstimate: stub('Итоговая смета'),
  specification: stub('Спецификация'),
  interactiveFinalEstimate: stub('Интерактивная итоговая смета'),
  finalWorkOrder: stub('Итоговый заказ-наряд'),
  questionnaire1: stub('Анкета 1'),
  questionnaire2: stub('Анкета 2'),
  addendum1: repairTemplateAddendum,
  addendum2: repairTemplateAddendum,
  addendum3: repairTemplateAddendum,
  addendum4: repairTemplateAddendum,
  addendum5: repairTemplateAddendum,
  workOrder: repairTemplateWorkOrder,
  workOrderAddendum1: repairTemplateWorkOrderAddendum,
  workOrderAddendum2: repairTemplateWorkOrderAddendum,
  workOrderAddendum3: repairTemplateWorkOrderAddendum,
  workOrderAddendum4: repairTemplateWorkOrderAddendum,
  workOrderAddendum5: repairTemplateWorkOrderAddendum,
};
