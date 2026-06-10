'use client';

import type { ReactNode } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { RepairDocumentTabId } from '../../directions/repair/documents/repairDocumentTemplates';
import { PackageTemplateDocumentPreview } from './PackageTemplateDocumentPreview';
import { PackageLockNotice, packageLockNoticeMessage } from './packageLockNoticeUi';

export type PackageTemplateEditorPaneProps = {
  activeTab: RepairDocumentTabId;
  packageKind: ContractDocumentPackageKind;
  contractAndEstimateLocked: boolean;
  renderedDoc: string;
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
  unsignedAddendumBanner,
  addendumSlotContent,
}: PackageTemplateEditorPaneProps) {
  return (
    <>
      {unsignedAddendumBanner}
      {addendumSlotContent}
      {activeTab === 'contract' && contractAndEstimateLocked ? (
        <PackageLockNotice>{packageLockNoticeMessage('contract')}</PackageLockNotice>
      ) : null}
      <PackageTemplateDocumentPreview
        activeTab={activeTab}
        packageKind={packageKind}
        renderedDoc={renderedDoc}
      />
    </>
  );
}
