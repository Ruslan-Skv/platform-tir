/** Структура вкладки «Данные» для направления «Ремонт» (расширяйте по мере переноса полей из Excel). */
export interface RepairCustomerBlock {
  type: 'PERSON' | 'COMPANY' | 'ENTREPRENEUR';
  fullName: string;
  representativeFullNameNominative: string;
  representativeFullNameGenitive: string;
  organizationName: string;
  representativePositionNominative: string;
  representativePositionGenitive: string;
  inn: string;
  ogrn: string;
  address: string;
  phone: string;
  email: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
}

export interface RepairExecutorBlock {
  selectedProfileTitle: string;
  companyName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  actualAddress: string;
  bankDetails: string;
  directorNameNominative: string;
  directorNameGenitive: string;
  directorName: string;
  basis: string;
}

export interface RepairObjectBlock {
  objectAddress: string;
  objectDescription: string;
}

export interface RepairContractBlock {
  number: string;
  date: string;
  totalAmount: string;
  recommendedPrepayment: string;
  totalAmountWords: string;
  prepaymentAmount: string;
  workPeriod: string;
}

export interface RepairEstimateBlock {
  /** Свободный текст или позже — строки сметы в JSON */
  notes: string;
}

export interface RepairPackageFormData {
  customer: RepairCustomerBlock;
  executor: RepairExecutorBlock;
  object: RepairObjectBlock;
  contract: RepairContractBlock;
  estimate: RepairEstimateBlock;
}

export function defaultRepairPackageFormData(): RepairPackageFormData {
  return {
    customer: {
      type: 'PERSON',
      fullName: '',
      representativeFullNameNominative: '',
      representativeFullNameGenitive: '',
      organizationName: '',
      representativePositionNominative: '',
      representativePositionGenitive: '',
      inn: '',
      ogrn: '',
      address: '',
      phone: '',
      email: '',
      passportSeriesNumber: '',
      passportIssuedBy: '',
      passportIssueDate: '',
    },
    executor: {
      selectedProfileTitle: '',
      companyName: '',
      inn: '',
      kpp: '',
      ogrn: '',
      legalAddress: '',
      actualAddress: '',
      bankDetails: '',
      directorNameNominative: '',
      directorNameGenitive: '',
      directorName: '',
      basis: '',
    },
    object: {
      objectAddress: '',
      objectDescription: '',
    },
    contract: {
      number: '',
      date: '',
      totalAmount: '',
      recommendedPrepayment: '',
      totalAmountWords: '',
      prepaymentAmount: '',
      workPeriod: '',
    },
    estimate: {
      notes: '',
    },
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = mergeDeep(bv as Record<string, unknown>, pv);
    } else if (pv !== undefined) {
      out[key] = pv;
    }
  }
  return out as T;
}

export function mergeRepairPackageFormData(raw: unknown): RepairPackageFormData {
  const base = defaultRepairPackageFormData();
  if (!isPlainObject(raw)) return base;
  return mergeDeep(
    base as unknown as Record<string, unknown>,
    raw
  ) as unknown as RepairPackageFormData;
}
