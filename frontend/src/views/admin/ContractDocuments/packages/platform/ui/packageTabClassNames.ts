import cdDataTab from '../../../styles/data-tab.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
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

/** Шапка вкладки документа («Смета», «Д/с», «Спецификация», «Файлы»…): карточка, заголовок и описание. */
export const PACKAGE_TAB_CARD = cdChrome.packageTabCard;
export const PACKAGE_TAB_TITLE = cdChrome.packageTabCardTitle;
export const PACKAGE_TAB_HINT = cdChrome.packageTabCardHint;

/* Элементы внутри карточки вкладки (стили — в editor-chrome, действуют внутри PACKAGE_TAB_CARD). */
/** Подзаголовок раздела внутри карточки. */
export const PACKAGE_TAB_SUBTITLE = cdChrome.packageTabSubTitle;
/** Шапка карточки: заголовок → плашка «только чтение» → описание. */
export const PACKAGE_TAB_HEAD = cdChrome.packageTabHead;
/** Подпись блока внутри карточки («Прикреплённые», «Раздел 1: …»). */
export const PACKAGE_TAB_CAPTION = cdChrome.packageTabCaption;
/** Подсказка под полем или кнопкой (12px). */
export const PACKAGE_TAB_FIELD_HINT = cdChrome.packageTabFieldHint;
/** Несколько подсказок подряд — столбиком. */
export const PACKAGE_TAB_HINT_STACK = cdChrome.packageTabHintStack;
/** Ряд полей шапки (дата | срок | скидка). */
export const PACKAGE_TAB_FIELD_ROW = cdChrome.packageTabFieldRow;
/** Поле с подписью сверху; ширину задаёт класс размера из этой же группы. */
export const PACKAGE_TAB_FIELD = cdChrome.packageTabField;
export const PACKAGE_TAB_FIELD_DATE = cdChrome.packageTabFieldDate;
export const PACKAGE_TAB_FIELD_DAYS = cdChrome.packageTabFieldDays;
export const PACKAGE_TAB_FIELD_PERCENT = cdChrome.packageTabFieldPercent;
export const PACKAGE_TAB_FIELD_MONEY = cdChrome.packageTabFieldMoney;
/** Селект или поле на всю ширину своего столбца (не шире 24rem). */
export const PACKAGE_TAB_FIELD_WIDE = cdChrome.packageTabFieldWide;
/** Скидка «[% | руб.] [значение]» — PackageDiscountControls. */
export const PACKAGE_TAB_FIELD_DISCOUNT = cdChrome.packageTabFieldDiscount;
/** Скидка Д/с «По договору | Своя, % | Своя, руб.» — PackageAddendumSlotDiscountControls. */
export const PACKAGE_TAB_FIELD_DISCOUNT_WIDE = cdChrome.packageTabFieldDiscountWide;
/** Обёртка числового поля с единицей измерения внутри (PACKAGE_TAB_INPUT_SUFFIX). */
export const PACKAGE_TAB_INPUT_WRAP = cdChrome.packageTabInputWrap;
export const PACKAGE_TAB_INPUT_SUFFIX = cdChrome.packageTabInputSuffix;
/** Кнопка внутри вкладки — одна высота с полями; вариант: primary или secondary. */
export const PACKAGE_TAB_BTN = cdChrome.packageTabBtn;
export const PACKAGE_TAB_BTN_PRIMARY = cdChrome.packageTabBtnPrimary;
export const PACKAGE_TAB_BTN_SECONDARY = cdChrome.packageTabBtnSecondary;
/** Модификатор кнопки: квадратная кнопка-иконка («+»). */
export const PACKAGE_TAB_BTN_ICON = cdChrome.packageTabBtnIcon;
/** Строка «поле слева, переключатель справа». */
export const PACKAGE_TAB_TOOLBAR_ROW = cdChrome.packageTabToolbarRow;
/** Сегментный переключатель: обёртка, группа с подписью, кнопка (aria-pressed). */
export const PACKAGE_TAB_SEGMENTED = cdChrome.packageTabSegmented;
export const PACKAGE_TAB_SEGMENTED_GROUP = cdChrome.packageTabSegmentedGroup;
export const PACKAGE_TAB_SEGMENTED_CAPTION = cdChrome.packageTabSegmentedCaption;
export const PACKAGE_TAB_SEGMENTED_BTN = cdChrome.packageTabSegmentedBtn;
/** Лист предпросмотра (A4) внутри карточки — без второй рамки. */
export const PACKAGE_TAB_A4 = cdChrome.packageTabA4;

export const PACKAGE_SPEC_ROOT = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT_WITH_HUB} ${PACKAGE_TAB_COMPACT_WITH_HUB} ${cdProduct.windowsContractTabTypography}`;
export const PACKAGE_ADDENDUM_ROOT = `${PACKAGE_BLOCK} ${PACKAGE_DATA_COMPACT} ${PACKAGE_TAB_COMPACT} ${cdProduct.windowsContractTabTypography} ${cdProduct.windowsAddendumTab}`;
