import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { pickPrintMarginFooterNames, printDocumentHtml } from '../../../core/printDocument';
import {
  WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS,
  pickWindowsPackagePrintDocumentOptions,
  printWindowsEstimateSheetFromDom,
  printWindowsEstimateSheetHtml,
  resolvePackageEditorPrintOptions,
  shouldUseWindowsPackageCompactPrint,
} from '../../families/product-like/print/productPackagePrint';
import { buildEstimateSheetPrintHtml } from '../estimates/packageEstimateDocPrintEmbedHtml';
import type { EstimateEmbedSection } from '../estimates/packageEstimateDocPrintEmbedHtml';
import type { PackageFormData } from '../form/packageForm';
import {
  isPackageActA4PreviewTab,
  isPackageActTwinOneSheetTab,
  wrapPackageActTwinCopiesOnOnePageHtml,
} from '../tabs/packageActPrintTabs';
import {
  PACKAGE_DOCUMENT_TAB_LABELS,
  type PackageDocumentTabId,
} from '../tabs/packageDocumentTabs';
import { packageEditorTabLabel } from '../tabs/packageTabLabel';

const BODY_PRINT_ESTIMATE_CLASS = 'body-print-estimate-sheet';

export type ExecutePackageDocumentPrintInput = {
  packageKind: ContractDocumentPackageKind;
  activeTab: PackageDocumentTabId;
  form: PackageFormData;
  renderedDoc: string | null;
  isProductDirectionPackage: boolean;
  estimateAppendixContractRef: { num: string; date: string };
  selectedEstimateSections: EstimateEmbedSection[];
  directorName: string;
  customerFullName: string;
};

/** Печать активной вкладки редактора пакета документов. */
export function executePackageDocumentPrint(input: ExecutePackageDocumentPrintInput): void {
  const {
    packageKind,
    activeTab,
    form,
    renderedDoc,
    isProductDirectionPackage,
    estimateAppendixContractRef,
    selectedEstimateSections,
    directorName,
    customerFullName,
  } = input;

  const windowsPrintOptions = resolvePackageEditorPrintOptions(packageKind, activeTab, form);

  if (
    activeTab === 'estimate' ||
    activeTab === 'finalWorkOrder' ||
    activeTab === 'finalEstimate' ||
    activeTab === 'specification'
  ) {
    const printTargetId =
      activeTab === 'estimate'
        ? 'estimate-sheet'
        : activeTab === 'finalWorkOrder'
          ? 'work-order-sheet'
          : 'final-estimate-sheet';
    const target = document.querySelector(`[data-print-target='${printTargetId}']`);
    if (!target) return;

    if (shouldUseWindowsPackageCompactPrint(packageKind, activeTab)) {
      const printOpts =
        windowsPrintOptions ?? pickWindowsPackagePrintDocumentOptions(activeTab, form);
      if (activeTab === 'estimate') {
        const sheetHtml = buildEstimateSheetPrintHtml({
          variant: 'windows',
          appendixNumber: 2,
          contractNum: estimateAppendixContractRef.num,
          contractDate: estimateAppendixContractRef.date,
          sections: selectedEstimateSections,
          snapshot: form.estimate.snapshot,
          directorName,
          customerFullName,
          contractDiscountPercent: form.contract.discountPercent,
          docPrintRootClass: WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS,
        });
        printWindowsEstimateSheetHtml(
          sheetHtml,
          packageEditorTabLabel(packageKind, activeTab),
          printOpts
        );
        return;
      }
      printWindowsEstimateSheetFromDom(
        target,
        packageEditorTabLabel(packageKind, activeTab),
        printOpts
      );
      return;
    }

    document.body.classList.add(BODY_PRINT_ESTIMATE_CLASS);
    const cleanup = (): void => {
      document.body.classList.remove(BODY_PRINT_ESTIMATE_CLASS);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
    window.print();
    return;
  }

  if (activeTab === 'interactiveFinalEstimate') return;
  if (!renderedDoc) return;

  const actTwinOnOneSheet = isPackageActTwinOneSheetTab(activeTab, packageKind);
  const printTitle =
    activeTab === 'contract' || actTwinOnOneSheet
      ? ''
      : isProductDirectionPackage
        ? packageEditorTabLabel(packageKind, activeTab)
        : PACKAGE_DOCUMENT_TAB_LABELS[activeTab];
  const printBody = actTwinOnOneSheet
    ? wrapPackageActTwinCopiesOnOnePageHtml(renderedDoc)
    : renderedDoc;
  const contractCompactPrint =
    windowsPrintOptions != null ||
    activeTab === 'contract' ||
    isPackageActA4PreviewTab(activeTab) ||
    activeTab === 'productionLog' ||
    activeTab === 'memo';

  printDocumentHtml(
    printBody,
    printTitle,
    windowsPrintOptions ??
      (activeTab === 'contract'
        ? { marginFooter: pickPrintMarginFooterNames(form), contractCompact: true }
        : contractCompactPrint
          ? { contractCompact: true }
          : {})
  );
}
