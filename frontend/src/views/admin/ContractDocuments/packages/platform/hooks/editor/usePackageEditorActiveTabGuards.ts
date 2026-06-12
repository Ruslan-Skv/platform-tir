import { useEffect } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageFormData } from '../../form/packageForm';
import { isPackageQuestionnaireHubTabHiddenFromPackageEditor } from '../../hub/questionnaires/packageQuestionnaireHubTabs';
import { isPackageWorkOrderHubTabHiddenFromPackageEditor } from '../../hub/workOrders/packageWorkOrderHubTabs';
import { resolvePackageEditorVisibleTabs } from '../../tabs';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';

export type UsePackageEditorActiveTabGuardsOptions = {
  activeTab: PackageDocumentTabId;
  setActiveTab: (tab: PackageDocumentTabId) => void;
  packageKind: ContractDocumentPackageKind;
  editorTabOrder: PackageDocumentTabId[];
  addendumSlotCount: PackageFormData['addendumSlotCount'];
};

/** Keeps `activeTab` on a valid, visible editor tab as flow state and tab order change. */
export function usePackageEditorActiveTabGuards({
  activeTab,
  setActiveTab,
  packageKind,
  editorTabOrder,
  addendumSlotCount,
}: UsePackageEditorActiveTabGuardsOptions): void {
  useEffect(() => {
    if (activeTab === 'payments') setActiveTab('data');
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    if (!isPackageWorkOrderHubTabHiddenFromPackageEditor(activeTab)) return;
    setActiveTab('estimate');
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    if (!isPackageQuestionnaireHubTabHiddenFromPackageEditor(activeTab)) return;
    setActiveTab('contract');
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    const visible = resolvePackageEditorVisibleTabs({
      tabOrder: editorTabOrder,
      packageKind,
      addendumSlotCount,
    });
    if (!visible.includes(activeTab)) setActiveTab('data');
  }, [activeTab, editorTabOrder, packageKind, addendumSlotCount, setActiveTab]);

  useEffect(() => {
    const m = /^addendum(\d+)$/.exec(activeTab);
    if (!m) return;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= addendumSlotCount) return;
    setActiveTab(
      addendumSlotCount > 0 ? (`addendum${addendumSlotCount}` as PackageDocumentTabId) : 'contract'
    );
  }, [activeTab, addendumSlotCount, setActiveTab]);

  useEffect(() => {
    if ((activeTab as string) === 'cashOrder') setActiveTab('contract');
  }, [activeTab, setActiveTab]);
}
