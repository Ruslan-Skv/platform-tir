import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';

export const ADDENDUM_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact}`;
export const ADDENDUM_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
export const ADDENDUM_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
export const ADDENDUM_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
export const ADDENDUM_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
export const ADDENDUM_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
export const ADDENDUM_SECTION_HEADER = `${cdTemplates.estimateSectionHeader} ${cdEstimateTab.estimateSectionHeader}`;
export const ADDENDUM_FIELD = `${cdDataTab.field} ${cdEstimateTab.field}`;
