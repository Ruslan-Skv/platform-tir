import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentEditorTabContentProps } from '../editor/PackageDocumentEditorTabContent';
import { resolvePackageEditorVisibleTabs } from '../tabs';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';
import type { useContractTemplateEditor } from './useContractTemplateEditor';
import type { usePackageAddendumEditor } from './usePackageAddendumEditor';
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
  excelMessage: string | null;
  contractTemplateEditor: ReturnType<typeof useContractTemplateEditor>;
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
  excelMessage,
  contractTemplateEditor,
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
      }),
    [editorTabOrder, packageKind, addendumSlotCount]
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
      excelMessage,
      contractTemplateEditor,
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
      excelMessage,
      contractTemplateEditor,
      editorTabProps,
    ]
  );

  return { orderedVisibleTabs, tabContentProps };
}
