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

export const CONTRACT_EVENT_LABELS = {
  WORK_START_ACT: 'Акт начала',
  ADDENDUM: 'Д/с',
  CALCULATED_END_BASE: 'Срок (базовый)',
  CALCULATED_END: 'Срок окончания',
  WORK_CLOSE_ACT: 'Акт сдачи',
} as const;

export const ADDENDUM_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыто',
  SIGNED: 'Подписано',
  PAID: 'Оплачено',
};

export type RepairDeadlineWarningLevel = 'D20' | 'D10' | 'D3' | 'OVERDUE';

export const DEADLINE_WARNING_LABELS: Record<RepairDeadlineWarningLevel, string> = {
  D20: 'Срок через ≤20 дн.',
  D10: 'Срок через ≤10 дн.',
  D3: 'Срок через ≤3 дн.',
  OVERDUE: 'Срок просрочен',
};

export function deadlineWarningShortLabel(
  level: RepairDeadlineWarningLevel,
  daysLeft: number | null | undefined
): string {
  if (level === 'OVERDUE') {
    const overdue = daysLeft != null && daysLeft < 0 ? Math.abs(daysLeft) : null;
    return overdue != null ? `Просрочен на ${overdue} дн.` : 'Просрочен';
  }
  if (daysLeft != null && daysLeft >= 0) {
    if (daysLeft === 0) return 'Срок сегодня';
    if (daysLeft === 1) return 'Срок завтра';
    return `Срок через ${daysLeft} дн.`;
  }
  return DEADLINE_WARNING_LABELS[level];
}

export function matchesDeadlineFilter(
  item: {
    deadlineDaysLeft?: number | null;
    deadlineWarning?: RepairDeadlineWarningLevel | null;
  },
  filter: 'ALL' | 'LE20' | 'LE10' | 'LE3' | 'OVERDUE'
): boolean {
  if (filter === 'ALL') return true;
  const days = item.deadlineDaysLeft;
  if (days == null && !item.deadlineWarning) return false;
  if (filter === 'OVERDUE') return item.deadlineWarning === 'OVERDUE' || (days != null && days < 0);
  if (filter === 'LE3') return days != null && days <= 3;
  if (filter === 'LE10') return days != null && days <= 10;
  if (filter === 'LE20') return days != null && days <= 20;
  return false;
}

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

  const workStartActDate =
    isoDateInput(form.repairWorkStartActSignedAt) || isoDateInput(contract?.actWorkStartDate);
  const workCloseActDate = isoDateInput(form.repairContractCloseActSignedAt);
  const workPeriodDays =
    typeof formContract.workPeriod === 'string' || typeof formContract.workPeriod === 'number'
      ? String(formContract.workPeriod).trim()
      : '';

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
    workPeriodDays,
    workStartActDate,
    workCloseActDate,
    plannedStartDate: workStartActDate || isoDateInput(contract?.actWorkStartDate),
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
  workPeriodDays: string;
  workStartActDate: string;
  workCloseActDate: string;
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
    workPeriodDays: '',
    workStartActDate: '',
    workCloseActDate: '',
    plannedStartDate: '',
    note: '',
  };
}
