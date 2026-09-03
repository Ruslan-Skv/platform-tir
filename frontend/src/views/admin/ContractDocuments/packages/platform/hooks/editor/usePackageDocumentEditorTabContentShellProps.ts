import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentEditorTabContentProps } from '../../editor/chrome/PackageDocumentEditorTabContent';
import { resolvePackageEditorVisibleTabs } from '../../tabs';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import type { usePackageAddendumEditor } from '../addendum/usePackageAddendumEditor';
import type { usePackageDocumentEditorTabProps } from './usePackageDocumentEditorTabProps';

export type UsePackageDocumentEditorTabContentShellPropsOptions = {
  activeTab: PackageDocumentTabId;
  activeAddendumSlot: number | null;
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  contractAndEstimateLocked: boolean;
  renderedDoc: string | null;
  unsignedAddendumOrdinals: number[];
  isProductDirectionPackage: boolean;
  onOpenPackageHub: () => void;
  addendumEditor: ReturnType<typeof usePackageAddendumEditor>;
  editorTabProps: ReturnType<typeof usePackageDocumentEditorTabProps>;
  editorTabOrder: PackageDocumentTabId[];
  addendumSlotCount: number;
};

export function usePackageDocumentEditorTabContentShellProps({
  activeTab,
  activeAddendumSlot,
  packageKind,
  packageId,
  contractAndEstimateLocked,
  renderedDoc,
  unsignedAddendumOrdinals,
  isProductDirectionPackage,
  onOpenPackageHub,
  addendumEditor,
  editorTabProps,
  editorTabOrder,
  addendumSlotCount,
}: UsePackageDocumentEditorTabContentShellPropsOptions) {
  const orderedVisibleTabs = useMemo(
    () =>
      resolvePackageEditorVisibleTabs({
        tabOrder: editorTabOrder,
        packageKind,
        addendumSlotCount,
        furnitureMontageEnabled:
          editorTabProps.dataTabProps.form.furniture?.montage?.enabled === true,
        furnitureAppliancesEnabled:
          editorTabProps.dataTabProps.form.furniture?.appliances?.enabled === true,
      }),
    [
      editorTabOrder,
      packageKind,
      addendumSlotCount,
      editorTabProps.dataTabProps.form.furniture?.montage?.enabled,
      editorTabProps.dataTabProps.form.furniture?.appliances?.enabled,
    ]
  );

  const tabContentProps = useMemo(
    (): PackageDocumentEditorTabContentProps => ({
      activeTab,
      activeAddendumSlot,
      packageKind,
      packageId,
      contractAndEstimateLocked,
      renderedDoc,
      unsignedAddendumOrdinals,
      isProductDirectionPackage,
      onOpenPackageHub,
      addendumEditor,
      form: editorTabProps.dataTabProps.form,
      setForm: editorTabProps.dataTabProps.setForm,
      touchPackageData: editorTabProps.dataTabProps.touchPackageData,
      ...editorTabProps,
    }),
    [
      activeTab,
      activeAddendumSlot,
      packageKind,
      packageId,
      contractAndEstimateLocked,
      renderedDoc,
      unsignedAddendumOrdinals,
      isProductDirectionPackage,
      onOpenPackageHub,
      addendumEditor,
      editorTabProps,
    ]
  );

  return { orderedVisibleTabs, tabContentProps };
}
