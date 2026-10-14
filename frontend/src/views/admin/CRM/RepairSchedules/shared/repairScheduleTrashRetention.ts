/** Срок хранения договора в корзине до безвозвратного удаления (синхронно с backend). */
export const REPAIR_SCHEDULE_TRASH_RETENTION_DAYS = 30;

const RETENTION_MS = REPAIR_SCHEDULE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function repairScheduleTrashPermanentDeleteAtIso(deletedAt: string): string | null {
  const deletedMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return null;
  return new Date(deletedMs + RETENTION_MS).toISOString();
}

export const REPAIR_SCHEDULE_TRASH_RETENTION_NOTICE = `Через ${REPAIR_SCHEDULE_TRASH_RETENTION_DAYS} дней после перемещения в корзину договор будет удалён безвозвратно.`;
