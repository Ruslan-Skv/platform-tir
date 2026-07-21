import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTemplateTabId } from '../platform/form/formDataTemplateStorage';
import type { PackageLibraryTemplateTabId } from '../platform/tabs/packageLibraryTemplateTabs';
import { packageTemplateActAcceptance } from './actAcceptance';
import { packageTemplateActStart } from './actStart';
import { packageTemplateAddendum } from './addendum';
import { blindsTemplateMemo } from './blindsTemplateMemo';
import { packageTemplateCashOrder } from './cashOrder';
import { packageTemplateConsent } from './consent';
import { packageTemplateContract } from './contract';
import { doorsTemplateActAcceptance } from './doorsActAcceptance';
import { doorsTemplateContract } from './doorsTemplateContract';
import { doorsTemplateDeliveryNote } from './doorsTemplateDeliveryNote';
import { doorsTemplateMemo } from './doorsTemplateMemo';
import { packageLibraryFallbackStub } from './libraryFallbackStub';
import { windowsTemplateMemo } from './memo';
import { packageTemplatePaymentInvoice } from './paymentInvoice';
import { packageTemplateProductionLog } from './productionLog';
import { windowsTemplateActAcceptance } from './windowsActAcceptance';
import {
  packageTemplateWindowsWorkOrderAddendum,
  packageTemplateWorkOrder,
  packageTemplateWorkOrderAddendum,
} from './workOrder';

const stub = (title: string) => packageLibraryFallbackStub(title);

/** Резервный HTML, если в библиотеке нет пресета (вкладки библиотеки + заглушки для прочих вкладок пакета). */
export const PACKAGE_LIBRARY_TEMPLATE_HTML: Record<PackageLibraryTemplateTabId, string> = {
  contract: packageTemplateContract,
  consent: packageTemplateConsent,
  actStart: packageTemplateActStart,
  actAcceptance: packageTemplateActAcceptance,
  deliveryNote: stub('Накладная'),
  memo: windowsTemplateMemo,
  cashOrder: packageTemplateCashOrder,
  paymentInvoice: packageTemplatePaymentInvoice,
  productionLog: packageTemplateProductionLog,
};

const WINDOWS_LIBRARY_TEMPLATE_OVERRIDES: Partial<Record<PackageLibraryTemplateTabId, string>> = {
  actAcceptance: windowsTemplateActAcceptance,
  memo: windowsTemplateMemo,
};

const DOORS_LIBRARY_TEMPLATE_OVERRIDES: Partial<Record<PackageLibraryTemplateTabId, string>> = {
  contract: doorsTemplateContract,
  actAcceptance: doorsTemplateActAcceptance,
  deliveryNote: doorsTemplateDeliveryNote,
  memo: doorsTemplateMemo,
};

/** Жалюзи: те же дефолты, что у «Двери» (договор, акт, накладная; согласие — общий consent). */
const BLINDS_LIBRARY_TEMPLATE_OVERRIDES: Partial<Record<PackageLibraryTemplateTabId, string>> = {
  contract: doorsTemplateContract,
  actAcceptance: doorsTemplateActAcceptance,
  deliveryNote: doorsTemplateDeliveryNote,
  memo: blindsTemplateMemo,
};

/** Резервный HTML вкладки библиотеки с учётом направления пакета. */
export function libraryTemplateFallbackHtml(
  kind: ContractDocumentPackageKind,
  tab: PackageLibraryTemplateTabId
): string {
  if (kind === 'BLINDS') {
    const blindsHtml = BLINDS_LIBRARY_TEMPLATE_OVERRIDES[tab];
    if (blindsHtml) return blindsHtml;
  }
  if (kind === 'DOORS') {
    const doorsHtml = DOORS_LIBRARY_TEMPLATE_OVERRIDES[tab];
    if (doorsHtml) return doorsHtml;
  }
  if (kind === 'WINDOWS') {
    const windowsHtml = WINDOWS_LIBRARY_TEMPLATE_OVERRIDES[tab];
    if (windowsHtml) return windowsHtml;
  }
  return PACKAGE_LIBRARY_TEMPLATE_HTML[tab];
}

const WINDOWS_DOCUMENT_TEMPLATE_OVERRIDES: Partial<Record<PackageDocumentTemplateTabId, string>> = {
  workOrderAddendum1: packageTemplateWindowsWorkOrderAddendum,
  workOrderAddendum2: packageTemplateWindowsWorkOrderAddendum,
  workOrderAddendum3: packageTemplateWindowsWorkOrderAddendum,
  workOrderAddendum4: packageTemplateWindowsWorkOrderAddendum,
  workOrderAddendum5: packageTemplateWindowsWorkOrderAddendum,
};

const PRODUCT_LINE_SPEC_DOCUMENT_TEMPLATE_OVERRIDES: Partial<
  Record<PackageDocumentTemplateTabId, string>
> = WINDOWS_DOCUMENT_TEMPLATE_OVERRIDES;

export const PACKAGE_DOCUMENT_TEMPLATES: Record<PackageDocumentTemplateTabId, string> = {
  ...PACKAGE_LIBRARY_TEMPLATE_HTML,
  estimate: stub('Смета'),
  finalEstimate: stub('Итоговая смета'),
  specification: stub('Спецификация'),
  interactiveFinalEstimate: stub('Интерактивная итоговая смета'),
  finalWorkOrder: stub('Итоговый заказ-наряд'),
  questionnaire1: stub('Анкета 1'),
  questionnaire2: stub('Анкета 2'),
  addendum1: packageTemplateAddendum,
  addendum2: packageTemplateAddendum,
  addendum3: packageTemplateAddendum,
  addendum4: packageTemplateAddendum,
  addendum5: packageTemplateAddendum,
  workOrder: packageTemplateWorkOrder,
  workOrderAddendum1: packageTemplateWorkOrderAddendum,
  workOrderAddendum2: packageTemplateWorkOrderAddendum,
  workOrderAddendum3: packageTemplateWorkOrderAddendum,
  workOrderAddendum4: packageTemplateWorkOrderAddendum,
  workOrderAddendum5: packageTemplateWorkOrderAddendum,
};

/** Резервный HTML вкладки редактора с учётом направления пакета. */
export function packageDocumentTemplateFallbackHtml(
  kind: ContractDocumentPackageKind,
  tab: PackageDocumentTemplateTabId
): string {
  if (kind === 'BLINDS') {
    const blindsDocHtml = PRODUCT_LINE_SPEC_DOCUMENT_TEMPLATE_OVERRIDES[tab];
    if (blindsDocHtml) return blindsDocHtml;
    const blindsLibraryTab = tab as PackageLibraryTemplateTabId;
    const blindsHtml = BLINDS_LIBRARY_TEMPLATE_OVERRIDES[blindsLibraryTab];
    if (blindsHtml) return blindsHtml;
  }
  if (kind === 'DOORS') {
    const doorsDocHtml = PRODUCT_LINE_SPEC_DOCUMENT_TEMPLATE_OVERRIDES[tab];
    if (doorsDocHtml) return doorsDocHtml;
    const doorsLibraryTab = tab as PackageLibraryTemplateTabId;
    const doorsHtml = DOORS_LIBRARY_TEMPLATE_OVERRIDES[doorsLibraryTab];
    if (doorsHtml) return doorsHtml;
  }
  if (kind === 'WINDOWS') {
    const windowsHtml = WINDOWS_DOCUMENT_TEMPLATE_OVERRIDES[tab];
    if (windowsHtml) return windowsHtml;
  }
  return PACKAGE_DOCUMENT_TEMPLATES[tab];
}
