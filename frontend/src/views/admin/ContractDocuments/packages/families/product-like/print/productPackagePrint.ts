import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import {
  type PrintDocumentOptions,
  pickPrintMarginFooterNames,
  printDocumentHtml,
} from '../../../../core/printDocument';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { isPackageActA4PreviewTab } from '../../../platform/tabs/packageActPrintTabs';
import {
  type PackageDocumentTabId,
  isPackageAddendumTab,
} from '../../../platform/tabs/packageDocumentTabs';

/** Класс обёртки сметы/спецификации/счёт-заказа при печати пакета «Окна». */
export const WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS = 'windowsPackageUnifiedPrint';

const ESTIMATE_SHEET_PRINT_TARGETS = new Set([
  'estimate-sheet',
  'final-estimate-sheet',
  'work-order-sheet',
]);

export function isWindowsPackageEstimateSheetPrintTarget(targetId: string): boolean {
  return ESTIMATE_SHEET_PRINT_TARGETS.has(targetId);
}

/** Вкладки редактора, для которых в пакете «Окна»/«Двери» включается единый компактный профиль печати. */
export function shouldUseWindowsPackageCompactPrint(
  packageKind: ContractDocumentPackageKind,
  tab: string
): boolean {
  if (!isProductDirectionPackageKind(packageKind)) return false;
  if (tab === 'data' || tab === 'payments' || tab === 'interactiveFinalEstimate') return false;
  if (tab === 'questionnaire1' || tab === 'questionnaire2') return false;
  return (
    tab === 'contract' ||
    tab === 'estimate' ||
    tab === 'specification' ||
    tab === 'finalWorkOrder' ||
    tab === 'memo' ||
    tab === 'productionLog' ||
    isPackageActA4PreviewTab(tab) ||
    isPackageAddendumTab(tab) ||
    tab === 'workOrder' ||
    /^workOrderAddendum[1-5]$/.test(tab)
  );
}

export function pickWindowsPackagePrintDocumentOptions(
  tab: string,
  formData: unknown
): PrintDocumentOptions {
  const base: PrintDocumentOptions = {
    contractCompact: true,
    windowsPackagePrint: true,
  };
  if (tab === 'contract') {
    return { ...base, marginFooter: pickPrintMarginFooterNames(formData) };
  }
  return base;
}

/** Обёртка HTML листа сметы/спецификации для стилей `printDocument` (без CSS-модулей). */
export function wrapEstimateSheetHtmlForWindowsPrint(innerHtml: string): string {
  return `<div class="docPrint ${WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS}"><div class="estimateA4DocPrintEmbed estimateA4Sheet">${innerHtml}</div></div>`;
}

export function printWindowsEstimateSheetFromDom(
  target: Element,
  documentTitle: string,
  options?: PrintDocumentOptions
): void {
  printDocumentHtml(
    wrapEstimateSheetHtmlForWindowsPrint(target.innerHTML),
    documentTitle,
    options ?? pickWindowsPackagePrintDocumentOptions('estimate', null)
  );
}

/** Печать листа сметы/счёт-заказа из семантического HTML (как «Смета работ» в «Ремонт»). */
export function printWindowsEstimateSheetHtml(
  innerHtml: string,
  documentTitle: string,
  options?: PrintDocumentOptions
): void {
  printDocumentHtml(
    innerHtml,
    documentTitle,
    options ?? pickWindowsPackagePrintDocumentOptions('estimate', null)
  );
}

export function resolvePackageEditorPrintOptions(
  packageKind: ContractDocumentPackageKind,
  tab: PackageDocumentTabId,
  formData: unknown
): PrintDocumentOptions | undefined {
  if (!shouldUseWindowsPackageCompactPrint(packageKind, tab)) return undefined;
  return pickWindowsPackagePrintDocumentOptions(tab, formData);
}
