/** Срок хранения доски в корзине до безвозвратного удаления (синхронно с backend). */
export const KANBAN_TRASH_RETENTION_DAYS = 30;

export function kanbanTrashPermanentDeleteAtIso(deletedAt: string): string | null {
  const deletedMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return null;
  return new Date(deletedMs + KANBAN_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export const KANBAN_TRASH_RETENTION_NOTICE = `Через ${KANBAN_TRASH_RETENTION_DAYS} дней после перемещения в корзину доска будет удалена безвозвратно вместе с колонками и карточками.`;
