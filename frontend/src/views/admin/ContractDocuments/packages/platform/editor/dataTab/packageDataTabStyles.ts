import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_BLOCK,
  PACKAGE_DATA_COMPACT,
  PACKAGE_FORM_GRID,
  PACKAGE_SECTION_CARD,
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_DANGER,
  PACKAGE_TAB_BTN_ICON,
  PACKAGE_TAB_BTN_PRIMARY,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_DISCOUNT,
  PACKAGE_TAB_FIELD_FILL,
  PACKAGE_TAB_FIELD_HINT,
  PACKAGE_TAB_HEAD,
  PACKAGE_TAB_HEAD_ROW,
  PACKAGE_TAB_HEAD_ROW_ACTIONS,
  PACKAGE_TAB_PANEL,
  PACKAGE_TAB_PANEL_TITLE,
  PACKAGE_TAB_TITLE,
} from '../../ui/packageTabClassNames';
import styles from './PackageDataTab.module.css';

/** Общие композиции классов вкладки «Данные» (набор вкладок пакета — editor-chrome). */

export const DATA_BLOCK = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT}`;
export const DATA_FORM_GRID = PACKAGE_FORM_GRID;

/** Карточка вкладки: заголовок и панели разделов. */
export const DATA_CARD = `${PACKAGE_SECTION_CARD} ${PACKAGE_TAB_CARD} ${styles.dataTabCard}`;
export const DATA_HEAD = PACKAGE_TAB_HEAD;
export const DATA_TITLE = PACKAGE_TAB_TITLE;

/** Панель раздела («Договор и объект», «Заказчик», «Исполнитель», «Менеджер»). */
export const DATA_SECTION = PACKAGE_TAB_PANEL;
export const DATA_SECTION_HEAD = PACKAGE_TAB_HEAD_ROW;
export const DATA_SECTION_TITLE = PACKAGE_TAB_PANEL_TITLE;
export const DATA_SECTION_ACTIONS = PACKAGE_TAB_HEAD_ROW_ACTIONS;
/** Пояснение внутри раздела. */
export const DATA_SECTION_HINT = PACKAGE_TAB_FIELD_HINT;

/** Поле с подписью сверху: та же высота и рамка, что у полей остальных вкладок пакета;
 *  поле ввода тянется на ширину своей колонки. */
export const DATA_FIELD = `${cdEstimateTab.field} ${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_FILL}`;
/** Скидка «[% | руб.] [значение]» — PackageDiscountControls. */
export const DATA_FIELD_DISCOUNT = `${cdEstimateTab.field} ${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_DISCOUNT}`;
export const DATA_FIELD_HINT = PACKAGE_TAB_FIELD_HINT;
export const DATA_BTN = PACKAGE_TAB_BTN;
export const DATA_BTN_PRIMARY = PACKAGE_TAB_BTN_PRIMARY;
export const DATA_BTN_SECONDARY = PACKAGE_TAB_BTN_SECONDARY;
export const DATA_BTN_DANGER = PACKAGE_TAB_BTN_DANGER;
export const DATA_BTN_ICON = PACKAGE_TAB_BTN_ICON;

/** Признак автоподстановки/блокировки поля: вид задаёт набор (поле только для чтения). */
export const DATA_AUTO_FILLED = `${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;

/** Слот поиска заказчика: под ним открывается выпадающий список результатов. */
export const CUSTOMER_SEARCH_SLOT = `${cdDataTab.packageCustomerSearchSlot} ${styles.dataTabCustomerSearch}`;
