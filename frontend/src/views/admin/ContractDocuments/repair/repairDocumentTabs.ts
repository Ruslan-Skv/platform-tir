export const REPAIR_DOCUMENT_TAB_IDS = [
  'data',
  'contract',
  'estimate',
  'actStart',
  'actAcceptance',
  'cashOrder',
  'questionnaire1',
  'questionnaire2',
  'addendum',
  'workOrder',
  'workOrderAddendum',
  'productionLog',
] as const;

export type RepairDocumentTabId = (typeof REPAIR_DOCUMENT_TAB_IDS)[number];

export const REPAIR_DOCUMENT_TAB_LABELS: Record<RepairDocumentTabId, string> = {
  data: 'Данные',
  contract: 'Договор',
  estimate: 'Смета',
  actStart: 'Акт начала работ',
  actAcceptance: 'Акт сдачи-приёмки',
  cashOrder: 'Приходно-кассовый ордер',
  questionnaire1: 'Анкета 1',
  questionnaire2: 'Анкета 2',
  addendum: 'Дополнительное соглашение',
  workOrder: 'Заказ-наряд',
  workOrderAddendum: 'Заказ-наряд к доп. соглашению',
  productionLog: 'Производственный журнал',
};
