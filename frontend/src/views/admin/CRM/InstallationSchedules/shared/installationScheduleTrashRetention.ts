/** Срок хранения записи в корзине до безвозвратного удаления (синхронно с backend). */
export const INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS = 30;

const RETENTION_MS = INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function installationScheduleTrashPermanentDeleteAtIso(deletedAt: string): string | null {
  const deletedMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return null;
  return new Date(deletedMs + RETENTION_MS).toISOString();
}

export const INSTALLATION_SCHEDULE_TRASH_RETENTION_NOTICE = `Через ${INSTALLATION_SCHEDULE_TRASH_RETENTION_DAYS} дней после перемещения в корзину запись будет удалена безвозвратно.`;
