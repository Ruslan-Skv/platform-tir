import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_A4_WRAP,
  PACKAGE_BLOCK,
  PACKAGE_DATA_COMPACT,
  PACKAGE_FORM_GRID,
  PACKAGE_SECTION_CARD,
  PACKAGE_TAB_A4,
  PACKAGE_TAB_BLOCK_FLAT,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_CHECK_ROW,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_FILL,
  PACKAGE_TAB_HEAD,
  PACKAGE_TAB_HEAD_ROW,
  PACKAGE_TAB_HINT,
  PACKAGE_TAB_PANEL,
  PACKAGE_TAB_PANEL_TITLE,
  PACKAGE_TAB_TITLE,
} from '../../ui/packageTabClassNames';
import styles from './PackageQuestionnairesHubPanels.module.css';

/** Общие композиции классов для анкет в модалках (набор вкладок пакета). */

/** Тело модалки анкеты: сообщения и карточка — столбиком с отбивкой. */
export const Q_MODAL_BODY = styles.modalBody;

/** Корневой блок анкеты в модалке: .blockData без жёлтой подложки. */
export const Q_ROOT = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT} ${PACKAGE_TAB_BLOCK_FLAT}`;
export const Q_FORM_GRID = PACKAGE_FORM_GRID;

/** Карточка анкеты: шапка, белые панели разделов и лист предпросмотра — с равной отбивкой. */
export const Q_CARD = `${PACKAGE_SECTION_CARD} ${PACKAGE_TAB_CARD} ${styles.questionnaireCard}`;

/** Лист предпросмотра анкеты внутри карточки — без второй рамки. */
export const Q_A4_WRAP = `${PACKAGE_A4_WRAP} ${PACKAGE_TAB_A4}`;

export const Q_HEAD = PACKAGE_TAB_HEAD;
export const Q_TITLE = PACKAGE_TAB_TITLE;
export const Q_HINT = PACKAGE_TAB_HINT;
export const Q_PANEL = PACKAGE_TAB_PANEL;
export const Q_PANEL_HEAD = PACKAGE_TAB_HEAD_ROW;
export const Q_PANEL_TITLE = PACKAGE_TAB_PANEL_TITLE;
/** Поле раздела анкеты: на всю ширину панели (в т.ч. многострочное). */
export const Q_FIELD = `${cdEstimateTab.field} ${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_FILL}`;
export const Q_CHECK_ROW = PACKAGE_TAB_CHECK_ROW;
export const Q_CHECKS_GRID = styles.checksGrid;
