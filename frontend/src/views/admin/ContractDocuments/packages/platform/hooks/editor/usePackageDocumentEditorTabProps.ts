import { useMemo } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
  ContractSignatoryProfile,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmCustomerDetail } from '@/shared/api/admin-crm';

import type { ProductContractCostBreakdown } from '../../../families/product-like/cost/productContractCostBreakdown';
import type { PackageDataTabProps } from '../../editor/dataTab/PackageDataTab';
import type { PackageEstimateTabProps } from '../../editor/estimateTab/PackageEstimateTab';
import type { PackageFinalEstimateTabProps } from '../../editor/tabs/PackageFinalEstimateTab';
import type { ProductSpecificationTabProps } from '../../editor/tabs/ProductSpecificationTab';
import type { EstimateEmbedSection } from '../../estimates/packageEstimateDocPrintEmbedHtml';
import type { PackageFormData } from '../../form/packageForm';
import type { usePackageEstimateAttachCatalog } from '../estimate/usePackageEstimateAttachCatalog';
import type { usePackageEstimateTabHandlers } from '../estimate/usePackageEstimateTabHandlers';
import type { usePackageProductSpecificationHandlers } from '../product-spec/usePackageProductSpecificationHandlers';

type FieldHelp = { title: string; steps: readonly string[]; note?: string };

export type UsePackageDocumentEditorTabPropsOptions = {
  form: PackageFormData;
  contractAndEstimateLocked: boolean;
  isSuperAdmin: boolean;
  isProductDirectionPackage: boolean;
  contractObjectBlockFieldClassName: PackageDataTabProps['contractObjectBlockFieldClassName'];
  updateContract: PackageDataTabProps['updateContract'];
  updateObject: PackageDataTabProps['updateObject'];
  applyExecutorProfile: PackageDataTabProps['applyExecutorProfile'];
  applySignatoryProfile: PackageDataTabProps['applySignatoryProfile'];
  executorProfiles: ExecutorRequisiteProfile[];
  signatoryProfiles: ContractSignatoryProfile[];
  contractDateFieldHelp: FieldHelp;
  workPeriodFieldHelp: FieldHelp;
  discountFieldHelp: FieldHelp;
  linkedCrmCustomerId: string | null;
  onCrmCustomerApplied: (detail: CrmCustomerDetail) => void;
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
  estimateAppendixContractRef: { num: string; date: string };
  contractEstimateObjectKey: string;
  estimateAttachGroupKey: string;
  setEstimateAttachGroupKey: React.Dispatch<React.SetStateAction<string>>;
  estimatePresetToAttach: string;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  attachEstimatePickMeta: ReturnType<
    typeof usePackageEstimateAttachCatalog
  >['attachEstimatePickMeta'];
  attachableForSelectedGroup: ContractEstimatePreset[];
  attachableEstimatePresets: ContractEstimatePreset[];
  estimatePresets: ContractEstimatePreset[];
  estimateUsageById: ReturnType<typeof usePackageEstimateAttachCatalog>['estimateUsageById'];
  draggingEstimatePresetId: string | null;
  setDraggingEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedEstimateSections: EstimateEmbedSection[];
  contractDiscountPercentParsed: number;
  estimatePrintSheetRef: React.RefObject<HTMLElement | null>;
  estimateTabHandlers: ReturnType<typeof usePackageEstimateTabHandlers>;
  finalEstimateRooms: PackageFinalEstimateTabProps['rooms'];
  finalEstimateTotalAmount: number;
  finalEstimateTotalAfterDiscount: number;
  productSpecificationHandlers: ReturnType<typeof usePackageProductSpecificationHandlers>;
};

export function usePackageDocumentEditorTabProps({
  form,
  contractAndEstimateLocked,
  isSuperAdmin,
  isProductDirectionPackage,
  contractObjectBlockFieldClassName,
  updateContract,
  updateObject,
  applyExecutorProfile,
  applySignatoryProfile,
  executorProfiles,
  signatoryProfiles,
  contractDateFieldHelp,
  workPeriodFieldHelp,
  discountFieldHelp,
  linkedCrmCustomerId,
  onCrmCustomerApplied,
  onCrmCustomerClear,
  onCrmError,
  productContractCostBreakdown,
  customerSectionCompletionPercent,
  executorSectionCompletionPercent,
  managerSectionCompletionPercent,
  customerDataSectionExpanded,
  setCustomerDataSectionExpanded,
  executorDataSectionExpanded,
  setExecutorDataSectionExpanded,
  managerDataSectionExpanded,
  setManagerDataSectionExpanded,
  customerPhonesReadonlyDisplay,
  estimateAppendixContractRef,
  contractEstimateObjectKey,
  estimateAttachGroupKey,
  setEstimateAttachGroupKey,
  estimatePresetToAttach,
  setEstimatePresetToAttach,
  attachEstimatePickMeta,
  attachableForSelectedGroup,
  attachableEstimatePresets,
  estimatePresets,
  estimateUsageById,
  draggingEstimatePresetId,
  setDraggingEstimatePresetId,
  selectedEstimateSections,
  contractDiscountPercentParsed,
  estimatePrintSheetRef,
  estimateTabHandlers,
  finalEstimateRooms,
  finalEstimateTotalAmount,
  finalEstimateTotalAfterDiscount,
  productSpecificationHandlers,
}: UsePackageDocumentEditorTabPropsOptions) {
  const dataTabProps = useMemo(
    (): PackageDataTabProps => ({
      form,
      contractAndEstimateLocked,
      isSuperAdmin,
      isProductDirectionPackage,
      contractObjectBlockFieldClassName,
      updateContract,
      updateObject,
      applyExecutorProfile,
      applySignatoryProfile,
      executorProfiles,
      signatoryProfiles,
      contractDateFieldHelp,
      workPeriodFieldHelp,
      discountFieldHelp,
      linkedCrmCustomerId,
      onCrmCustomerApplied,
      onCrmCustomerClear,
      onCrmError,
      productContractCostBreakdown,
      customerSectionCompletionPercent,
      executorSectionCompletionPercent,
      managerSectionCompletionPercent,
      customerDataSectionExpanded,
      setCustomerDataSectionExpanded,
      executorDataSectionExpanded,
      setExecutorDataSectionExpanded,
      managerDataSectionExpanded,
      setManagerDataSectionExpanded,
      customerPhonesReadonlyDisplay,
    }),
    [
      form,
      contractAndEstimateLocked,
      isSuperAdmin,
      isProductDirectionPackage,
      contractObjectBlockFieldClassName,
      updateContract,
      updateObject,
      applyExecutorProfile,
      applySignatoryProfile,
      executorProfiles,
      signatoryProfiles,
      contractDateFieldHelp,
      workPeriodFieldHelp,
      discountFieldHelp,
      linkedCrmCustomerId,
      onCrmCustomerApplied,
      onCrmCustomerClear,
      onCrmError,
      productContractCostBreakdown,
      customerSectionCompletionPercent,
      executorSectionCompletionPercent,
      managerSectionCompletionPercent,
      customerDataSectionExpanded,
      setCustomerDataSectionExpanded,
      executorDataSectionExpanded,
      setExecutorDataSectionExpanded,
      managerDataSectionExpanded,
      setManagerDataSectionExpanded,
      customerPhonesReadonlyDisplay,
    ]
  );

  const estimateTabProps = useMemo(
    (): PackageEstimateTabProps => ({
      form,
      contractAndEstimateLocked,
      isProductDirectionPackage,
      linkedCrmCustomerId,
      estimateAppendixContractRef,
      contractEstimateObjectKey,
      estimateAttachGroupKey,
      setEstimateAttachGroupKey,
      estimatePresetToAttach,
      setEstimatePresetToAttach,
      attachEstimatePickMeta,
      attachableForSelectedGroup,
      attachableEstimatePresets,
      estimatePresets,
      estimateUsageById,
      draggingEstimatePresetId,
      setDraggingEstimatePresetId,
      selectedEstimateSections,
      contractDiscountPercentParsed,
      estimatePrintSheetRef,
      ...estimateTabHandlers,
    }),
    [
      form,
      contractAndEstimateLocked,
      isProductDirectionPackage,
      linkedCrmCustomerId,
      estimateAppendixContractRef,
      contractEstimateObjectKey,
      estimateAttachGroupKey,
      setEstimateAttachGroupKey,
      estimatePresetToAttach,
      setEstimatePresetToAttach,
      attachEstimatePickMeta,
      attachableForSelectedGroup,
      attachableEstimatePresets,
      estimatePresets,
      estimateUsageById,
      draggingEstimatePresetId,
      setDraggingEstimatePresetId,
      selectedEstimateSections,
      contractDiscountPercentParsed,
      estimatePrintSheetRef,
      estimateTabHandlers,
    ]
  );

  const finalEstimateTabProps = useMemo(
    (): PackageFinalEstimateTabProps => ({
      contractNumberLabel: estimateAppendixContractRef.num,
      contractDateLabel: estimateAppendixContractRef.date,
      rooms: finalEstimateRooms,
      totalAmount: finalEstimateTotalAmount,
      totalAfterDiscount: finalEstimateTotalAfterDiscount,
      contractDiscountPercent: contractDiscountPercentParsed,
    }),
    [
      estimateAppendixContractRef.num,
      estimateAppendixContractRef.date,
      finalEstimateRooms,
      finalEstimateTotalAmount,
      finalEstimateTotalAfterDiscount,
      contractDiscountPercentParsed,
    ]
  );

  const specificationTabProps = useMemo(
    (): Omit<ProductSpecificationTabProps, 'packageKind' | 'packageId'> => ({
      contractNumberLabel: estimateAppendixContractRef.num,
      contractDateLabel: estimateAppendixContractRef.date,
      productSpecificationAmount: form.productSpecificationAmount,
      productSpecificationFileUrl: form.productSpecificationFileUrl,
      productSpecificationFileName: form.productSpecificationFileName,
      ...productSpecificationHandlers,
    }),
    [
      estimateAppendixContractRef.num,
      estimateAppendixContractRef.date,
      form.productSpecificationAmount,
      form.productSpecificationFileUrl,
      form.productSpecificationFileName,
      productSpecificationHandlers,
    ]
  );

  return {
    dataTabProps,
    estimateTabProps,
    finalEstimateTabProps,
    specificationTabProps,
  };
}
