import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { getPackageDirectionConfig } from '../../config';
import {
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TAB_LABELS_SHORT,
  type RepairDocumentTabId,
} from '../../directions/repair/documents/repairDocumentTabs';

export function packageEditorTabLabel(
  kind: ContractDocumentPackageKind,
  id: RepairDocumentTabId,
  short = false
): string {
  const config = getPackageDirectionConfig(kind);
  const override = config.tabLabelOverrides[id];
  if (override) {
    return short ? override.short : override.full;
  }
  return short ? REPAIR_DOCUMENT_TAB_LABELS_SHORT[id] : REPAIR_DOCUMENT_TAB_LABELS[id];
}
