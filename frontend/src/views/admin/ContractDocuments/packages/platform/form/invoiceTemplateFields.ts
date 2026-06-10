import { amountToRussianWords } from '../../../core/amountToRussianWords';
import type { PackageCustomerBlock, PackageExecutorBlock } from '../form/packageForm';
import { resolveExecutorBankFields } from './executorBankFields';

function joinParts(parts: (string | undefined)[], sep: string): string {
  return parts
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(sep);
}

/** Сумма в виде «40 300,00». */
export function formatInvoiceMoneyAmount(raw: string): string {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return '';
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return raw.trim();
  const [intPart, fracPart = '00'] = parsed.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped},${fracPart}`;
}

export { formatInvoiceBankAccount, parseExecutorBankDetails } from './executorBankFields';
export type { ParsedExecutorBankDetails } from './executorBankFields';

/** Пропись для счёта: «Сорок тысяч триста руб. 00 коп.» */
export function amountToRussianWordsForInvoice(raw: string): string {
  const words = amountToRussianWords(raw);
  if (!words) return '';
  const compact = words
    .replace(/\s+рубл(?:ь|я|ей)\s+/i, ' руб. ')
    .replace(/\s+копе(?:ек|йки|йка)\s*$/i, ' коп.');
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

export function buildExecutorSupplierLine(
  executor: PackageExecutorBlock & { innKppRegLine: string }
): string {
  return joinParts([executor.companyName, executor.innKppRegLine], ', ');
}

export function buildCustomerBuyerLine(customer: PackageCustomerBlock): string {
  if (customer.type === 'COMPANY') {
    return joinParts([customer.organizationName, customer.inn ? `ИНН ${customer.inn}` : ''], ', ');
  }
  if (customer.type === 'ENTREPRENEUR') {
    const name = joinParts(
      [customer.organizationName, customer.fullName, customer.representativeFullNameNominative],
      ' '
    );
    const normalized = name.replace(/^индивидуальный\s+предприниматель\s*/i, '').trim();
    const preamble = normalized
      ? `Индивидуальный предприниматель ${normalized.replace(/^ип\.?\s*/i, '').trim()}`
      : '';
    return joinParts([preamble, customer.inn ? `ИНН ${customer.inn}` : ''], ', ');
  }
  return joinParts([customer.fullName, customer.inn ? `ИНН ${customer.inn}` : ''], ', ');
}

export type PackageInvoiceTemplateExtras = {
  supplierLine: string;
  buyerLine: string;
  bankName: string;
  bankBik: string;
  bankCorrAccount: string;
  bankSettlementAccount: string;
  prepaymentAmountFormatted: string;
  prepaymentAmountWordsInvoice: string;
  invoiceTitleLine: string;
};

export function buildPackageInvoiceTemplateExtras(
  executor: PackageExecutorBlock & { innKppRegLine: string },
  customer: PackageCustomerBlock,
  contract: {
    invoiceNumber: string;
    prepaymentDate: string;
    prepaymentAmount: string;
    prepaymentAmountWords: string;
  }
): PackageInvoiceTemplateExtras {
  const bank = resolveExecutorBankFields(executor);
  const amountFormatted = formatInvoiceMoneyAmount(contract.prepaymentAmount);
  const amountWords =
    amountToRussianWordsForInvoice(contract.prepaymentAmount) || contract.prepaymentAmountWords;

  const numberPart = contract.invoiceNumber.trim();
  const datePart = contract.prepaymentDate.trim();
  const invoiceTitleLine = joinParts(
    [
      numberPart ? `Счёт на оплату № ${numberPart}` : 'Счёт на оплату',
      datePart ? `от ${datePart}` : '',
    ],
    ' '
  );

  return {
    supplierLine: buildExecutorSupplierLine(executor),
    buyerLine: buildCustomerBuyerLine(customer),
    bankName: bank.bankName,
    bankBik: bank.bankBik,
    bankCorrAccount: bank.bankCorrAccountDisplay,
    bankSettlementAccount: bank.bankSettlementAccountDisplay,
    prepaymentAmountFormatted: amountFormatted,
    prepaymentAmountWordsInvoice: amountWords,
    invoiceTitleLine,
  };
}
