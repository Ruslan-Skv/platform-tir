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

  onShare?: (row: ContractDocumentPaymentInvoice) => void;

  /** Отправка заказчику ещё не выставленного счёта (черновик из формы). */
  onShareDraft?: (conduct: PackageInvoiceConductDraft) => void;

  /** Переключить ПЭП счёта со стороны Подрядчика: подписать / отменить подпись. */
  onToggleEp?: (row: ContractDocumentPaymentInvoice) => void | Promise<void>;

  signEpBusy?: boolean;

  /** Скачивание строки с учётом подписи (подписанный PDF со штампом ЭП). */
  onDownloadRow?: (row: ContractDocumentPaymentInvoice) => void | Promise<void>;
};

export function PackageIssueInvoicePanel(props: PackageIssueInvoicePanelProps) {
  const model = usePackageIssueInvoicePanel(props);
  return <PackageIssueInvoicePanelView {...model} />;
}
