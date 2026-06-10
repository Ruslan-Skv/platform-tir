import type {
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

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
  return {
    executorKind: kind,
    companyName: profile.companyName ?? '',
    inn: profile.inn ?? '',
    kpp: kind === 'ENTREPRENEUR' ? '' : (profile.kpp ?? ''),
    ogrn: kind === 'ENTREPRENEUR' ? '' : (profile.ogrn ?? ''),
    ogrnip: kind === 'ENTREPRENEUR' ? (profile.ogrnip ?? '') : '',
    legalAddress: profile.legalAddress ?? '',
    actualAddress: profile.actualAddress ?? '',
    bankDetails: profile.bankDetails ?? '',
    bankName: profile.bankName ?? '',
    bankBik: profile.bankBik ?? '',
    bankCorrAccount: profile.bankCorrAccount ?? '',
    bankSettlementAccount: profile.bankSettlementAccount ?? '',
    email: profile.email ?? '',
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
