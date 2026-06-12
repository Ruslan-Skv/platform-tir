'use client';

import type {
  ContractDocumentPackageKind,
  ContractDocumentPackagePayment,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';

import type { PackageFormData } from '../../form/packageForm';
import { type PackageInvoiceConductDraft } from '../../payments/packageInvoicePrint';
import { packagePaymentBasisOptionByKey } from '../../payments/packagePaymentBasisOptions';
import { PackageIssueInvoicePanelView } from './PackageIssueInvoicePanelView';
import { usePackageIssueInvoicePanel } from './usePackageIssueInvoicePanel';

export type PackageIssueInvoicePanelProps = {
  packageId: string;

  packageKind?: ContractDocumentPackageKind;

  form: PackageFormData;

  issuedRows: ContractDocumentPaymentInvoice[];

  paymentRows?: ContractDocumentPackagePayment[];

  onError: (message: string) => void;

  onIssue: (
    conduct: PackageInvoiceConductDraft,
    option: NonNullable<ReturnType<typeof packagePaymentBasisOptionByKey>>
  ) => Promise<void>;

  onPrint: (conduct: PackageInvoiceConductDraft) => void;

  onDownload?: (conduct: PackageInvoiceConductDraft) => void | Promise<void>;

  saving?: boolean;

  showIssuedTable?: boolean;

  onReprint?: (row: ContractDocumentPaymentInvoice) => void;
};

export function PackageIssueInvoicePanel(props: PackageIssueInvoicePanelProps) {
  const model = usePackageIssueInvoicePanel(props);
  return <PackageIssueInvoicePanelView {...model} />;
}
