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

/** Короткие подписи для строки вкладок редактора пакета «Ремонт». */
export const REPAIR_DOCUMENT_TAB_LABELS_SHORT: Record<RepairDocumentTabId, string> = {
  data: 'Данные',
  contract: 'Договор',
  estimate: 'Смета',
  actStart: 'Акт нач.',
  actAcceptance: 'Акт приём.',
  cashOrder: 'ПКО',
  questionnaire1: 'Анк. 1',
  questionnaire2: 'Анк. 2',
  addendum: 'Доп. согл.',
  workOrder: 'З-наряд',
  workOrderAddendum: 'З-н доп.',
  productionLog: 'Пр. журнал',
};

export const REPAIR_DOCUMENT_TAB_ORDER_STORAGE_KEY = 'admin.contractDocuments.repair.tabOrder';

export function normalizeRepairDocumentTabOrder(raw: unknown): RepairDocumentTabId[] {
  const defaultOrder = [...REPAIR_DOCUMENT_TAB_IDS];
  if (!Array.isArray(raw)) return defaultOrder;
  const seen = new Set<string>();
  const out: RepairDocumentTabId[] = [];
  for (const id of raw) {
    if (typeof id !== 'string') continue;
    if (!(REPAIR_DOCUMENT_TAB_IDS as readonly string[]).includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id as RepairDocumentTabId);
  }
  for (const id of REPAIR_DOCUMENT_TAB_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}
