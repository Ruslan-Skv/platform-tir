export const PACKAGE_DOCUMENT_TAB_IDS = [
  'data',
  'payments',
  'contract',
  'consent',
  'estimate',
  'specification',
  'finalEstimate',
  'interactiveFinalEstimate',
  'finalWorkOrder',
  'actStart',
  'actAcceptance',
  'deliveryNote',
  'memo',
  'questionnaire1',
  'questionnaire2',
  'addendum1',
  'addendum2',
  'addendum3',
  'addendum4',
  'addendum5',
  'workOrder',
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
  'productionLog',
] as const;

export type PackageDocumentTabId = (typeof PACKAGE_DOCUMENT_TAB_IDS)[number];

export const PACKAGE_ADDENDUM_TAB_IDS = [
  'addendum1',
  'addendum2',
  'addendum3',
  'addendum4',
  'addendum5',
] as const;

export const PACKAGE_WORK_ORDER_ADDENDUM_TAB_IDS = [
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
] as const;

/** Вкладка «Д/с №…» показывается, если номер ≤ числу открытых слотов (1–5). */
export function isPackageAddendumTabVisible(
  id: PackageDocumentTabId,
  addendumSlotCount: number
): boolean {
  const m = /^addendum(\d+)$/.exec(id);
  const mWorkOrder = /^workOrderAddendum(\d+)$/.exec(id);
  const n = Number(m?.[1] ?? mWorkOrder?.[1] ?? NaN);
  if (!Number.isFinite(n)) return true;
  if (!Number.isFinite(n) || n < 1 || n > 5) return false;
  return n <= addendumSlotCount;
}

/** Вкладка предпросмотра — одно из доп. соглашений (для оформления как A4 и т.п.). */
export function isPackageAddendumTab(tab: string): boolean {
  return /^addendum[1-5]$/.test(tab);
}

export function isPackageWorkOrderAddendumTab(tab: string): boolean {
  return /^workOrderAddendum[1-5]$/.test(tab);
}

/** Старые сохранённые порядки вкладок и tabId шаблонов. */
export function normalizeLegacyPackageTabId(id: string): string {
  if (id === 'addendum') return 'addendum1';
  if (id === 'workOrderAddendum') return 'workOrderAddendum1';
  return id;
}

export const PACKAGE_DOCUMENT_TAB_LABELS: Record<PackageDocumentTabId, string> = {
  data: 'Данные',
  payments: 'Оплаты',
  contract: 'Договор',
  consent: 'Согласие',
  estimate: 'Смета',
  specification: 'Спецификация',
  finalEstimate: 'Итог. смета',
  interactiveFinalEstimate: 'Интерактивная итог. смета',
  finalWorkOrder: 'Итог. заказ-наряд',
  actStart: 'Акт начала работ',
  actAcceptance: 'Акт сдачи-приёмки',
  deliveryNote: 'Накладная',
  memo: 'Памятка',
  questionnaire1: 'Анкета опросник',
  questionnaire2: 'Анкета (оценка работы)',
  addendum1: 'Дополнительное соглашение №1',
  addendum2: 'Дополнительное соглашение №2',
  addendum3: 'Дополнительное соглашение №3',
  addendum4: 'Дополнительное соглашение №4',
  addendum5: 'Дополнительное соглашение №5',
  workOrder: 'Заказ-наряд',
  workOrderAddendum1: 'Заказ-наряд к Д/с №1',
  workOrderAddendum2: 'Заказ-наряд к Д/с №2',
  workOrderAddendum3: 'Заказ-наряд к Д/с №3',
  workOrderAddendum4: 'Заказ-наряд к Д/с №4',
  workOrderAddendum5: 'Заказ-наряд к Д/с №5',
  productionLog: 'Производственный журнал',
};

/** Короткие подписи для строки вкладок редактора пакета «Ремонт». */
export const PACKAGE_DOCUMENT_TAB_LABELS_SHORT: Record<PackageDocumentTabId, string> = {
  data: 'Данные',
  payments: 'Оплаты',
  contract: 'Договор',
  consent: 'Согласие',
  estimate: 'Смета',
  specification: 'Спецификация',
  finalEstimate: 'Итог. смета',
  interactiveFinalEstimate: 'Инт. итог. смета',
  finalWorkOrder: 'Итог. з-наряд',
  actStart: 'Акт нач.',
  actAcceptance: 'Акт приём.',
  deliveryNote: 'Накладная',
  memo: 'Памятка',
  questionnaire1: 'Анкета (опросник)',
  questionnaire2: 'Анкета (оценки)',
  addendum1: 'Д/с №1',
  addendum2: 'Д/с №2',
  addendum3: 'Д/с №3',
  addendum4: 'Д/с №4',
  addendum5: 'Д/с №5',
  workOrder: 'З-наряд',
  workOrderAddendum1: 'З-н Д/с №1',
  workOrderAddendum2: 'З-н Д/с №2',
  workOrderAddendum3: 'З-н Д/с №3',
  workOrderAddendum4: 'З-н Д/с №4',
  workOrderAddendum5: 'З-н Д/с №5',
  productionLog: 'Пр. журнал',
};

export const PACKAGE_DOCUMENT_TAB_ORDER_STORAGE_KEY = 'admin.contractDocuments.repair.tabOrder';

export function normalizePackageDocumentTabOrder(raw: unknown): PackageDocumentTabId[] {
  const defaultOrder = [...PACKAGE_DOCUMENT_TAB_IDS];
  if (!Array.isArray(raw)) return defaultOrder;
  const seen = new Set<string>();
  const out: PackageDocumentTabId[] = [];
  for (const id of raw) {
    if (typeof id !== 'string') continue;
    const norm = normalizeLegacyPackageTabId(id);
    if (!(PACKAGE_DOCUMENT_TAB_IDS as readonly string[]).includes(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm as PackageDocumentTabId);
  }
  for (const id of PACKAGE_DOCUMENT_TAB_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  const withoutLegacyCashOrder = out.filter((id) => (id as string) !== 'cashOrder');
  const interactiveId: PackageDocumentTabId = 'interactiveFinalEstimate';
  const finalEstimateId: PackageDocumentTabId = 'finalEstimate';
  const filtered: PackageDocumentTabId[] = withoutLegacyCashOrder.filter(
    (id) => id !== interactiveId
  );
  const finalEstimateIdx = filtered.indexOf(finalEstimateId);
  if (finalEstimateIdx < 0) return [...filtered, interactiveId];
  filtered.splice(finalEstimateIdx, 0, interactiveId);
  return filtered;
}
