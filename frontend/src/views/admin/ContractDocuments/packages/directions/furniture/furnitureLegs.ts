import type { PackageExecutorBlock } from '../../platform/form/types';
import {
  type FurnitureAppliancesDocs,
  defaultFurnitureAppliancesDocs,
  normalizeFurnitureAppliancesDocs,
} from './furnitureAppliancesDocs';
import {
  type FurnitureManufactureDocs,
  defaultFurnitureManufactureDocs,
  normalizeFurnitureManufactureDocs,
} from './furnitureManufactureDocs';
import {
  type FurnitureMontageDocs,
  defaultFurnitureMontageDocs,
  normalizeFurnitureMontageDocs,
} from './furnitureMontageDocs';

export type {
  FurnitureManufactureDocs,
  FurnitureMaterialLine,
  FurnitureSpecificationLine,
} from './furnitureManufactureDocs';
export type {
  FurnitureMontageDocs,
  FurnitureMontageLine,
  FurnitureWorkOrderManufactureLine,
} from './furnitureMontageDocs';
export type {
  FurnitureAppliancesDocs,
  FurnitureAppliancesLine,
  FurnitureAppliancesLineGroup,
} from './furnitureAppliancesDocs';
export {
  buildFurnitureSpecificationSheetHtml,
  defaultFurnitureManufactureDocs,
  formatFurnitureMoney,
  formatFurnitureSpecificationLineTotal,
  furnitureSpecificationLineHasContent,
  furnitureSpecificationLinesTotal,
  newFurnitureMaterialLine,
  newFurnitureSpecificationLine,
  normalizeFurnitureManufactureDocs,
  normalizeFurnitureMaterialLines,
  normalizeFurnitureSpecificationLines,
  resolveFurnitureSpecificationLineTotal,
} from './furnitureManufactureDocs';
export {
  defaultFurnitureMontageDocs,
  furnitureMontageLinesTotal,
  formatFurnitureMontageLineTotal,
  formatFurnitureMontageMoney,
  newFurnitureMontageLine,
  newFurnitureWorkOrderManufactureLine,
  normalizeFurnitureMontageDocs,
  resolveFurnitureMontageLineTotal,
} from './furnitureMontageDocs';
export {
  defaultFurnitureAppliancesDocs,
  furnitureAppliancesLinesTotal,
  formatFurnitureAppliancesLineTotal,
  formatFurnitureAppliancesMoney,
  buildFurnitureAppliancesSheetHtml,
  newFurnitureAppliancesLine,
  normalizeFurnitureAppliancesDocs,
  resolveFurnitureAppliancesLineTotal,
} from './furnitureAppliancesDocs';

/** Активный комплект документов в редакторе (договор / акт). */
export type FurnitureActiveDocLeg = 'manufacture' | 'montage' | 'appliances';

/** Нога пакета «Мебель»: изготовление / монтаж / техника. */
export type FurniturePackageLegId = 'manufacture' | 'montage' | 'appliances';

/** Буквы в номере договора по Excel (м / с / т). */
export const FURNITURE_LEG_NUMBER_LETTER: Record<FurniturePackageLegId, string> = {
  manufacture: 'м',
  montage: 'с',
  appliances: 'т',
};

export const FURNITURE_LEG_LABEL: Record<FurniturePackageLegId, string> = {
  manufacture: 'Изготовление',
  montage: 'Монтаж',
  appliances: 'Техника',
};

/** Реквизиты исполнителя на ноге (без менеджера — он общий в шапке пакета). */
export type FurnitureLegExecutorBlock = Pick<
  PackageExecutorBlock,
  | 'selectedProfileTitle'
  | 'executorKind'
  | 'companyName'
  | 'inn'
  | 'kpp'
  | 'ogrn'
  | 'ogrnip'
  | 'legalAddress'
  | 'actualAddress'
  | 'bankDetails'
  | 'bankName'
  | 'bankBik'
  | 'bankCorrAccount'
  | 'bankSettlementAccount'
  | 'email'
>;

export type FurnitureLegContractBlock = {
  number: string;
  /** Срок в рабочих днях (строка, как в основном contract.workPeriod). */
  workPeriod: string;
  totalAmount: string;
  recommendedPrepayment: string;
  prepaymentAmount: string;
  paymentBasis: string;
};

export type FurniturePackageLeg = {
  /**
   * Изготовление всегда включено.
   * Монтаж и техника — по необходимости через UI.
   */
  enabled: boolean;
  executor: FurnitureLegExecutorBlock;
  contract: FurnitureLegContractBlock;
};

export type FurniturePackageBlock = {
  manufacture: FurniturePackageLeg;
  montage: FurniturePackageLeg;
  appliances: FurniturePackageLeg;
  /** Документы ноги «Изготовление»: спецификация, эскиз, замер, таблица материалов. */
  manufactureDocs: FurnitureManufactureDocs;
  /** Документы ноги «Монтаж»: счёт-заказ и строки заказ-наряда. */
  montageDocs: FurnitureMontageDocs;
  /** Документы ноги «Техника»: перечень товара (Переч). */
  appliancesDocs: FurnitureAppliancesDocs;
  /**
   * Какой комплект документов открыт в редакторе (договор / акт).
   * `montage` / `appliances` — только при включённой соответствующей ноге.
   */
  activeDocLeg: FurnitureActiveDocLeg;
};

export function defaultFurnitureLegExecutor(): FurnitureLegExecutorBlock {
  return {
    selectedProfileTitle: '',
    executorKind: 'COMPANY',
    companyName: '',
    inn: '',
    kpp: '',
    ogrn: '',
    ogrnip: '',
    legalAddress: '',
    actualAddress: '',
    bankDetails: '',
    bankName: '',
    bankBik: '',
    bankCorrAccount: '',
    bankSettlementAccount: '',
    email: '',
  };
}

export function defaultFurnitureLegContract(): FurnitureLegContractBlock {
  return {
    number: '',
    workPeriod: '',
    totalAmount: '',
    recommendedPrepayment: '',
    prepaymentAmount: '',
    paymentBasis: '',
  };
}

export function defaultFurniturePackageLeg(enabled: boolean): FurniturePackageLeg {
  return {
    enabled,
    executor: defaultFurnitureLegExecutor(),
    contract: defaultFurnitureLegContract(),
  };
}

export function defaultFurniturePackageBlock(): FurniturePackageBlock {
  return {
    manufacture: defaultFurniturePackageLeg(true),
    montage: defaultFurniturePackageLeg(false),
    appliances: defaultFurniturePackageLeg(false),
    manufactureDocs: defaultFurnitureManufactureDocs(),
    montageDocs: defaultFurnitureMontageDocs(),
    appliancesDocs: defaultFurnitureAppliancesDocs(),
    activeDocLeg: 'manufacture',
  };
}

function asObj(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function normalizeFurnitureLegExecutor(raw: unknown): FurnitureLegExecutorBlock {
  const base = defaultFurnitureLegExecutor();
  const o = asObj(raw);
  if (!o) return base;
  const kind = o.executorKind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
  return {
    selectedProfileTitle:
      typeof o.selectedProfileTitle === 'string'
        ? o.selectedProfileTitle
        : base.selectedProfileTitle,
    executorKind: kind,
    companyName: typeof o.companyName === 'string' ? o.companyName : base.companyName,
    inn: typeof o.inn === 'string' ? o.inn : base.inn,
    kpp: typeof o.kpp === 'string' ? o.kpp : base.kpp,
    ogrn: typeof o.ogrn === 'string' ? o.ogrn : base.ogrn,
    ogrnip: typeof o.ogrnip === 'string' ? o.ogrnip : base.ogrnip,
    legalAddress: typeof o.legalAddress === 'string' ? o.legalAddress : base.legalAddress,
    actualAddress: typeof o.actualAddress === 'string' ? o.actualAddress : base.actualAddress,
    bankDetails: typeof o.bankDetails === 'string' ? o.bankDetails : base.bankDetails,
    bankName: typeof o.bankName === 'string' ? o.bankName : base.bankName,
    bankBik: typeof o.bankBik === 'string' ? o.bankBik : base.bankBik,
    bankCorrAccount:
      typeof o.bankCorrAccount === 'string' ? o.bankCorrAccount : base.bankCorrAccount,
    bankSettlementAccount:
      typeof o.bankSettlementAccount === 'string'
        ? o.bankSettlementAccount
        : base.bankSettlementAccount,
    email: typeof o.email === 'string' ? o.email : base.email,
  };
}

function normalizeFurnitureLegContract(raw: unknown): FurnitureLegContractBlock {
  const base = defaultFurnitureLegContract();
  const o = asObj(raw);
  if (!o) return base;
  return {
    number: typeof o.number === 'string' ? o.number : base.number,
    workPeriod: typeof o.workPeriod === 'string' ? o.workPeriod : base.workPeriod,
    totalAmount: typeof o.totalAmount === 'string' ? o.totalAmount : base.totalAmount,
    recommendedPrepayment:
      typeof o.recommendedPrepayment === 'string'
        ? o.recommendedPrepayment
        : base.recommendedPrepayment,
    prepaymentAmount:
      typeof o.prepaymentAmount === 'string' ? o.prepaymentAmount : base.prepaymentAmount,
    paymentBasis: typeof o.paymentBasis === 'string' ? o.paymentBasis : base.paymentBasis,
  };
}

function normalizeFurnitureLeg(raw: unknown, enabledDefault: boolean): FurniturePackageLeg {
  const o = asObj(raw);
  return {
    enabled: typeof o?.enabled === 'boolean' ? o.enabled : enabledDefault,
    executor: normalizeFurnitureLegExecutor(o?.executor),
    contract: normalizeFurnitureLegContract(o?.contract),
  };
}

export function normalizeFurniturePackageBlock(raw: unknown): FurniturePackageBlock {
  const o = asObj(raw);
  const manufacture = normalizeFurnitureLeg(o?.manufacture, true);
  const montage = normalizeFurnitureLeg(o?.montage, false);
  const appliances = normalizeFurnitureLeg(o?.appliances, false);
  const activeRaw = o?.activeDocLeg;
  let activeDocLeg: FurnitureActiveDocLeg = 'manufacture';
  if (activeRaw === 'montage' && montage.enabled) activeDocLeg = 'montage';
  else if (activeRaw === 'appliances' && appliances.enabled) activeDocLeg = 'appliances';
  return {
    manufacture: { ...manufacture, enabled: true },
    montage,
    appliances,
    manufactureDocs: normalizeFurnitureManufactureDocs(o?.manufactureDocs),
    montageDocs: normalizeFurnitureMontageDocs(o?.montageDocs),
    appliancesDocs: normalizeFurnitureAppliancesDocs(o?.appliancesDocs),
    activeDocLeg,
  };
}

/** Номера включённых ног через « / » (для списков, если основной contract.number пуст). */
export function furnitureEnabledContractNumbers(block: FurniturePackageBlock): string[] {
  const out: string[] = [];
  const push = (leg: FurniturePackageLeg) => {
    if (!leg.enabled) return;
    const n = leg.contract.number.trim();
    if (n) out.push(n);
  };
  push(block.manufacture);
  push(block.montage);
  push(block.appliances);
  return out;
}
