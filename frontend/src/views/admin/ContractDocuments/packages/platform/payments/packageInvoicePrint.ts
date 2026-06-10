import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';

import { amountToRussianWords } from '../../../core/amountToRussianWords';
import { applyTemplate } from '../../../core/applyTemplate';
import { downloadDocumentPdf, printDocumentHtml } from '../../../core/printDocument';
import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';
import type { PackageFormData } from '../form/packageForm';
import { packageFormForTemplate } from '../form/packageForm';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '../tabs/packageActPrintTabs';
import type { PackageInvoiceConductDraft } from './packageInvoiceConduct';
import { formatPackageIssuedInvoiceAmountRub } from './packageInvoiceNumber';
import { formatPackagePaymentDateForTemplate } from './packagePaymentFormLabels';
import {
  type PaymentInvoiceLineItem,
  buildPaymentInvoicePrintFields,
  emptyPaymentInvoiceLineItem,
  normalizePaymentInvoiceLineItems,
  paymentInvoiceLineItemsForApi,
  sumPaymentInvoiceLineItems,
} from './packagePaymentInvoiceLineItems';
import { buildPackagePaymentInvoiceQrHtml } from './packagePaymentInvoiceQr';

export type { PaymentInvoiceLineItem };
export type { PackageInvoiceConductDraft } from './packageInvoiceConduct';

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
  const amt = formatPackageIssuedInvoiceAmountRub(Number(row.amount));
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

export function buildPackageInvoiceFormForPrint(
  baseForm: PackageFormData,
  conduct: PackageInvoiceConductDraft
): PackageFormData & {
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
      prepaymentDate: formatPackagePaymentDateForTemplate(conduct.invoiceDate),
      paymentFormLabel: 'По счёту',
    },
    invoice: buildPaymentInvoicePrintFields(lines),
  };
}

export async function buildPackageInvoicePrintHtml(
  baseForm: PackageFormData,
  templateHtml: string,
  conduct: PackageInvoiceConductDraft
): Promise<string> {
  const formWithInvoice = buildPackageInvoiceFormForPrint(baseForm, conduct);
  const qrCodeHtml = await buildPackagePaymentInvoiceQrHtml(baseForm, conduct);
  const formForTpl = packageFormForTemplate(
    {
      ...formWithInvoice,
      invoice: {
        ...formWithInvoice.invoice,
        qrCodeHtml,
      },
    } as PackageFormData,
    { templateTab: PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB as PackageDocumentTemplateTabId }
  );
  const formWithQr = {
    ...formForTpl,
    invoice: {
      ...formWithInvoice.invoice,
      qrCodeHtml,
    },
  };
  return applyTemplate(templateHtml, formWithQr, { plainCustomerPlaceholders: true });
}

export function buildPackagePaymentInvoiceDownloadFileName(
  conduct: PackageInvoiceConductDraft
): string {
  const num = conduct.invoiceNumber.trim().replace(/[^\dA-Za-zА-Яа-яЁё_-]+/g, '_') || 'bez_nomera';
  const date = conduct.invoiceDate.trim() || 'bez_daty';
  return `Schet_${num}_${date}.pdf`;
}

export async function downloadPackagePaymentInvoice(
  html: string,
  conduct: PackageInvoiceConductDraft
): Promise<void> {
  await downloadDocumentPdf(
    html,
    'Счёт на оплату',
    buildPackagePaymentInvoiceDownloadFileName(conduct)
  );
}

export function printPackagePaymentInvoice(html: string): void {
  printDocumentHtml(html, 'Счёт на оплату');
}

export { paymentInvoiceLineItemsForApi, sumPaymentInvoiceLineItems };
