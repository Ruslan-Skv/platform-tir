import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';

export const REPAIR_STATUS_LABELS = {
  NEW: 'Новые договора',
  IN_PROGRESS: 'В работе',
  CLOSED: 'Закрытые',
} as const;

export const ENTRY_KIND_LABELS = {
  WEEKLY: 'Неделя',
  MILESTONE: 'Веха',
  NOTE: 'Заметка',
} as const;

export function todayIsoDate() {
  return new Date().toLocaleDateString('en-CA');
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1].slice(2)}` : date.slice(0, 10);
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Нормализует сумму из CRM/formData в строку для input[type=number]. */
export function moneyToInputValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return '';
  const n = Number(match[0]);
  return Number.isFinite(n) ? String(n) : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function strField(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isoDateInput(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Подтягивает поля проекта из пакета/договора CRM и formData. */
export function fieldsFromPackage(pkg: ContractDocumentPackage): Partial<RepairProjectFormValues> {
  const form = asRecord(pkg.formData) ?? {};
  const formContract = asRecord(form.contract) ?? {};
  const formCustomer = asRecord(form.customer) ?? {};
  const formObject = asRecord(form.object) ?? {};
  const contract = pkg.crmContract;

  const contractSum =
    moneyToInputValue(contract?.totalAmount) ||
    moneyToInputValue(formContract.totalAmount) ||
    moneyToInputValue(formContract.contractCost);

  const prepayment =
    moneyToInputValue(contract?.advanceAmount) || moneyToInputValue(formContract.prepaymentAmount);

  return {
    packageId: pkg.id,
    packageSearch: contract?.contractNumber || pkg.title || pkg.id,
    contractId: pkg.crmContractId || contract?.id || '',
    contractNumber: strField(contract?.contractNumber, formContract.number) || '',
    customerName: strField(
      contract?.customerName,
      formCustomer.fullName,
      formCustomer.customerName,
      formCustomer.fio
    ),
    customerAddress: strField(
      contract?.customerAddress,
      formObject.objectAddress,
      formCustomer.address,
      formCustomer.customerAddress
    ),
    customerPhone: strField(
      contract?.customerPhone,
      formCustomer.phone,
      Array.isArray(formCustomer.phones) ? formCustomer.phones[0] : null,
      formCustomer.customerPhone
    ),
    contractSum,
    payoutSum: prepayment,
    plannedStartDate: isoDateInput(contract?.actWorkStartDate),
  };
}

export type RepairProjectFormValues = {
  status: 'NEW' | 'IN_PROGRESS' | 'CLOSED';
  contractNumber: string;
  workScope: string;
  installerId: string;
  installerName: string;
  manualInstaller: boolean;
  packageId: string;
  packageSearch: string;
  contractId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  contractSum: string;
  payoutSum: string;
  plannedStartDate: string;
  note: string;
};

export function emptyRepairProjectForm(): RepairProjectFormValues {
  return {
    status: 'NEW',
    contractNumber: '',
    workScope: '',
    installerId: '',
    installerName: '',
    manualInstaller: false,
    packageId: '',
    packageSearch: '',
    contractId: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    contractSum: '',
    payoutSum: '',
    plannedStartDate: '',
    note: '',
  };
}
