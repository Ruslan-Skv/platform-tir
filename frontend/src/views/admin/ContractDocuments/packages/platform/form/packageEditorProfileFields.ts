import type {
  ContractDocumentPackageStatus,
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

import { executorDefaultBankBlock } from './executorBankFields';
import type { PackageFormData } from './packageForm';

/** Реквизиты исполнителя из справочника «Исполнители» (блок формы без карточки менеджера). */
export type PackageExecutorRequisitesFields = Pick<
  PackageFormData['executor'],
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

/** Поля менеджера из справочника «Менеджеры». */
export type PackageSignatoryDirectoryFields = Pick<
  PackageFormData['executor'],
  | 'signatoryCrmUserId'
  | 'directorNameNominative'
  | 'directorNameGenitive'
  | 'directorName'
  | 'basis'
  | 'salesOffice'
  | 'officePhone'
>;

export function executorRequisitesFromProfile(
  profile: ExecutorRequisiteProfile
): PackageExecutorRequisitesFields {
  const kind = profile.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
  const bank = executorDefaultBankBlock(profile);
  return {
    executorKind: kind,
    companyName: profile.companyName ?? '',
    inn: profile.inn ?? '',
    kpp: kind === 'ENTREPRENEUR' ? '' : (profile.kpp ?? ''),
    ogrn: kind === 'ENTREPRENEUR' ? '' : (profile.ogrn ?? ''),
    ogrnip: kind === 'ENTREPRENEUR' ? (profile.ogrnip ?? '') : '',
    legalAddress: profile.legalAddress ?? '',
    actualAddress: profile.actualAddress ?? '',
    bankDetails: bank.bankDetails,
    bankName: bank.bankName,
    bankBik: bank.bankBik,
    bankCorrAccount: bank.bankCorrAccount,
    bankSettlementAccount: bank.bankSettlementAccount,
    email: profile.email ?? '',
  };
}

/**
 * Форма с реквизитами исполнителя из справочника (если в форме выбран профиль).
 * Подписанные (и отказные) пакеты держат реквизиты на момент подписания —
 * смена варианта банка в справочнике на них не влияет.
 */
export function formWithExecutorProfileSync(
  form: PackageFormData,
  profiles: ExecutorRequisiteProfile[],
  packageStatus?: ContractDocumentPackageStatus
): PackageFormData {
  if (packageStatus === 'CONTRACT_CONCLUDED' || packageStatus === 'REFUSED') return form;
  const title = form.executor.selectedProfileTitle?.trim();
  if (!title) return form;
  const profile = profiles.find((it) => it.title === title);
  if (!profile) return form;
  return {
    ...form,
    executor: {
      ...form.executor,
      ...executorRequisitesFromProfile(profile),
    },
  };
}

export function emptyExecutorRequisites(): PackageExecutorRequisitesFields {
  return {
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

export function signatoryFieldsFromProfile(
  profile: ContractSignatoryProfile
): PackageSignatoryDirectoryFields {
  const nom = profile.directorNameNominative ?? '';
  return {
    signatoryCrmUserId: profile.crmUserId ?? '',
    directorNameNominative: nom,
    directorNameGenitive: profile.directorNameGenitive ?? '',
    directorName: nom,
    basis: profile.basis ?? '',
    salesOffice: profile.salesOffice ?? '',
    officePhone: profile.officePhone ?? '',
  };
}

export function emptySignatoryDirectoryFields(): PackageSignatoryDirectoryFields {
  return {
    signatoryCrmUserId: '',
    directorNameNominative: '',
    directorNameGenitive: '',
    directorName: '',
    basis: '',
    salesOffice: '',
    officePhone: '',
  };
}
