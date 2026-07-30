'use client';

import type {
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';

import type { ProductContractCostBreakdown } from '../../../families/product-like/cost/productContractCostBreakdown';
import type { PackageFormData } from '../../form/packageForm';
import type { PackageContractObjectBlockFieldId } from '../shared/packageContractObjectBlock';
import { PackageDataTabView } from './PackageDataTabView';

export type PackageDataTabProps = {
  form: PackageFormData;
  contractAndEstimateLocked: boolean;
  isSuperAdmin: boolean;
  isProductDirectionPackage: boolean;
  packageKind: import('@/shared/api/admin-contract-document-packages').ContractDocumentPackageKind;
  contractObjectBlockFieldClassName: (
    fieldId: PackageContractObjectBlockFieldId
  ) => string | undefined;
  updateContract: (key: keyof PackageFormData['contract'], value: string) => void;
  updateObject: (key: keyof PackageFormData['object'], value: string) => void;
  applyExecutorProfile: (title: string) => void;
  applySignatoryProfile: (title: string) => void;
  executorProfiles: ExecutorRequisiteProfile[];
  signatoryProfiles: ContractSignatoryProfile[];
  contractDateFieldHelp: { title: string; steps: readonly string[]; note?: string };
  workPeriodFieldHelp: { title: string; steps: readonly string[]; note?: string };
  linkedCrmCustomerId: string | null;
  onCrmCustomerApplied: (detail: import('@/shared/api/admin-crm').CrmCustomerDetail) => void;
  onCrmCustomerClear: () => void;
  onCrmError: (text: string) => void;
  productContractCostBreakdown: ProductContractCostBreakdown | null;
  customerSectionCompletionPercent: number;
  executorSectionCompletionPercent: number;
  managerSectionCompletionPercent: number;
  customerDataSectionExpanded: boolean;
  setCustomerDataSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  executorDataSectionExpanded: boolean;
  setExecutorDataSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  managerDataSectionExpanded: boolean;
  setManagerDataSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  customerPhonesReadonlyDisplay: string;
};

export function PackageDataTab(props: PackageDataTabProps) {
  return <PackageDataTabView {...props} />;
}
