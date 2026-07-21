'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import { isPackageTemplateA4SheetTab } from '../../hooks/document/usePackageRenderedDocument';
import {
  isPackageActTwinOneSheetTab,
  wrapPackageActTwinCopiesOnOnePageHtml,
} from '../../tabs/packageActPrintTabs';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';

export type PackageTemplateDocumentPreviewProps = {
  activeTab: PackageDocumentTabId;
  packageKind: ContractDocumentPackageKind;
  renderedDoc: string;
};

export function PackageTemplateDocumentPreview({
  activeTab,
  packageKind,
  renderedDoc,
}: PackageTemplateDocumentPreviewProps) {
  const landscapeSheet = packageKind === 'BLINDS' && activeTab === 'deliveryNote';

  if (isPackageTemplateA4SheetTab(activeTab)) {
    const sheetClass = `${cdDocPreview.estimateA4Sheet}${
      landscapeSheet ? ` ${cdDocPreview.estimateA4SheetLandscape}` : ''
    }`;
    return (
      <div className={cdDocPreview.estimateA4Wrap}>
        {isPackageActTwinOneSheetTab(activeTab, packageKind) ? (
          <article
            className={`${sheetClass} ${cdDocPreview.packageActTwinSheet}`}
            aria-label="Два экземпляра акта на одном листе"
          >
            <div
              className={cdDocPreview.contractA4Preview}
              dangerouslySetInnerHTML={{
                __html: wrapPackageActTwinCopiesOnOnePageHtml(renderedDoc),
              }}
            />
          </article>
        ) : (
          <article
            className={sheetClass}
            data-page-orientation={landscapeSheet ? 'landscape' : 'portrait'}
          >
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
