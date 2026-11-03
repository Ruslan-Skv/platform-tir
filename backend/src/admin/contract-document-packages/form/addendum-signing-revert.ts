/**
 * Отмена подписания доп. соглашения (супер-админ): слот возвращается в OPEN,
 * сбрасывается только метка подписания (signedAt). Отметка оплаты (paidAt)
 * не трогается — отмена оплаты отдельное действие и уже реализована в проекте
 * (журнал оплат / кнопка «Отменить статус „Д/с оплачено“»), её выполняют сами
 * при необходимости. Возвращает null, если слота нет либо он уже в OPEN —
 * отменять нечего.
 */
export function revertAddendumSigningForm(
  storedFormData: unknown,
  ordinal: number,
): Record<string, unknown> | null {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 5) return null;
  const stored =
    storedFormData && typeof storedFormData === 'object' && !Array.isArray(storedFormData)
      ? (storedFormData as Record<string, unknown>)
      : null;
  if (!stored || !Array.isArray(stored.addendumSlots)) return null;
  const slot = stored.addendumSlots[ordinal - 1];
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return null;
  const s = slot as Record<string, unknown>;
  if (s.status !== 'SIGNED' && s.status !== 'PAID') return null;
  const slots = [...stored.addendumSlots];
  slots[ordinal - 1] = { ...s, status: 'OPEN', signedAt: '' };
  return { ...stored, addendumSlots: slots };
}
