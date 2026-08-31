import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentPackage,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';
import { buildDocumentPdfBlob } from '@/views/admin/ContractDocuments/core/printDocument';
import { isProductDirectionPackageKind } from '@/views/admin/ContractDocuments/packages/config/productDirectionPackageKind';
import {
  type PackageDocumentTemplateTabId,
  mergeFormDataFromStorage,
} from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { getPackageContractNumberDisplayForForm } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import type { PackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import { resolvePackageTemplateHtml } from '@/views/admin/ContractDocuments/packages/platform/form/resolvePackageTemplateHtml';
import { formatPackageIssuedInvoiceAmountRub } from '@/views/admin/ContractDocuments/packages/platform/payments/packageInvoiceNumber';
import {
  type PackageInvoiceConductDraft,
  buildPackageInvoicePrintHtml,
  buildPackagePaymentInvoiceDownloadFileName,
  lineItemsForPaymentInvoiceReprint,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packageInvoicePrint';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageActPrintTabs';

import { canShareCustomerDocumentFiles } from './packageCustomerDocumentShare';

export type PackageInvoiceShareContext = {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  invoice: ContractDocumentPaymentInvoice;
  templateHtml: string;
  customerPhone: string;
  customerEmail: string;
  contractNumberLabel: string;
  conduct: PackageInvoiceConductDraft;
};

function customerPrimaryPhone(form: PackageFormData): string {
  const phones = [
    ...(form.customer.phones ?? []),
    ...(form.customer.phone ? [form.customer.phone] : []),
  ]
    .map((p) => p.trim())
    .filter(Boolean);
  return phones[0] ?? '';
}

export function invoiceRowToConductDraft(
  row: ContractDocumentPaymentInvoice
): PackageInvoiceConductDraft {
  return {
    invoiceDate: row.invoiceDate,
    invoiceNumber: row.invoiceNumber,
    paymentBasis: row.basis,
    amount: formatPackageIssuedInvoiceAmountRub(Number(row.amount)),
    lineItems: lineItemsForPaymentInvoiceReprint(row),
  };
}

export function buildPackageInvoiceShareMessage(ctx: PackageInvoiceShareContext): string {
  const lines: string[] = ['Счёт на оплату'];
  lines.push(`Счёт: № ${ctx.invoice.invoiceNumber} от ${ctx.invoice.invoiceDate}`);
  lines.push(`Договор: № ${ctx.contractNumberLabel}`);
  if (ctx.form.customer.fullName?.trim() || ctx.invoice.customerName?.trim()) {
    lines.push(
      `Заказчик: ${(ctx.form.customer.fullName || ctx.invoice.customerName || '').trim()}`
    );
  }
  if (ctx.invoice.basis?.trim()) {
    lines.push(`Основание: ${ctx.invoice.basis.trim()}`);
  }
  lines.push(`Сумма: ${formatPackageIssuedInvoiceAmountRub(Number(ctx.invoice.amount))} ₽`);
  lines.push('PDF счёта прилагается / будет отправлен отдельно.');
  return lines.join('\n');
}

export function buildPackageInvoiceShareContext(input: {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  invoice: ContractDocumentPaymentInvoice;
  templateHtml: string;
}): PackageInvoiceShareContext {
  return {
    packageId: input.packageId,
    packageKind: input.packageKind,
    form: input.form,
    invoice: input.invoice,
    templateHtml: input.templateHtml,
    customerPhone: customerPrimaryPhone(input.form),
    customerEmail: input.form.customer.email?.trim() ?? '',
    contractNumberLabel: getPackageContractNumberDisplayForForm(input.form),
    conduct: invoiceRowToConductDraft(input.invoice),
  };
}

/** Загрузка формы пакета и шаблона счёта для отправки из списка бухгалтерии. */
export async function loadPackageInvoiceShareContext(
  invoice: ContractDocumentPaymentInvoice
): Promise<PackageInvoiceShareContext> {
  const row = await getContractDocumentPackage(invoice.packageId);
  const packageKind = row.kind;
  const presetsKind: ContractDocumentPackageKind = isProductDirectionPackageKind(row.kind)
    ? row.kind
    : 'REPAIR';
  const presetsRes = await getContractDocumentTemplatePresets(presetsKind);
  const merged = mergeFormDataFromStorage(row.formData);
  const templateHtml = resolvePackageTemplateHtml(
    PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB,
    presetsRes.items ?? [],
    merged.templatePresetIds,
    merged.templateOverrides
  );
  return buildPackageInvoiceShareContext({
    packageId: invoice.packageId,
    packageKind,
    form: merged.form,
    invoice,
    templateHtml,
  });
}

export function buildPackageInvoiceShareContextFromLive(input: {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  invoice: ContractDocumentPaymentInvoice;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
}): PackageInvoiceShareContext {
  const templateHtml = resolvePackageTemplateHtml(
    PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB,
    input.contractTemplatePresets,
    input.selectedTemplateIds,
    input.templateOverrides
  );
  return buildPackageInvoiceShareContext({
    packageId: input.packageId,
    packageKind: input.packageKind,
    form: input.form,
    invoice: input.invoice,
    templateHtml,
  });
}

export async function buildPackageInvoiceSharePdfFile(
  ctx: PackageInvoiceShareContext
): Promise<File> {
  const html = await buildPackageInvoicePrintHtml(ctx.form, ctx.templateHtml, ctx.conduct);
  if (!html.trim()) {
    throw new Error('Нет данных для PDF счёта');
  }
  const fileName = buildPackagePaymentInvoiceDownloadFileName(ctx.conduct);
  const { blob, fileName: safeName } = await buildDocumentPdfBlob(html, 'Счёт на оплату', fileName);
  return new File([blob], safeName, { type: 'application/pdf' });
}

export async function downloadPackageInvoiceSharePdf(
  ctx: PackageInvoiceShareContext
): Promise<void> {
  const file = await buildPackageInvoiceSharePdfFile(ctx);
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function sharePackageInvoiceNative(
  ctx: PackageInvoiceShareContext,
  message: string
): Promise<{ usedDownloadFallback: boolean }> {
  const file = await buildPackageInvoiceSharePdfFile(ctx);
  if (!canShareCustomerDocumentFiles([file])) {
    await downloadPackageInvoiceSharePdf(ctx);
    return { usedDownloadFallback: true };
  }
  await navigator.share({
    title: `Счёт № ${ctx.invoice.invoiceNumber}`,
    text: message,
    files: [file],
  });
  return { usedDownloadFallback: false };
}
