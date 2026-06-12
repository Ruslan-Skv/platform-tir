'use client';

import type { Dispatch, DragEvent, SetStateAction } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractDocumentPackageStatus,
} from '@/shared/api/admin-contract-document-packages';

import cdBase from '../../../../styles/base.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import type { PackageFormData } from '../../form/packageForm';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { PackageAddendumTabBarActions } from '../addendum/PackageAddendumTabBarActions';
import { PackageDocumentEditorRefusedBanner } from './PackageDocumentEditorRefusedBanner';
import { PackageDocumentEditorTabBar } from './PackageDocumentEditorTabBar';

export type PackageDocumentEditorChromeProps = {
  packageFlowStatus: ContractDocumentPackageStatus;
  refusalReason: string;
  error: string | null;
  excelMessage: string | null;
  packageKind: ContractDocumentPackageKind;
  tabs: readonly PackageDocumentTabId[];
  activeTab: PackageDocumentTabId;
  contractAndEstimateLocked: boolean;
  unsignedAddendumOrdinals: number[];
  signedAddendumOrdinals: number[];
  form: PackageFormData;
  addendumTabAddDisabled: boolean;
  addendumTabAddTitle: string;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  setActiveTab: (tab: PackageDocumentTabId) => void;
  touchPackageData: () => void;
  onTabActivate: (id: PackageDocumentTabId) => void;
  onTabDragStart: (id: PackageDocumentTabId, event: DragEvent<HTMLButtonElement>) => void;
  onTabDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onTabDrop: (id: PackageDocumentTabId) => (event: DragEvent<HTMLButtonElement>) => void;
};

export function PackageDocumentEditorChrome({
  packageFlowStatus,
  refusalReason,
  error,
  excelMessage,
  packageKind,
  tabs,
  activeTab,
  contractAndEstimateLocked,
  unsignedAddendumOrdinals,
  signedAddendumOrdinals,
  form,
  addendumTabAddDisabled,
  addendumTabAddTitle,
  setForm,
  setActiveTab,
  touchPackageData,
  onTabActivate,
  onTabDragStart,
  onTabDragOver,
  onTabDrop,
}: PackageDocumentEditorChromeProps) {
  return (
    <>
      {packageFlowStatus === 'REFUSED' ? (
        <PackageDocumentEditorRefusedBanner refusalReason={refusalReason} />
      ) : null}
      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {excelMessage ? <p className={cdTemplates.hint}>{excelMessage}</p> : null}
      <div className={cdChrome.packageTabBarRow}>
        <div
          className={`${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.packageTabBarCompact} ${cdBase.blockTabs} ${cdBase.packageTabBarCompact}`}
        >
          <PackageDocumentEditorTabBar
            packageKind={packageKind}
            tabs={tabs}
            activeTab={activeTab}
            contractAndEstimateLocked={contractAndEstimateLocked}
            unsignedAddendumOrdinals={unsignedAddendumOrdinals}
            signedAddendumOrdinals={signedAddendumOrdinals}
            onTabActivate={onTabActivate}
            onTabDragStart={onTabDragStart}
            onTabDragOver={onTabDragOver}
            onTabDrop={onTabDrop}
          />
          <PackageAddendumTabBarActions
            form={form}
            activeTab={activeTab}
            addDisabled={addendumTabAddDisabled}
            addTitle={addendumTabAddTitle}
            setForm={setForm}
            setActiveTab={setActiveTab}
            touchPackageData={touchPackageData}
          />
        </div>
      </div>
    </>
  );
}
