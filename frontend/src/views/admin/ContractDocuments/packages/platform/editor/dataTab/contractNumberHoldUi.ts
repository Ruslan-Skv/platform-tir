import type { ContractNumberHold } from '@/shared/api/admin-contract-document-packages';

/** Дата окончания брони для подписи в кнопке: 27.10.2026. */
export function formatHoldDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Сводка активных резервов пакета: номера + самый поздний срок. */
export function summarizeHolds(
  holds: ContractNumberHold[] | undefined | null
): { numbers: string[]; expiresAt: string } | null {
  if (!Array.isArray(holds) || holds.length === 0) return null;
  const latest = holds.reduce(
    (acc, h) => (h.expiresAt > acc ? h.expiresAt : acc),
    holds[0].expiresAt
  );
  return { numbers: holds.map((h) => h.number), expiresAt: latest };
}
