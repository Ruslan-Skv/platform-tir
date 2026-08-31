import type { ExecutorRequisiteProfile } from '@/shared/api/admin-contract-document-packages';

export const EMPTY_EXECUTOR_PROFILE: ExecutorRequisiteProfile = {
  title: '',
  kind: 'COMPANY',
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

export type ExecutorKindFilter = 'ALL' | 'COMPANY' | 'ENTREPRENEUR';

export type ExecutorSortKey = 'title_asc' | 'title_desc';

export type ExecutorProfileRowView = {
  item: ExecutorRequisiteProfile;
  originalIndex: number;
};

export function executorKindLabel(kind: ExecutorRequisiteProfile['kind'] | undefined): string {
  return kind === 'ENTREPRENEUR' ? 'ИП' : 'ЮЛ';
}
