import type { RepairDocumentTabId } from '../repairDocumentTabs';
import { repairTemplateActAcceptance } from './actAcceptance';
import { repairTemplateActStart } from './actStart';
import { repairTemplateAddendum } from './addendum';
import { repairTemplateCashOrder } from './cashOrder';
import { repairTemplateContract } from './contract';
import { repairTemplateEstimate } from './estimate';
import { repairTemplateProductionLog } from './productionLog';
import { repairTemplateQuestionnaire } from './questionnaire';
import { repairTemplateWorkOrder } from './workOrder';
import { repairTemplateWorkOrderAddendum } from './workOrderAddendum';

export const REPAIR_DOCUMENT_TEMPLATES: Record<Exclude<RepairDocumentTabId, 'data'>, string> = {
  contract: repairTemplateContract,
  estimate: repairTemplateEstimate,
  actStart: repairTemplateActStart,
  actAcceptance: repairTemplateActAcceptance,
  cashOrder: repairTemplateCashOrder,
  questionnaire1: repairTemplateQuestionnaire('1'),
  questionnaire2: repairTemplateQuestionnaire('2'),
  addendum: repairTemplateAddendum,
  workOrder: repairTemplateWorkOrder,
  workOrderAddendum: repairTemplateWorkOrderAddendum,
  productionLog: repairTemplateProductionLog,
};
