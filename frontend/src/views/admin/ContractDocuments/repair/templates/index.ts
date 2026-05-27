import type { RepairDocumentTemplateTabId } from '../formDataTemplateStorage';
import type { RepairLibraryTemplateTabId } from '../repairLibraryTemplateTabs';
import { repairTemplateActAcceptance } from './actAcceptance';
import { repairTemplateActStart } from './actStart';
import { repairTemplateAddendum } from './addendum';
import { repairTemplateCashOrder } from './cashOrder';
import { repairTemplateContract } from './contract';
import { repairLibraryFallbackStub } from './libraryFallbackStub';
import { repairTemplatePaymentInvoice } from './paymentInvoice';
import { repairTemplateProductionLog } from './productionLog';
import { repairTemplateWorkOrder, repairTemplateWorkOrderAddendum } from './workOrder';

const stub = (title: string) => repairLibraryFallbackStub(title);

/** Резервный HTML, если в библиотеке нет пресета (вкладки библиотеки + заглушки для прочих вкладок пакета). */
export const REPAIR_LIBRARY_TEMPLATE_HTML: Record<RepairLibraryTemplateTabId, string> = {
  contract: repairTemplateContract,
  actStart: repairTemplateActStart,
  actAcceptance: repairTemplateActAcceptance,
  cashOrder: repairTemplateCashOrder,
  paymentInvoice: repairTemplatePaymentInvoice,
  productionLog: repairTemplateProductionLog,
};

export const REPAIR_DOCUMENT_TEMPLATES: Record<RepairDocumentTemplateTabId, string> = {
  ...REPAIR_LIBRARY_TEMPLATE_HTML,
  estimate: stub('Смета'),
  finalEstimate: stub('Итоговая смета'),
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
