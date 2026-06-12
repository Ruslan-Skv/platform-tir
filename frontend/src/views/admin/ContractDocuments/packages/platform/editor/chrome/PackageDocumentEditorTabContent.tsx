'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDataTab from '../../../../styles/data-tab.module.css';
import type { usePackageAddendumEditor } from '../../hooks/addendum/usePackageAddendumEditor';
import type { useContractTemplateEditor } from '../../hooks/document/useContractTemplateEditor';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { PackageAddendumEditorPane } from '../addendum/PackageAddendumEditorPane';
import { PackageDataTab, type PackageDataTabProps } from '../dataTab/PackageDataTab';
import {
  PackageEstimateTab,
  type PackageEstimateTabProps,
} from '../estimateTab/PackageEstimateTab';
import {
  PackageFinalEstimateTab,
  type PackageFinalEstimateTabProps,
} from '../tabs/PackageFinalEstimateTab';
import {
  ProductSpecificationTab,
  type ProductSpecificationTabProps,
} from '../tabs/ProductSpecificationTab';
import { PackageTemplateEditorPane } from '../template/PackageTemplateEditorPane';

export type PackageDocumentEditorTabContentProps = {
  activeTab: PackageDocumentTabId;
  activeAddendumSlot: number | null;
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  contractAndEstimateLocked: boolean;
  renderedDoc: string | null;
  unsignedAddendumOrdinals: number[];
  isProductDirectionPackage: boolean;
  onOpenPackageHub: () => void;
  dataTabProps: PackageDataTabProps;
  estimateTabProps: PackageEstimateTabProps;
  finalEstimateTabProps: PackageFinalEstimateTabProps;
  specificationTabProps: Omit<ProductSpecificationTabProps, 'packageKind' | 'packageId'>;
  addendumEditor: ReturnType<typeof usePackageAddendumEditor>;
  excelMessage: string | null;
  contractTemplateEditor: ReturnType<typeof useContractTemplateEditor> | null;
};

/** Контент активной вкладки редактора пакета документов. */
export function PackageDocumentEditorTabContent({
  activeTab,
  activeAddendumSlot,
  packageKind,
  packageId,
  contractAndEstimateLocked,
  renderedDoc,
  unsignedAddendumOrdinals,
  isProductDirectionPackage,
  onOpenPackageHub,
  dataTabProps,
  estimateTabProps,
  finalEstimateTabProps,
  specificationTabProps,
  addendumEditor,
  excelMessage,
  contractTemplateEditor,
}: PackageDocumentEditorTabContentProps) {
  if (activeTab === 'data') {
    return <PackageDataTab {...dataTabProps} />;
  }

  if (activeTab === 'estimate') {
    return <PackageEstimateTab {...estimateTabProps} />;
  }

  if (activeTab === 'finalEstimate') {
    return <PackageFinalEstimateTab {...finalEstimateTabProps} />;
  }

  if (activeTab === 'specification') {
    return (
      <ProductSpecificationTab
        packageKind={packageKind}
        packageId={packageId}
        disabled={contractAndEstimateLocked}
        {...specificationTabProps}
      />
    );
  }

  return (
    <PackageTemplateEditorPane
      activeTab={activeTab}
      packageKind={packageKind}
      contractAndEstimateLocked={contractAndEstimateLocked}
      renderedDoc={renderedDoc ?? ''}
      excelMessage={excelMessage}
      contractTemplateEditor={contractTemplateEditor}
      unsignedAddendumBanner={
        activeAddendumSlot !== null && unsignedAddendumOrdinals.includes(activeAddendumSlot) ? (
          <div className={cdDataTab.packageAddendumUnsignedBanner} role="status">
            <strong>Д/с №{activeAddendumSlot} не отмечено как подписанное.</strong> Прикрепите
            расчёты и нажмите «Д/с №{activeAddendumSlot} подписано» ниже или в модалке{' '}
            <button
              type="button"
              className={cdDataTab.packageAddendumUnsignedBannerLink}
              onClick={onOpenPackageHub}
            >
              Оплаты и Управление договором
            </button>
            .
          </div>
        ) : null
      }
      addendumSlotContent={
        <PackageAddendumEditorPane
          activeAddendumSlot={activeAddendumSlot}
          isProductDirectionPackage={isProductDirectionPackage}
          addendumEditor={addendumEditor}
        />
      }
    />
  );
}
