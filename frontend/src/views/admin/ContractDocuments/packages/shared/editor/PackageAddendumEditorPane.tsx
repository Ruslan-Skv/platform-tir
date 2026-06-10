'use client';

import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import { RepairAddendumEstimateBlock } from '../../directions/repair/estimates/RepairAddendumEstimateBlock';
import { WindowsAddendumTab } from '../../directions/windows/WindowsAddendumTab';
import type { usePackageAddendumEditor } from '../hooks/usePackageAddendumEditor';

const ADDENDUM_LOCKED_HINT = `${cdDocPreview.hint} ${cdTemplates.hint} ${cdEstimateTab.estimateTabHint}`;

export type PackageAddendumEditorPaneProps = {
  activeAddendumSlot: number | null;
  isProductDirectionPackage: boolean;
  addendumEditor: ReturnType<typeof usePackageAddendumEditor>;
};

export function PackageAddendumEditorPane({
  activeAddendumSlot,
  isProductDirectionPackage,
  addendumEditor,
}: PackageAddendumEditorPaneProps) {
  const { estimateBlockProps, windowsAddendumTabProps, lockedHint } = addendumEditor;

  if (activeAddendumSlot === null) return null;

  if (lockedHint) {
    return <p className={ADDENDUM_LOCKED_HINT}>{lockedHint}</p>;
  }

  if (isProductDirectionPackage && windowsAddendumTabProps) {
    return <WindowsAddendumTab {...windowsAddendumTabProps} />;
  }

  if (estimateBlockProps) {
    return <RepairAddendumEstimateBlock {...estimateBlockProps} />;
  }

  return null;
}
