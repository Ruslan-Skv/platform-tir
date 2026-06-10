'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import {
  isRepairActTwinOneSheetTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from '../../directions/repair/documents/repairActTwinCopiesOnOnePageHtml';
import type { RepairDocumentTabId } from '../../directions/repair/documents/repairDocumentTemplates';
import { isPackageTemplateA4SheetTab } from '../hooks/usePackageRenderedDocument';

export type PackageTemplateDocumentPreviewProps = {
  activeTab: RepairDocumentTabId;
  packageKind: ContractDocumentPackageKind;
  renderedDoc: string;
};

export function PackageTemplateDocumentPreview({
  activeTab,
  packageKind,
  renderedDoc,
}: PackageTemplateDocumentPreviewProps) {
  if (isPackageTemplateA4SheetTab(activeTab)) {
    return (
      <div className={cdDocPreview.estimateA4Wrap}>
        {isRepairActTwinOneSheetTab(activeTab, packageKind) ? (
          <article
            className={`${cdDocPreview.estimateA4Sheet} ${cdDocPreview.repairActTwinSheet}`}
            aria-label="Два экземпляра акта на одном листе"
          >
            <div
              className={cdDocPreview.contractA4Preview}
              dangerouslySetInnerHTML={{
                __html: wrapRepairActTwinCopiesOnOnePageHtml(renderedDoc),
              }}
            />
          </article>
        ) : (
          <article className={cdDocPreview.estimateA4Sheet}>
            <div
              className={cdDocPreview.contractA4Preview}
              dangerouslySetInnerHTML={{ __html: renderedDoc }}
            />
          </article>
        )}
      </div>
    );
  }

  return (
    <div className={cdEstimateTab.docPane}>
      <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
    </div>
  );
}
