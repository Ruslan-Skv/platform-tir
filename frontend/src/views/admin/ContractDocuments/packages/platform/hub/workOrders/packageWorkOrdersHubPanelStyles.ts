import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdInteractiveEstimate from '../../../../styles/interactive-estimate.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';

export const WO_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact}`;
export const WO_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
export const WO_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
export const WO_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
export const WO_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
export const WO_SECTION_TITLE = cdEstimateTab.sectionTitle;
export const WO_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
export const WO_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
export const WO_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;
export const WO_INTERACTIVE_TAB = `${cdInteractiveEstimate.interactiveFinalEstimateTab} ${cdBase.interactiveFinalEstimateTab}`;

export function woPanelRootClass(isWindowsPackage: boolean, extra = ''): string {
  const windowsTypography = isWindowsPackage ? ` ${cdProduct.windowsContractTabTypography}` : '';
  const extraClass = extra ? ` ${extra}` : '';
  return `${WO_BLOCK} ${WO_DATA_COMPACT} ${WO_TAB_COMPACT}${windowsTypography}${extraClass}`;
}

export function interactiveEstimateRowClassName(
  installerId: string,
  activeInstallerId: string,
  rowStyles: typeof cdEstimatesList
): string {
  const parts = [rowStyles.interactiveEstimateRow];
  if (!installerId) {
    parts.push(rowStyles.interactiveEstimateRowUnassigned);
  } else {
    parts.push(rowStyles.interactiveEstimateRowAssigned);
    if (activeInstallerId && installerId === activeInstallerId) {
      parts.push(rowStyles.interactiveEstimateRowActiveInstaller);
    }
  }
  return parts.join(' ');
}
