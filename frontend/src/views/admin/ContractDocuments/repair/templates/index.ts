import type { RepairDocumentTemplateTabId } from '../formDataTemplateStorage';
import { repairTemplateActAcceptance } from './actAcceptance';
import { repairTemplateActStart } from './actStart';
import { repairTemplateCashOrder } from './cashOrder';
import { repairTemplateContract } from './contract';
import { repairLibraryFallbackStub } from './libraryFallbackStub';
import { repairTemplateProductionLog } from './productionLog';

const stub = (title: string) => repairLibraryFallbackStub(title);

/** Резервные HTML, если в библиотеке нет пресета. Для «Ремонт» рабочие шаблоны — в библиотеке пресетов. */
export const REPAIR_DOCUMENT_TEMPLATES: Record<RepairDocumentTemplateTabId, string> = {
  contract: repairTemplateContract,
  actStart: repairTemplateActStart,
  actAcceptance: repairTemplateActAcceptance,
  cashOrder: repairTemplateCashOrder,
  productionLog: repairTemplateProductionLog,
  estimate: stub('Смета'),
  finalEstimate: stub('Итоговая смета'),
  interactiveFinalEstimate: stub('Интерактивная итоговая смета'),
  finalWorkOrder: stub('Итоговый заказ-наряд'),
  questionnaire1: stub('Анкета 1'),
  questionnaire2: stub('Анкета 2'),
  addendum1: stub('Дополнительное соглашение №1'),
  addendum2: stub('Дополнительное соглашение №2'),
  addendum3: stub('Дополнительное соглашение №3'),
  addendum4: stub('Дополнительное соглашение №4'),
  addendum5: stub('Дополнительное соглашение №5'),
  workOrder: stub('Заказ-наряд'),
  workOrderAddendum1: stub('Заказ-наряд по Д/с №1'),
  workOrderAddendum2: stub('Заказ-наряд по Д/с №2'),
  workOrderAddendum3: stub('Заказ-наряд по Д/с №3'),
  workOrderAddendum4: stub('Заказ-наряд по Д/с №4'),
  workOrderAddendum5: stub('Заказ-наряд по Д/с №5'),
};
