import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';

/** Id шаблона ПКО (вкладка убрана из редактора; печать — в модалке оплат). */
export const PACKAGE_CASH_ORDER_TEMPLATE_TAB = 'cashOrder';

export const PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB = 'paymentInvoice';

/** Акты начала / приёмки: превью и печать на листе A4. */
export function isPackageActA4PreviewTab(tab: string): boolean {
  return tab === 'actStart' || tab === 'actAcceptance';
}

/** Два экземпляра акта на одном листе A4 — только направление «Ремонт». */
export function isPackageActTwinOneSheetTab(
  tab: string,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): boolean {
  if (isProductDirectionPackageKind(packageKind)) return false;
  return isPackageActA4PreviewTab(tab);
}

export function isPackageCashOrderTemplateTab(tab: string): boolean {
  return tab === PACKAGE_CASH_ORDER_TEMPLATE_TAB;
}

/** Договор, ПКО и акты: `customer.*` без авто-обёртки в жирный/курсив в `applyTemplate`. */
export function isPackagePlainCustomerTab(tab: string): boolean {
  return (
    tab === 'contract' || isPackageActTwinOneSheetTab(tab) || isPackageCashOrderTemplateTab(tab)
  );
}

/**
 * Два экземпляра акта на одном листе A4 (акты начала работ и приёмки): две строки с горизонтальным разделителем.
 * Inline-стили — чтобы то же HTML корректно смотрелось в окне печати без module CSS.
 */
export function wrapPackageActTwinCopiesOnOnePageHtml(renderedDocHtml: string): string {
  return `<div style="display:flex;flex-direction:column;width:100%;box-sizing:border-box;align-items:stretch;gap:0;">
<div style="min-width:0">${renderedDocHtml}</div>
<div style="height:4px;margin:12px 0;background:#9ca3af;border-radius:2px;flex-shrink:0;width:100%;box-sizing:border-box" role="separator" aria-hidden="true"></div>
<div style="min-width:0">${renderedDocHtml}</div>
</div>`;
}
