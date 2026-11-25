'use client';

import type { Dispatch, DragEvent, SetStateAction } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdChrome from '../../../../styles/editor-chrome.module.css';
import type { PackageFormData } from '../../form/packageForm';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { PackageAddendumTabBarActions } from '../addendum/PackageAddendumTabBarActions';
import { PackageDocumentEditorTabBar } from './PackageDocumentEditorTabBar';

export type PackageDocumentEditorTabStripProps = {
  packageKind: ContractDocumentPackageKind;
  tabs: readonly PackageDocumentTabId[];
  activeTab: PackageDocumentTabId;
  /** «Счёт-заказ»/«Смета» и «Спецификация» только для просмотра (подписан/отказ). */
  signedDocsLocked: boolean;
  /** Договор подписан: на «Спецификации» можно прикреплять новые версии файла. */
  contractConcluded: boolean;
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

/** Панель вкладок редактора: внутри шапки, на её разделителе — как в разделе «Расчёты». */
export function PackageDocumentEditorTabStrip({
  packageKind,
  tabs,
  activeTab,
  signedDocsLocked,
  contractConcluded,
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
}: PackageDocumentEditorTabStripProps) {
  return (
    <div className={cdChrome.packageEditorTabStrip}>
      <PackageDocumentEditorTabBar
        packageKind={packageKind}
        tabs={tabs}
        activeTab={activeTab}
        signedDocsLocked={signedDocsLocked}
        contractConcluded={contractConcluded}
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
  );
}
