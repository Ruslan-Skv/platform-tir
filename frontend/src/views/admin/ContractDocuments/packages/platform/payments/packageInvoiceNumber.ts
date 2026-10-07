import { formatMoneyRublesKopecksGrouped } from '../form/moneyWhole';

/** Форматирование суммы счёта для печати и полей ввода: разряды через пробел. */
export function formatPackageIssuedInvoiceAmountRub(amountRub: number): string {
  return formatMoneyRublesKopecksGrouped(amountRub);
}
