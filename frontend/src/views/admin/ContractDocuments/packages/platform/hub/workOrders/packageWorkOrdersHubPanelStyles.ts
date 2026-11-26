import cdBase from '../../../../styles/base.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdInteractiveEstimate from '../../../../styles/interactive-estimate.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import {
  PACKAGE_A4_WRAP,
  PACKAGE_BLOCK,
  PACKAGE_DATA_COMPACT,
  PACKAGE_FORM_GRID,
  PACKAGE_SECTION_CARD,
  PACKAGE_TAB_BLOCK_FLAT,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_FILL,
} from '../../ui/packageTabClassNames';

export const WO_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact}`;
/** Поле панели: как на вкладках пакета, на всю ширину своей колонки. */
export const WO_FIELD = `${cdEstimateTab.field} ${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_FILL}`;
export const WO_FORM_GRID = PACKAGE_FORM_GRID;
export const WO_SECTION_CARD = PACKAGE_SECTION_CARD;
export const WO_A4_WRAP = PACKAGE_A4_WRAP;
export const WO_INTERACTIVE_TAB = `${cdInteractiveEstimate.interactiveFinalEstimateTab} ${cdBase.interactiveFinalEstimateTab}`;

/** Панель вкладок-«ярлычков» внутри панели модалки — как тулбар в шапке модалки. */
export const WO_SUB_TAB_BAR = `${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.packageTabBarCompact} ${cdBase.blockTabs} ${cdBase.packageTabBarCompact}`;

/** Корень панели: без жёлтой подложки .blockData — содержимое лежит на карточке вкладки. */
export function woPanelRootClass(isWindowsPackage: boolean, extra = ''): string {
  const windowsTypography = isWindowsPackage ? ` ${cdProduct.windowsContractTabTypography}` : '';
  const extraClass = extra ? ` ${extra}` : '';
  return `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT} ${WO_TAB_COMPACT}${windowsTypography} ${PACKAGE_TAB_BLOCK_FLAT}${extraClass}`;
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
