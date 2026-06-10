import type { ContractDocumentPackagePaymentInput } from '@/shared/api/admin-contract-document-packages';

import { amountToRussianWords } from '../../../../shared/amountToRussianWords';
import { applyTemplate } from '../../../../shared/applyTemplate';
import { printDocumentHtml } from '../../../../shared/printDocument';
import {
  REPAIR_CASH_ORDER_TEMPLATE_TAB,
  isRepairCashOrderTemplateTab,
} from '../documents/repairActTwinCopiesOnOnePageHtml';
import type { RepairDocumentTemplateTabId } from '../formDataTemplateStorage';
import type { RepairPackageFormData } from '../repairPackageForm';
import { repairPackageFormForTemplate } from '../repairPackageForm';
import {
  REPAIR_PAYMENT_FORM_LABELS,
  formatRepairPaymentDateForTemplate,
} from './repairPaymentFormLabels';

export type RepairCashOrderConductDraft = {
  paymentDate: string;
  paymentForm: ContractDocumentPackagePaymentInput['paymentForm'];
  paymentBasis: string;
  prepaymentAmount: string;
};

export function buildRepairCashOrderFormForPrint(
  baseForm: RepairPackageFormData,
  conduct?: RepairCashOrderConductDraft | null
): RepairPackageFormData {
  if (!conduct) return baseForm;

  const prepaymentAmount = conduct.prepaymentAmount.trim();
  const paymentBasis = conduct.paymentBasis.trim();
  const prepaymentDate = formatRepairPaymentDateForTemplate(conduct.paymentDate);
  const paymentFormLabel = REPAIR_PAYMENT_FORM_LABELS[conduct.paymentForm] ?? conduct.paymentForm;

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

export function buildRepairCashOrderPrintHtml(
  baseForm: RepairPackageFormData,
  templateHtml: string,
  conduct?: RepairCashOrderConductDraft | null
): string {
  const formForTpl = repairPackageFormForTemplate(
    buildRepairCashOrderFormForPrint(baseForm, conduct),
    { templateTab: REPAIR_CASH_ORDER_TEMPLATE_TAB }
  );
  return applyTemplate(templateHtml, formForTpl, {
    plainCustomerPlaceholders: isRepairCashOrderTemplateTab(REPAIR_CASH_ORDER_TEMPLATE_TAB),
  });
}

export function printRepairCashOrder(html: string): void {
  printDocumentHtml(
    `<div class="docPrintCashOrderCompact">${html}</div>`,
    'Приходно-кассовый ордер',
    { cashOrderCompact: true }
  );
}
