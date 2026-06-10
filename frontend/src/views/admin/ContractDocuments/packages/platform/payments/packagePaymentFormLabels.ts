/** Подписи способов оплаты (журнал, ПКО, CRM). */
export const PACKAGE_PAYMENT_FORM_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  TERMINAL: 'Терминал',
  QR: 'QR-код',
  INVOICE: 'По счёту',
  LC_TRANSFER: 'Переводы на ЛК',
};

/** ISO `yyyy-mm-dd` → `дд.мм.гггг` для шаблонов ПКО. */
export function formatPackagePaymentDateForTemplate(isoDate: string): string {
  const raw = isoDate.trim();
  if (!raw) return '';
  const d = new Date(`${raw}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleDateString('ru-RU');
}
