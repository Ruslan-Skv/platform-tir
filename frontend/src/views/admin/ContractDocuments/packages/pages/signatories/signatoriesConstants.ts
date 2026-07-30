import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';

/** Роли, доступные как менеджер в замерах и фильтрах списка. */
export const MANAGER_CRM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
] as const;

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
