import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';

/** Id шаблона ПКО (вкладка убрана из редактора; печать — в модалке оплат). */
export const REPAIR_CASH_ORDER_TEMPLATE_TAB = 'cashOrder';

export const REPAIR_PAYMENT_INVOICE_TEMPLATE_TAB = 'paymentInvoice';

/** Акты начала / приёмки: превью и печать на листе A4. */
export function isRepairActA4PreviewTab(tab: string): boolean {
  return tab === 'actStart' || tab === 'actAcceptance';
}

/** Два экземпляра акта на одном листе A4 — только направление «Ремонт». */
export function isRepairActTwinOneSheetTab(
  tab: string,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): boolean {
  if (isProductDirectionPackageKind(packageKind)) return false;
  return isRepairActA4PreviewTab(tab);
}

export function isRepairCashOrderTemplateTab(tab: string): boolean {
  return tab === REPAIR_CASH_ORDER_TEMPLATE_TAB;
}

/** Договор, ПКО и акты: `customer.*` без авто-обёртки в жирный/курсив в `applyTemplate`. */
export function isRepairPlainCustomerTab(tab: string): boolean {
  return tab === 'contract' || isRepairActTwinOneSheetTab(tab) || isRepairCashOrderTemplateTab(tab);
}

/**
 * Два экземпляра акта на одном листе A4 (акты начала работ и приёмки): две строки с горизонтальным разделителем.
 * Inline-стили — чтобы то же HTML корректно смотрелось в окне печати без module CSS.
 */
export function wrapRepairActTwinCopiesOnOnePageHtml(renderedDocHtml: string): string {
  return `<div style="display:flex;flex-direction:column;width:100%;box-sizing:border-box;align-items:stretch;gap:0;">
<div style="min-width:0">${renderedDocHtml}</div>
<div style="height:4px;margin:12px 0;background:#9ca3af;border-radius:2px;flex-shrink:0;width:100%;box-sizing:border-box" role="separator" aria-hidden="true"></div>
<div style="min-width:0">${renderedDocHtml}</div>
</div>`;
}
