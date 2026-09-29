'use client';

import type { ReactNode } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { PackageLockNotice, packageLockNoticeMessage } from '../shared/packageLockNoticeUi';
import { PackageTemplateDocumentPreview } from './PackageTemplateDocumentPreview';

export type PackageTemplateEditorPaneProps = {
  activeTab: PackageDocumentTabId;
  packageKind: ContractDocumentPackageKind;
  /** Полная блокировка (только «Отказ»): шаблон договора доступен для просмотра. */
  packageReadOnly: boolean;
  renderedDoc: string;
  /** Баннер неподписанного Д/с (null — не показывать). */
  unsignedAddendumBanner: ReactNode;
  /** Контент вкладки Д/с (смета, спецификация окон и т.д.). */
  addendumSlotContent: ReactNode;
};

export function PackageTemplateEditorPane({
  activeTab,
  packageKind,
  packageReadOnly,
  renderedDoc,
  unsignedAddendumBanner,
  addendumSlotContent,
}: PackageTemplateEditorPaneProps) {
  return (
    <>
      {unsignedAddendumBanner}
      {addendumSlotContent}
      {activeTab === 'contract' && packageReadOnly ? (
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
