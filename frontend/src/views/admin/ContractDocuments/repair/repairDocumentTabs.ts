export const REPAIR_DOCUMENT_TAB_IDS = [
  'data',
  'contract',
  'estimate',
  'actStart',
  'actAcceptance',
  'cashOrder',
  'questionnaire1',
  'questionnaire2',
  'addendum1',
  'addendum2',
  'addendum3',
  'addendum4',
  'addendum5',
  'workOrder',
  'workOrderAddendum',
  'productionLog',
] as const;

export type RepairDocumentTabId = (typeof REPAIR_DOCUMENT_TAB_IDS)[number];

export const REPAIR_ADDENDUM_TAB_IDS = [
  'addendum1',
  'addendum2',
  'addendum3',
  'addendum4',
  'addendum5',
] as const;

/** Вкладка «Д/с №…» показывается, если номер ≤ числу открытых слотов (1–5). */
export function isRepairAddendumTabVisible(
  id: RepairDocumentTabId,
  addendumSlotCount: number
): boolean {
  const m = /^addendum(\d+)$/.exec(id);
  if (!m) return true;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 5) return false;
  return n <= addendumSlotCount;
}

/** Вкладка предпросмотра — одно из доп. соглашений (для оформления как A4 и т.п.). */
export function isRepairAddendumTab(tab: string): boolean {
  return /^addendum[1-5]$/.test(tab);
}

/** Старые сохранённые порядки вкладок и tabId шаблонов. */
export function normalizeLegacyRepairTabId(id: string): string {
  return id === 'addendum' ? 'addendum1' : id;
}

export const REPAIR_DOCUMENT_TAB_LABELS: Record<RepairDocumentTabId, string> = {
  data: 'Данные',
  contract: 'Договор',
  estimate: 'Смета',
  actStart: 'Акт начала работ',
  actAcceptance: 'Акт сдачи-приёмки',
  cashOrder: 'Приходно-кассовый ордер',
  questionnaire1: 'Анкета менеджера (звонок)',
  questionnaire2: 'Анкета после работ (оценки)',
  addendum1: 'Дополнительное соглашение №1',
  addendum2: 'Дополнительное соглашение №2',
  addendum3: 'Дополнительное соглашение №3',
  addendum4: 'Дополнительное соглашение №4',
  addendum5: 'Дополнительное соглашение №5',
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
  questionnaire1: 'Анкета',
  questionnaire2: 'Анкета №2',
  addendum1: 'Д/с №1',
  addendum2: 'Д/с №2',
  addendum3: 'Д/с №3',
  addendum4: 'Д/с №4',
  addendum5: 'Д/с №5',
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
    const norm = normalizeLegacyRepairTabId(id);
    if (!(REPAIR_DOCUMENT_TAB_IDS as readonly string[]).includes(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm as RepairDocumentTabId);
  }
  for (const id of REPAIR_DOCUMENT_TAB_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}
