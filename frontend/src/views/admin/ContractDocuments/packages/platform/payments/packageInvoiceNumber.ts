/** Форматирование суммы счёта для печати и полей ввода. */
export function formatPackageIssuedInvoiceAmountRub(amountRub: number): string {
  const rounded = Math.round(amountRub * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace('.', ',');
}
