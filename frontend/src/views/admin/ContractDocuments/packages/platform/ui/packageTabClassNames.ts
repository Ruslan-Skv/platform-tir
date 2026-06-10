import cdDataTab from '../../../styles/data-tab.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdHubModals from '../../../styles/hub-modals.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';

/** Общие композиции классов для вкладок пакета (данные, спецификация, Д/с). */
export const PACKAGE_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact}`;
export const PACKAGE_TAB_COMPACT_WITH_HUB = `${PACKAGE_TAB_COMPACT} ${cdHubModals.estimateTabCompact}`;

export const PACKAGE_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
export const PACKAGE_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
export const PACKAGE_DATA_COMPACT_WITH_HUB = `${PACKAGE_DATA_COMPACT} ${cdHubModals.dataCompact}`;

export const PACKAGE_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
export const PACKAGE_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
export const PACKAGE_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
export const PACKAGE_SECTION_HEADER = `${cdTemplates.estimateSectionHeader} ${cdEstimateTab.estimateSectionHeader}`;
export const PACKAGE_SECTION_TITLE = cdEstimateTab.sectionTitle;
export const PACKAGE_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
export const PACKAGE_FIELD = `${cdDataTab.field} ${cdEstimateTab.field}`;
export const PACKAGE_FIELD_WITH_HUB = `${cdHubModals.field} ${cdDataTab.field} ${cdEstimateTab.field}`;
export const PACKAGE_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
export const PACKAGE_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;

export const PACKAGE_SPEC_ROOT = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT_WITH_HUB} ${PACKAGE_TAB_COMPACT_WITH_HUB} ${cdProduct.windowsContractTabTypography}`;
export const PACKAGE_ADDENDUM_ROOT = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT} ${PACKAGE_TAB_COMPACT} ${cdProduct.windowsContractTabTypography} ${cdProduct.windowsAddendumTab}`;
