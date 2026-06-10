'use client';

import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import { ProductAddendumTab } from '../../families/product-like/addendum/ProductAddendumTab';
import type { usePackageAddendumEditor } from '../hooks/usePackageAddendumEditor';
import { PackageAddendumEstimateBlock } from './PackageAddendumEstimateBlock';
import attachStyles from './PackageEstimateAttach.module.css';

const ADDENDUM_LOCKED_HINT = `${cdDocPreview.hint} ${cdTemplates.hint} ${attachStyles.estimateTabHint}`;

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
    return <ProductAddendumTab {...windowsAddendumTabProps} />;
  }

  if (estimateBlockProps) {
    return <PackageAddendumEstimateBlock {...estimateBlockProps} />;
  }

  return null;
}
