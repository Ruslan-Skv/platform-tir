'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDataTab from '../../../../styles/data-tab.module.css';
import { isFurnitureLikePackageKind } from '../../../config';
import { FurnitureAppliancesListTabContent } from '../../../directions/furniture/FurnitureAppliancesListTabContent';
import { FurnitureDocLegSwitcher } from '../../../directions/furniture/FurnitureDocLegSwitcher';
import { FurnitureMontageEstimateTabContent } from '../../../directions/furniture/FurnitureMontageEstimateTabContent';
import { FurnitureWorkOrderTabContent } from '../../../directions/furniture/FurnitureWorkOrderTabContent';
import type { FurnitureAppliancesDocs } from '../../../directions/furniture/furnitureAppliancesDocs';
import { furnitureAppliancesLinesTotal } from '../../../directions/furniture/furnitureAppliancesDocs';
import type { FurnitureActiveDocLeg } from '../../../directions/furniture/furnitureLegs';
import type { FurnitureMontageDocs } from '../../../directions/furniture/furnitureMontageDocs';
import type { PackageFormData } from '../../form/packageForm';
import type { usePackageAddendumEditor } from '../../hooks/addendum/usePackageAddendumEditor';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { PackageAddendumEditorPane } from '../addendum/PackageAddendumEditorPane';
import { PackageDataTab, type PackageDataTabProps } from '../dataTab/PackageDataTab';
import { PackageDrawingsTab } from '../drawingsTab/PackageDrawingsTab';
import {
  PackageEstimateTab,
  type PackageEstimateTabProps,
} from '../estimateTab/PackageEstimateTab';
import { PackageMeasurementTab } from '../measurementTab/PackageMeasurementTab';
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
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
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
  form,
  setForm,
  touchPackageData,
}: PackageDocumentEditorTabContentProps) {
  const isFurniture = isFurnitureLikePackageKind(packageKind);

  const setActiveDocLeg = (leg: FurnitureActiveDocLeg) => {
    setForm((prev) => ({
      ...prev,
      furniture: { ...prev.furniture, activeDocLeg: leg },
    }));
    touchPackageData();
  };

  const onMontageDocsChange = (montageDocs: FurnitureMontageDocs) => {
    setForm((prev) => {
      const total = montageDocs.estimateLines.reduce((sum, line) => {
        const qty = Number.parseFloat(String(line.quantity).replace(/\s/g, '').replace(',', '.'));
        const price = Number.parseFloat(
          String(line.unitPrice).replace(/\s/g, '').replace(',', '.')
        );
        if (Number.isFinite(qty) && Number.isFinite(price)) {
          return sum + Math.round(qty * price * 100) / 100;
        }
        return sum;
      }, 0);
      const totalStr = total > 0 ? String(total) : prev.furniture.montage.contract.totalAmount;
      const recommended =
        total > 0
          ? String(Math.round(total * 0.7 * 100) / 100)
          : prev.furniture.montage.contract.recommendedPrepayment;
      return {
        ...prev,
        furniture: {
          ...prev.furniture,
          montageDocs,
          montage: {
            ...prev.furniture.montage,
            contract: {
              ...prev.furniture.montage.contract,
              totalAmount: totalStr,
              recommendedPrepayment: recommended,
            },
          },
        },
      };
    });
    touchPackageData();
  };

  const onAppliancesDocsChange = (appliancesDocs: FurnitureAppliancesDocs) => {
    setForm((prev) => {
      const total = furnitureAppliancesLinesTotal(appliancesDocs.lines);
      const totalStr = total > 0 ? String(total) : prev.furniture.appliances.contract.totalAmount;
      /** Excel «Дог Тех»: оплата 100% при заключении. */
      const fullPay =
        total > 0
          ? String(Math.round(total * 100) / 100)
          : prev.furniture.appliances.contract.recommendedPrepayment;
      return {
        ...prev,
        furniture: {
          ...prev.furniture,
          appliancesDocs,
          appliances: {
            ...prev.furniture.appliances,
            contract: {
              ...prev.furniture.appliances.contract,
              totalAmount: totalStr,
              recommendedPrepayment: fullPay,
              prepaymentAmount: fullPay,
              workPeriod: prev.furniture.appliances.contract.workPeriod || '70',
              paymentBasis:
                prev.furniture.appliances.contract.paymentBasis ||
                '100% от стоимости товара при заключении договора',
            },
          },
        },
      };
    });
    touchPackageData();
  };

  const furnitureDocSwitcher =
    isFurniture && (form.furniture.montage.enabled || form.furniture.appliances.enabled) ? (
      <FurnitureDocLegSwitcher
        montageEnabled={form.furniture.montage.enabled}
        appliancesEnabled={form.furniture.appliances.enabled}
        activeDocLeg={form.furniture.activeDocLeg}
        locked={contractAndEstimateLocked}
        onChange={setActiveDocLeg}
      />
    ) : null;

  if (activeTab === 'data') {
    return <PackageDataTab {...dataTabProps} />;
  }

  if (activeTab === 'measurement') {
    return (
      <PackageMeasurementTab
        packageId={packageId}
        form={form}
        linkedCrmCustomerId={dataTabProps.linkedCrmCustomerId}
        setForm={setForm}
        touchPackageData={touchPackageData}
      />
    );
  }

  if (activeTab === 'drawings') {
    return (
      <PackageDrawingsTab
        packageId={packageId}
        form={form}
        setForm={setForm}
        touchPackageData={touchPackageData}
      />
    );
  }

  if (activeTab === 'estimate') {
    if (isFurniture) {
      return (
        <>
          {furnitureDocSwitcher}
          <FurnitureMontageEstimateTabContent
            docs={form.furniture.montageDocs}
            contractNumberLabel={form.furniture.montage.contract.number}
            disabled={contractAndEstimateLocked}
            onChange={onMontageDocsChange}
          />
        </>
      );
    }
    return <PackageEstimateTab {...estimateTabProps} />;
  }

  if (activeTab === 'workOrder' && isFurniture) {
    return (
      <>
        {furnitureDocSwitcher}
        <FurnitureWorkOrderTabContent
          docs={form.furniture.montageDocs}
          manufactureContractNumber={form.furniture.manufacture.contract.number}
          montageContractNumber={form.furniture.montage.contract.number}
          disabled={contractAndEstimateLocked}
          onChange={onMontageDocsChange}
        />
      </>
    );
  }

  if (activeTab === 'deliveryNote' && isFurniture) {
    return (
      <>
        {furnitureDocSwitcher}
        <FurnitureAppliancesListTabContent
          docs={form.furniture.appliancesDocs}
          contractNumberLabel={form.furniture.appliances.contract.number}
          disabled={contractAndEstimateLocked}
          onChange={onAppliancesDocsChange}
        />
      </>
    );
  }

  if (activeTab === 'finalEstimate') {
    return <PackageFinalEstimateTab {...finalEstimateTabProps} />;
  }

  if (activeTab === 'specification') {
    return (
      <>
        {furnitureDocSwitcher}
        <ProductSpecificationTab
          packageKind={packageKind}
          packageId={packageId}
          disabled={contractAndEstimateLocked}
          {...specificationTabProps}
        />
      </>
    );
  }

  return (
    <>
      {furnitureDocSwitcher}
      <PackageTemplateEditorPane
        activeTab={activeTab}
        packageKind={packageKind}
        contractAndEstimateLocked={contractAndEstimateLocked}
        renderedDoc={renderedDoc ?? ''}
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
    </>
  );
}
