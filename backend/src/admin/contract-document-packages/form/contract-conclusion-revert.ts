/**
 * Отмена подписания договора (супер-админ): сбрасывает дату заключения и
 * дату оплаты договора, а подписанные/оплаченные д/с возвращает в состояние
 * OPEN — подписанное или оплаченное д/с не может существовать при
 * неподписанном договоре. Зеркалит фронтенд-хелпер revertContractConclusionForm
 * (packages/platform/hub/hubModal/contractConclusionRevert.ts).
 */
export function revertContractConclusionForm(storedFormData: unknown): Record<string, unknown> {
  const stored =
    storedFormData && typeof storedFormData === 'object' && !Array.isArray(storedFormData)
      ? (storedFormData as Record<string, unknown>)
      : {};
  const result: Record<string, unknown> = {
    ...stored,
    contractConcludedAt: '',
    contractPaidAt: '',
  };
  if (Array.isArray(stored.addendumSlots)) {
    result.addendumSlots = stored.addendumSlots.map((slot) => {
      if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return slot;
      const s = slot as Record<string, unknown>;
      if (s.status === 'OPEN') return slot;
      return { ...s, status: 'OPEN', signedAt: '', paidAt: '' };
    });
  }
  return result;
}
