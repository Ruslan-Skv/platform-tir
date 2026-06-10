/** Срок хранения шаблона в корзине (синхронно с backend). */
export const TEMPLATE_TRASH_RETENTION_DAYS = 30;

const TEMPLATE_TRASH_RETENTION_MS = TEMPLATE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function templateTrashPermanentDeleteAtIso(deletedAt: string): string | null {
  const deletedMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedMs)) return null;
  return new Date(deletedMs + TEMPLATE_TRASH_RETENTION_MS).toISOString();
}

export const TEMPLATE_TRASH_RETENTION_NOTICE = `Через ${TEMPLATE_TRASH_RETENTION_DAYS} дней после перемещения в корзину шаблон будет удалён безвозвратно.`;
