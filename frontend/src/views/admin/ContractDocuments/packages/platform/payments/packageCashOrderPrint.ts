import type { ContractDocumentPackagePaymentInput } from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from '../../../core/amountToRussianWords';
import { applyTemplate } from '../../../core/applyTemplate';
import { printDocumentHtml } from '../../../core/printDocument';
import type { PackageFormData } from '../form/packageForm';
import { packageFormForTemplate } from '../form/packageForm';
import {
  PACKAGE_CASH_ORDER_TEMPLATE_TAB,
  isPackageCashOrderTemplateTab,
} from '../tabs/packageActPrintTabs';
import {
  PACKAGE_PAYMENT_FORM_LABELS,
  formatPackagePaymentDateForTemplate,
} from './packagePaymentFormLabels';

export type PackageCashOrderConductDraft = {
  paymentDate: string;
  paymentForm: ContractDocumentPackagePaymentInput['paymentForm'];
  paymentBasis: string;
  prepaymentAmount: string;
};

export function buildPackageCashOrderFormForPrint(
  baseForm: PackageFormData,
  conduct?: PackageCashOrderConductDraft | null
): PackageFormData {
  if (!conduct) return baseForm;

  const prepaymentAmount = conduct.prepaymentAmount.trim();
  const paymentBasis = conduct.paymentBasis.trim();
  const prepaymentDate = formatPackagePaymentDateForTemplate(conduct.paymentDate);
  const paymentFormLabel = PACKAGE_PAYMENT_FORM_LABELS[conduct.paymentForm] ?? conduct.paymentForm;

  return {
    ...baseForm,
    contract: {
      ...baseForm.contract,
      prepaymentAmount,
      prepaymentAmountWords: prepaymentAmount ? amountToRussianWords(prepaymentAmount) : '',
      paymentBasis,
      prepaymentDate,
      paymentFormLabel,
    },
  };
}

export function buildPackageCashOrderPrintHtml(
  baseForm: PackageFormData,
  templateHtml: string,
  conduct?: PackageCashOrderConductDraft | null
): string {
  const formForTpl = packageFormForTemplate(buildPackageCashOrderFormForPrint(baseForm, conduct), {
    templateTab: PACKAGE_CASH_ORDER_TEMPLATE_TAB,
  });
  return applyTemplate(templateHtml, formForTpl, {
    plainCustomerPlaceholders: isPackageCashOrderTemplateTab(PACKAGE_CASH_ORDER_TEMPLATE_TAB),
  });
}

export function printPackageCashOrder(html: string): void {
  printDocumentHtml(
    `<div class="docPrintCashOrderCompact">${html}</div>`,
    'Приходно-кассовый ордер',
    { cashOrderCompact: true }
  );
}
