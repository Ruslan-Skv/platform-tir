import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';

export const FURNITURE_STATUS_LABELS = {
  NEW: 'На очереди',
  IN_PROGRESS: 'В работе',
  CLAIMS: 'Рекламации',
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

export type FurnitureDeadlineWarningLevel = 'D20' | 'D10' | 'D3' | 'OVERDUE';

export const DEADLINE_WARNING_LABELS: Record<FurnitureDeadlineWarningLevel, string> = {
  D20: 'Срок через ≤20 дн.',
  D10: 'Срок через ≤10 дн.',
  D3: 'Срок через ≤3 дн.',
  OVERDUE: 'Срок просрочен',
};

export function deadlineWarningShortLabel(
  level: FurnitureDeadlineWarningLevel,
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
    deadlineWarning?: FurnitureDeadlineWarningLevel | null;
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
export function fieldsFromPackage(
  pkg: ContractDocumentPackage
): Partial<FurnitureProjectFormValues> {
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

export type FurnitureProjectFormValues = {
  status: 'NEW' | 'IN_PROGRESS' | 'CLAIMS' | 'CLOSED';
  contractNumber: string;
  installationContractNumber: string;
  appliancesContractNumber: string;
  repairInfo: string;
  reviewInfo: string;
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
  contractDate: string;
  kzInfo: string;
  pauseStartDate: string;
  pauseResumeDate: string;
  workPeriodDays: string;
  workStartActDate: string;
  workCloseActDate: string;
  plannedStartDate: string;
  note: string;
};

export function emptyFurnitureProjectForm(): FurnitureProjectFormValues {
  return {
    status: 'NEW',
    contractNumber: '',
    installationContractNumber: '',
    appliancesContractNumber: '',
    repairInfo: '',
    reviewInfo: '',
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
    contractDate: '',
    kzInfo: '',
    pauseStartDate: '',
    pauseResumeDate: '',
    workPeriodDays: '',
    workStartActDate: '',
    workCloseActDate: '',
    plannedStartDate: '',
    note: '',
  };
}

export function formValuesFromProject(project: {
  status: FurnitureProjectFormValues['status'];
  contractNumber: string | null;
  installationContractNumber?: string | null;
  appliancesContractNumber?: string | null;
  repairInfo?: string | null;
  reviewInfo?: string | null;
  workScope: string | null;
  installerId: string | null;
  installerName: string | null;
  packageId: string | null;
  contractId: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  contractSum: string | number | null;
  payoutSum: string | number | null;
  contractDate?: string | null;
  kzInfo?: string | null;
  pauseStartDate?: string | null;
  pauseResumeDate?: string | null;
  workPeriodDays: number | null;
  workStartActDate: string | null;
  workCloseActDate: string | null;
  plannedStartDate: string | null;
  note: string | null;
  package?: { title?: string | null; crmContract?: { contractNumber?: string } | null } | null;
}): FurnitureProjectFormValues {
  return {
    status: project.status,
    contractNumber: project.contractNumber || '',
    installationContractNumber: project.installationContractNumber || '',
    appliancesContractNumber: project.appliancesContractNumber || '',
    repairInfo: project.repairInfo || '',
    reviewInfo: project.reviewInfo || '',
    workScope: project.workScope || '',
    installerId: project.installerId || '',
    installerName: project.installerName || '',
    manualInstaller: !project.installerId && Boolean(project.installerName?.trim()),
    packageId: project.packageId || '',
    packageSearch:
      project.package?.crmContract?.contractNumber ||
      project.package?.title ||
      project.contractNumber ||
      '',
    contractId: project.contractId || '',
    customerName: project.customerName || '',
    customerAddress: project.customerAddress || '',
    customerPhone: project.customerPhone || '',
    contractSum: moneyToInputValue(project.contractSum),
    payoutSum: moneyToInputValue(project.payoutSum),
    contractDate: isoDateInput(project.contractDate),
    kzInfo: project.kzInfo || '',
    pauseStartDate: isoDateInput(project.pauseStartDate),
    pauseResumeDate: isoDateInput(project.pauseResumeDate),
    workPeriodDays: project.workPeriodDays != null ? String(project.workPeriodDays) : '',
    workStartActDate: isoDateInput(project.workStartActDate),
    workCloseActDate: isoDateInput(project.workCloseActDate),
    plannedStartDate: isoDateInput(project.plannedStartDate),
    note: project.note || '',
  };
}

function normText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normMoney(value: string | null | undefined): string {
  const n = moneyToInputValue(value);
  if (!n) return '';
  const num = Number(n);
  return Number.isFinite(num) ? String(num) : n;
}

function normDays(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  if (!s) return '';
  const n = Number(s);
  return Number.isFinite(n) ? String(Math.trunc(n)) : s;
}

/**
 * Сравнивает значения формы с полями привязанного пакета.
 * Возвращает подписи полей, где пакет задаёт значение, а форма ему противоречит.
 */
export function findRepairPackageConflicts(
  values: FurnitureProjectFormValues,
  pkg: ContractDocumentPackage
): string[] {
  const fromPkg = fieldsFromPackage(pkg);
  const conflicts: string[] = [];

  const pushIfConflict = (
    label: string,
    formValue: string,
    packageValue: string | undefined,
    normalize: (v: string) => string
  ) => {
    const pkgVal = (packageValue ?? '').trim();
    if (!pkgVal) return;
    if (normalize(formValue) !== normalize(pkgVal)) {
      conflicts.push(`${label}: в форме «${formValue.trim() || '—'}», в пакете «${pkgVal}»`);
    }
  };

  pushIfConflict('№ договора', values.contractNumber, fromPkg.contractNumber, normText);
  pushIfConflict('Заказчик', values.customerName, fromPkg.customerName, normText);
  pushIfConflict('Адрес', values.customerAddress, fromPkg.customerAddress, normText);
  pushIfConflict('Телефон', values.customerPhone, fromPkg.customerPhone, normText);
  pushIfConflict('Стоимость договора', values.contractSum, fromPkg.contractSum, normMoney);
  pushIfConflict('Предоплата', values.payoutSum, fromPkg.payoutSum, normMoney);
  pushIfConflict(
    'Срок договора (раб. дни)',
    values.workPeriodDays,
    fromPkg.workPeriodDays,
    normDays
  );
  pushIfConflict(
    'Акт начала работ',
    values.workStartActDate,
    fromPkg.workStartActDate,
    (v) => isoDateInput(v) || normText(v)
  );
  pushIfConflict(
    'Акт сдачи-приёмки',
    values.workCloseActDate,
    fromPkg.workCloseActDate,
    (v) => isoDateInput(v) || normText(v)
  );
  pushIfConflict(
    'Планируемое начало',
    values.plannedStartDate,
    fromPkg.plannedStartDate,
    (v) => isoDateInput(v) || normText(v)
  );

  return conflicts;
}
