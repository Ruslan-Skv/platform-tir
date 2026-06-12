import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';

import {
  type PaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  parsePaymentInvoiceLineAmount,
} from '../../payments/packagePaymentInvoiceLineItems';

export function packageIssuedInvoicePaymentTypeLabel(row: ContractDocumentPaymentInvoice): string {
  if (row.paymentType === 'AMENDMENT' && row.addendumNumber != null) {
    return `Д/с №${row.addendumNumber}`;
  }

  if (row.paymentType === 'PREPAYMENT') return 'Предоплата';

  if (row.paymentType === 'FINAL') return 'Окончательный расчёт';

  return 'Аванс';
}

export function recalcLineFromPriceQty(line: PaymentInvoiceLineItem): PaymentInvoiceLineItem {
  const qty = parsePaymentInvoiceLineAmount(line.quantity) ?? 1;

  const unitPrice = parsePaymentInvoiceLineAmount(line.unitPrice);

  if (unitPrice == null) return line;

  return {
    ...line,

    amount: formatPaymentInvoiceLineAmount(qty * unitPrice),
  };
}
