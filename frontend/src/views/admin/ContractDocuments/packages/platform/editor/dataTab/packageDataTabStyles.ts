import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_BLOCK,
  PACKAGE_FIELD,
  PACKAGE_FORM_GRID,
  PACKAGE_HINT,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
} from '../../ui/packageTabClassNames';
import styles from './PackageDataTab.module.css';

export const DATA_TAB_DENSE = `${cdBase.packageDataTabDense} ${cdDataTab.packageDataTabDense} ${cdEstimateTab.packageDataTabDense}`;
export const DATA_BLOCK = PACKAGE_BLOCK;
export const DATA_FORM_GRID = PACKAGE_FORM_GRID;
export const DATA_TOP_ROW = `${cdBase.dataTopRow} ${cdDataTab.dataTopRow}`;
export const DATA_TOP_BLOCK = `${cdBase.dataTopBlock} ${cdDataTab.dataTopBlock}`;
export const DATA_SECTION_CARD = `${cdBase.sectionCard} ${PACKAGE_SECTION_CARD}`;
export const DATA_BLANK_SHEET = `${cdBase.packageDataBlankSheet} ${styles.packageDataBlankSheet}`;
export const DATA_SECTION_TITLE = `${cdBase.sectionTitle} ${cdDataTab.sectionTitle}`;
export const DATA_FIELD = `${cdBase.field} ${PACKAGE_FIELD}`;
export const DATA_PARTY_FIELD = `${cdBase.field} ${cdDataTab.field}`;
export const DATA_SECTION_FIELDS = PACKAGE_SECTION_FIELDS;
export const DATA_HINT = PACKAGE_HINT;
export const DATA_CONTRACT_COMPACT = `${cdBase.contractCompactBlock} ${cdDataTab.contractCompactBlock} ${cdEstimateTab.contractCompactBlock}`;
export const DATA_AUTO_FILLED = `${cdBase.autoFilledInput} ${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;
export const CUSTOMER_SEARCH_SLOT = `${cdBase.packageCustomerSearchSlot} ${cdDataTab.packageCustomerSearchSlot}`;
