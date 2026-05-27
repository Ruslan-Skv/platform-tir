import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';

import { amountToRussianWords } from './amountToRussianWords';
import { applyTemplate } from './applyTemplate';
import type { RepairDocumentTemplateTabId } from './formDataTemplateStorage';
import { printDocumentHtml } from './printDocument';
import { REPAIR_PAYMENT_INVOICE_TEMPLATE_TAB } from './repairActTwinCopiesOnOnePageHtml';
import { formatRepairIssuedInvoiceAmountRub } from './repairInvoiceNumber';
import type { RepairPackageFormData } from './repairPackageForm';
import { repairPackageFormForTemplate } from './repairPackageForm';
import { formatRepairPaymentDateForTemplate } from './repairPaymentFormLabels';
import {
  type PaymentInvoiceLineItem,
  buildPaymentInvoicePrintFields,
  emptyPaymentInvoiceLineItem,
  normalizePaymentInvoiceLineItems,
  paymentInvoiceLineItemsForApi,
  sumPaymentInvoiceLineItems,
} from './repairPaymentInvoiceLineItems';

export type { PaymentInvoiceLineItem };

export type RepairInvoiceConductDraft = {
  invoiceDate: string;
  invoiceNumber: string;
  paymentBasis: string;
  amount: string;
  lineItems: PaymentInvoiceLineItem[];
};

export function lineItemsFromStoredInvoice(
  raw: Array<{
    lineKind?: 'GOODS' | 'SERVICE';
    name: string;
    quantity?: string;
    unit?: string;
    vatLabel?: string;
    unitPrice: number;
    amount: number;
  }>
): PaymentInvoiceLineItem[] {
  return normalizePaymentInvoiceLineItems(
    raw.map((row) => ({
      lineKind: row.lineKind,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      vatLabel: row.vatLabel,
      unitPrice: String(row.unitPrice).replace('.', ','),
      amount: String(row.amount).replace('.', ','),
    }))
  );
}

/** Позиции для повторной печати (старые счета без lineItems — одна строка на всю сумму). */
export function lineItemsForPaymentInvoiceReprint(
  row: Pick<ContractDocumentPaymentInvoice, 'lineItems' | 'amount'>
): PaymentInvoiceLineItem[] {
  const fromDb = lineItemsFromStoredInvoice(row.lineItems ?? []);
  if (fromDb.length > 0) return fromDb;
  const amt = formatRepairIssuedInvoiceAmountRub(Number(row.amount));
  if (!amt) return [];
  return [
    {
      ...emptyPaymentInvoiceLineItem('SERVICE'),
      name: 'Товары (работы, услуги)',
      unitPrice: amt,
      amount: amt,
    },
  ];
}

export function buildRepairInvoiceFormForPrint(
  baseForm: RepairPackageFormData,
  conduct: RepairInvoiceConductDraft
): RepairPackageFormData & {
  invoice: ReturnType<typeof buildPaymentInvoicePrintFields>;
} {
  const lines = conduct.lineItems;
  const totalRub = sumPaymentInvoiceLineItems(lines);
  const prepaymentAmount =
    totalRub > 0 ? totalRub.toFixed(2).replace('.', ',') : conduct.amount.trim();

  return {
    ...baseForm,
    contract: {
      ...baseForm.contract,
      invoiceNumber: conduct.invoiceNumber.trim(),
      prepaymentAmount,
      prepaymentAmountWords: prepaymentAmount ? amountToRussianWords(prepaymentAmount) : '',
      paymentBasis: conduct.paymentBasis.trim(),
      prepaymentDate: formatRepairPaymentDateForTemplate(conduct.invoiceDate),
      paymentFormLabel: 'По счёту',
    },
    invoice: buildPaymentInvoicePrintFields(lines),
  };
}

export function buildRepairInvoicePrintHtml(
  baseForm: RepairPackageFormData,
  templateHtml: string,
  conduct: RepairInvoiceConductDraft
): string {
  const formForTpl = repairPackageFormForTemplate(
    buildRepairInvoiceFormForPrint(baseForm, conduct),
    { templateTab: REPAIR_PAYMENT_INVOICE_TEMPLATE_TAB as RepairDocumentTemplateTabId }
  );
  return applyTemplate(templateHtml, formForTpl, { plainCustomerPlaceholders: true });
}

export function printRepairPaymentInvoice(html: string): void {
  printDocumentHtml(html, 'Счёт на оплату');
}

export { paymentInvoiceLineItemsForApi, sumPaymentInvoiceLineItems };
