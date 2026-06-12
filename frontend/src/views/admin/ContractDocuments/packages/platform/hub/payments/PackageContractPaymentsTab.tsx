'use client';

import { type ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { type PackageFormData } from '../../form/packageForm';
import type { PackageCashOrderConductDraft } from '../../payments/packageCashOrderPrint';
import { PackageContractPaymentsTabView } from './PackageContractPaymentsTabView';
import { usePackageContractPaymentsTab } from './usePackageContractPaymentsTab';

export type PackageContractPaymentsTabLayout =
  | 'full'
  | 'hub'
  | 'hub-summary'
  | 'hub-conduct'
  | 'journal';

export interface PackageContractPaymentsTabProps {
  packageId: string;
  packageKind?: ContractDocumentPackageKind;
  form: PackageFormData;
  onError: (message: string) => void;
  onUpdateContract: <K extends keyof PackageFormData['contract']>(key: K, value: string) => void;
  /** После изменения журнала оплат (для бейджа % в шапке / модалке). */
  onJournalChanged?: () => void;
  /** hub-summary / hub-conduct — части модалки; journal — журнал оплат. */
  layout?: PackageContractPaymentsTabLayout;
  /** Перезагрузка журнала (сводка «Оплачено» в другой секции модалки). */
  journalReloadToken?: number;
  /** Печать ПКО из блока «Провести оплату» (модалка хаба). */
  onPrintCashOrder?: (conduct: PackageCashOrderConductDraft) => void;
  /** Сохранить поля оплаты в `contract.*` для ПКО (одним запросом). */
  onUpdateContractFields?: (patch: Partial<PackageFormData['contract']>) => void;
}

export function PackageContractPaymentsTab(props: PackageContractPaymentsTabProps) {
  const model = usePackageContractPaymentsTab(props);
  return <PackageContractPaymentsTabView {...model} />;
}
