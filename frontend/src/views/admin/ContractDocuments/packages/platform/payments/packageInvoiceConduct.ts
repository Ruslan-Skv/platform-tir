import type { PaymentInvoiceLineItem } from './packagePaymentInvoiceLineItems';

export type PackageInvoiceConductDraft = {
  invoiceDate: string;
  invoiceNumber: string;
  paymentBasis: string;
  amount: string;
  lineItems: PaymentInvoiceLineItem[];
};
