import type { RepairDocumentTemplateTabId } from '../formDataTemplateStorage';
import { repairTemplateActAcceptance } from './actAcceptance';
import { repairTemplateActStart } from './actStart';
import { repairTemplateAddendum } from './addendum';
import { repairTemplateCashOrder } from './cashOrder';
import { repairTemplateContract } from './contract';
import { repairTemplateEstimate } from './estimate';
import { repairTemplateProductionLog } from './productionLog';
import { repairTemplateWorkOrder } from './workOrder';
import { repairTemplateWorkOrderAddendum } from './workOrderAddendum';

export const REPAIR_DOCUMENT_TEMPLATES: Record<RepairDocumentTemplateTabId, string> = {
  contract: repairTemplateContract,
  estimate: repairTemplateEstimate,
  finalEstimate: `<div class="docPrint"><p>Итоговая смета формируется на соответствующей вкладке пакета.</p></div>`,
  interactiveFinalEstimate: `<div class="docPrint"><p>Интерактивная итоговая смета — на вкладке пакета.</p></div>`,
  finalWorkOrder: `<div class="docPrint"><p>Итоговый заказ-наряд формируется на вкладке пакета.</p></div>`,
  actStart: repairTemplateActStart,
  actAcceptance: repairTemplateActAcceptance,
  cashOrder: repairTemplateCashOrder,
  /** Анкета 1 в пакете — онлайн-форма в редакторе; заглушка для совместимости выбора в библиотеке. */
  questionnaire1: `<div class="docPrint"><p>Содержимое анкеты формируется на вкладке пакета «Анкета менеджера» из полей формы.</p></div>`,
  questionnaire2: `<div class="docPrint"><p>Содержимое анкеты формируется на вкладке пакета «Анкета после работ» из полей формы.</p></div>`,
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
  productionLog: repairTemplateProductionLog,
};
