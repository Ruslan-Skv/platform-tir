/** Подписи способов оплаты аванса мастеру (форма выдачи, правка, журналы). */
export const INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  BANK: 'Банк',
};

/** Подпись для журналов: null — записи, созданные до появления способа оплаты. */
export function formatInstallerAdvancePaymentMethod(method: string | null | undefined): string {
  if (!method) return '—';
  return INSTALLER_ADVANCE_PAYMENT_METHOD_LABELS[method] ?? method;
}
