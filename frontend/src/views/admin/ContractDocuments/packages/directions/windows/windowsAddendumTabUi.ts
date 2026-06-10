import cdDataTab from '../../../styles/data-tab.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import cdWindows from '../../../styles/windows-package.module.css';

export const WINDOWS_ADDENDUM_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdWindows.estimateTabCompact}`;
export const WINDOWS_ADDENDUM_BLOCK = `${cdDataTab.blockData} ${cdWindows.blockData}`;
export const WINDOWS_ADDENDUM_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
export const WINDOWS_ADDENDUM_FORM_GRID = `${cdDataTab.formGrid} ${cdWindows.formGrid}`;
export const WINDOWS_ADDENDUM_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
export const WINDOWS_ADDENDUM_SECTION_HEADER = `${cdTemplates.estimateSectionHeader} ${cdEstimateTab.estimateSectionHeader}`;
export const WINDOWS_ADDENDUM_SECTION_TITLE = cdEstimateTab.sectionTitle;
export const WINDOWS_ADDENDUM_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
export const WINDOWS_ADDENDUM_FIELD = `${cdDataTab.field} ${cdEstimateTab.field}`;
export const WINDOWS_ADDENDUM_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
export const WINDOWS_ADDENDUM_ROOT = `${WINDOWS_ADDENDUM_BLOCK} ${WINDOWS_ADDENDUM_DATA_COMPACT} ${WINDOWS_ADDENDUM_TAB_COMPACT} ${cdWindows.windowsContractTabTypography} ${cdWindows.windowsAddendumTab}`;
