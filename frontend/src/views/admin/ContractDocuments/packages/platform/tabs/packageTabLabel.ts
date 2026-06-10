import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { getPackageDirectionConfig } from '../../config';
import {
  PACKAGE_DOCUMENT_TAB_LABELS,
  PACKAGE_DOCUMENT_TAB_LABELS_SHORT,
  type PackageDocumentTabId,
} from './packageDocumentTabs';

export function packageEditorTabLabel(
  kind: ContractDocumentPackageKind,
  id: PackageDocumentTabId,
  short = false
): string {
  const config = getPackageDirectionConfig(kind);
  const override = config.tabLabelOverrides[id];
  if (override) {
    return short ? override.short : override.full;
  }
  return short ? PACKAGE_DOCUMENT_TAB_LABELS_SHORT[id] : PACKAGE_DOCUMENT_TAB_LABELS[id];
}
