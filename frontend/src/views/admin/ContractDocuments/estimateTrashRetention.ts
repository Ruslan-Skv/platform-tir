/** Срок хранения расчёта в корзине до безвозвратного удаления (синхронно с backend). */
export const ESTIMATE_TRASH_RETENTION_DAYS = 30;

const ESTIMATE_TRASH_RETENTION_MS = ESTIMATE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function estimateTrashPermanentDeleteAtIso(deletedAt: string): string | null {
  const deletedMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return null;
  return new Date(deletedMs + ESTIMATE_TRASH_RETENTION_MS).toISOString();
}

export const ESTIMATE_TRASH_RETENTION_NOTICE = `Через ${ESTIMATE_TRASH_RETENTION_DAYS} дней после перемещения в корзину расчёт будет удалён безвозвратно.`;
