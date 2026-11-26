import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_BLOCK,
  PACKAGE_DATA_COMPACT,
  PACKAGE_FORM_GRID,
  PACKAGE_SECTION_CARD,
  PACKAGE_TAB_BLOCK_FLAT,
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_DANGER,
  PACKAGE_TAB_BTN_ICON,
  PACKAGE_TAB_BTN_PRIMARY,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_FILL,
  PACKAGE_TAB_FIELD_HINT,
  PACKAGE_TAB_HEAD_ROW,
  PACKAGE_TAB_PANEL,
  PACKAGE_TAB_PANEL_TITLE,
} from '../../ui/packageTabClassNames';
import hubStyles from './PackageHubModal.module.css';

/** Общие композиции классов модалки «Оплаты и Управление договором» (набор вкладок пакета). */

/** Корневой блок: .blockData без жёлтой подложки — секции лежат на своей карточке. */
export const HUB_ROOT = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT} ${PACKAGE_TAB_BLOCK_FLAT}`;
export const HUB_FORM_GRID = PACKAGE_FORM_GRID;

/** Карточка модалки: панели этапов, сводки и оплаты. */
export const HUB_CARD = `${PACKAGE_SECTION_CARD} ${PACKAGE_TAB_CARD} ${hubStyles.hubCard}`;

/** Панель секции («Этапы и статусы договора», «Сводка по договору», «Провести оплату»). */
export const HUB_SECTION = PACKAGE_TAB_PANEL;
export const HUB_SECTION_HEAD = PACKAGE_TAB_HEAD_ROW;
export const HUB_SECTION_TITLE = PACKAGE_TAB_PANEL_TITLE;
/** Пояснение внутри секции. */
export const HUB_SECTION_HINT = PACKAGE_TAB_FIELD_HINT;

/** Поле: та же высота и рамка, что у полей вкладок пакета, на всю ширину колонки. */
export const HUB_FIELD = `${cdEstimateTab.field} ${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_FILL}`;
export const HUB_FIELD_HINT = PACKAGE_TAB_FIELD_HINT;

export const HUB_BTN = PACKAGE_TAB_BTN;
export const HUB_BTN_PRIMARY = PACKAGE_TAB_BTN_PRIMARY;
export const HUB_BTN_SECONDARY = PACKAGE_TAB_BTN_SECONDARY;
export const HUB_BTN_DANGER = PACKAGE_TAB_BTN_DANGER;
export const HUB_BTN_ICON = PACKAGE_TAB_BTN_ICON;
