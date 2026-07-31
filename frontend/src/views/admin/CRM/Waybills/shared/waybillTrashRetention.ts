/** Срок хранения задания в корзине до безвозвратного удаления (синхронно с backend). */
export const WAYBILL_TRASH_RETENTION_DAYS = 30;

const WAYBILL_TRASH_RETENTION_MS = WAYBILL_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function waybillTrashPermanentDeleteAtIso(deletedAt: string): string | null {
  const deletedMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return null;
  return new Date(deletedMs + WAYBILL_TRASH_RETENTION_MS).toISOString();
}

export const WAYBILL_TRASH_RETENTION_NOTICE = `Через ${WAYBILL_TRASH_RETENTION_DAYS} дней после перемещения в корзину задание будет удалено безвозвратно.`;
