import type { PaymentInvoiceLineItem } from './repairPaymentInvoiceLineItems';

export type RepairInvoiceConductDraft = {
  invoiceDate: string;
  invoiceNumber: string;
  paymentBasis: string;
  amount: string;
  lineItems: PaymentInvoiceLineItem[];
};
