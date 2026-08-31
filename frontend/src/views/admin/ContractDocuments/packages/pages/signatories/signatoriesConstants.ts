import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';

export const EMPTY_SIGNATORY_PROFILE: ContractSignatoryProfile = {
  title: '',
  crmUserId: '',
  officeId: '',
  directorNameNominative: '',
  directorNameGenitive: '',
  basis: '',
  salesOffice: '',
  officePhone: '',
};

export type SignatorySortKey = 'title_asc' | 'title_desc';

export type SignatoryRowView = { item: ContractSignatoryProfile; originalIndex: number };
