'use client';

import type { ReactNode } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { useContractTemplateEditor } from '../../hooks/document/useContractTemplateEditor';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { PackageLockNotice, packageLockNoticeMessage } from '../shared/packageLockNoticeUi';
import { PackageContractTemplateEditorPane } from './PackageContractTemplateEditorPane';
import { PackageTemplateDocumentPreview } from './PackageTemplateDocumentPreview';

export type PackageTemplateEditorPaneProps = {
  activeTab: PackageDocumentTabId;
  packageKind: ContractDocumentPackageKind;
  contractAndEstimateLocked: boolean;
  renderedDoc: string;
  excelMessage: string | null;
  contractTemplateEditor: ReturnType<typeof useContractTemplateEditor> | null;
  /** Баннер неподписанного Д/с (null — не показывать). */
  unsignedAddendumBanner: ReactNode;
  /** Контент вкладки Д/с (смета, спецификация окон и т.д.). */
  addendumSlotContent: ReactNode;
};

export function PackageTemplateEditorPane({
  activeTab,
  packageKind,
  contractAndEstimateLocked,
  renderedDoc,
  excelMessage,
  contractTemplateEditor,
  unsignedAddendumBanner,
  addendumSlotContent,
}: PackageTemplateEditorPaneProps) {
  const showContractTemplateEditor =
    activeTab === 'contract' && contractTemplateEditor?.canEdit === true;

  return (
    <>
      {unsignedAddendumBanner}
      {addendumSlotContent}
      {activeTab === 'contract' && contractAndEstimateLocked ? (
        <PackageLockNotice>{packageLockNoticeMessage('contract')}</PackageLockNotice>
      ) : null}
      {showContractTemplateEditor && contractTemplateEditor ? (
        <PackageContractTemplateEditorPane
          editor={contractTemplateEditor}
          renderedDoc={renderedDoc}
          excelMessage={excelMessage}
        />
      ) : (
        <PackageTemplateDocumentPreview
          activeTab={activeTab}
          packageKind={packageKind}
          renderedDoc={renderedDoc}
        />
      )}
    </>
  );
}
