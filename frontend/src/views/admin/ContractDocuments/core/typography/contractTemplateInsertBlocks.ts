/** Подсказки кнопок вставки готовых блоков в библиотеке шаблонов. */
export const INSERT_BLOCK_TOOLTIP = {
  noteBlock: {
    title: 'Примечание (выделенный блок)',
    steps: [
      'Поставьте курсор в шаблоне туда, где нужен поясняющий фрагмент (между абзацами или разделами).',
      'Нажмите кнопку — вставится блок с серой подложкой, полосой слева и курсивом.',
      'Замените текст-заготовку своим примечанием, оговоркой или важным условием.',
      'Блок визуально отделён от основного текста и нумерованных пунктов договора.',
      'Убрать блок: удалите весь текст и нажмите Backspace или Delete; либо поставьте курсор внутрь и снова нажмите кнопку «Примечание».',
    ],
    note: 'Выделенный текст не оборачивается — при вставке он заменяется готовым блоком. Плейсхолдеры {{...}} набираются внутри вручную.',
  },
  tableSimple: {
    title: 'Таблица (Пункт / Содержание)',
    steps: [
      'Поставьте курсор в шаблоне в место вставки таблицы.',
      'Нажмите кнопку — появится таблица из двух колонок: шапка «Пункт» и «Содержание» и три строки-примера.',
      'Кликайте по ячейкам и меняйте текст; кнопки «+стр» и «+стб» справа добавляют строку или столбец.',
    ],
    note: 'Для реквизитов и подписей используйте кнопки «Реквизиты» и «Подписи сторон».',
  },
  tableAddRow: {
    title: '+ строка',
    steps: [
      'Поставьте курсор в строку пункта (например, «3.1.4») — в ячейку с номером или с текстом.',
      'Нажмите «+стр» или Ctrl+Enter — появится новая строка для следующего пункта (3.1.5).',
      'Если в конце ячейки «вшит» подзаголовок следующего раздела (например «3.2. Заказчик…» из Word), он автоматически переносится в отдельную строку ниже.',
      'В первой ячейке новой строки введите номер (3.1.5), во второй — текст пункта.',
      'Для списка приложений (раздел 8): поставьте курсор в последний пункт списка и нажмите «+стр» — добавится пункт списка, а не строка таблицы.',
    ],
    note: 'Enter внутри ячейки — перенос строки в том же пункте. Новый пункт договора — «+стр» или Ctrl+Enter. Новый пункт списка приложений — «+стр» при курсоре внутри списка.',
  },
  tableAddColumn: {
    title: '+ столбец',
    steps: [
      'Поставьте курсор в ячейку столбца, после которого нужен новый.',
      'Нажмите «+стб» — справа добавится столбец во всех строках таблицы.',
      'Курсор останется в новой ячейке текущей строки.',
    ],
    note: 'Работает в визуальном конструкторе и в режиме HTML, если курсор внутри <table>.',
  },
  signaturesActHandwritten: {
    title: 'Подписи сторон (акт, ФИО заказчика вручную)',
    steps: [
      'Поставьте курсор после текста акта (обычно после последнего пункта нумерованного списка).',
      'Нажмите кнопку — вставится таблица подписей в формате акта: Исполнитель и Заказчик.',
      'У Исполнителя подставится ФИО из шаблона ({{executor.directorName|plain}}); у Заказчика только линия для подписи.',
      'Под данными Заказчика — строка для даты и линия для собственноручного ФИО.',
      'Таблица подписей на всю ширину листа, как основной текст акта.',
    ],
    note: 'Для договоров с автоподстановкой ФИО заказчика используйте кнопку «Подписи сторон» (иконка карандаша).',
  },
  pageBreak: {
    title: 'Разрыв страницы',
    steps: [
      'Поставьте курсор перед текстом, который при печати должен начаться с нового листа.',
      'Нажмите кнопку — в конструкторе появится серая метка «Разрыв страницы».',
      'В PDF и при печати всё после метки переносится на следующий лист (Enter этого не делает).',
      'Удалить метку: выделите её и нажмите Delete или Backspace.',
    ],
    note: 'В многостраничном договоре перед разрывом могут автоматически подставляться компактные подписи сторон. В предпросмотре справа метка не видна — только эффект переноса.',
  },
} as const;

const SIMPLE_TABLE_CELL_STYLE = 'border: 1px solid var(--admin-border); padding: 6px;';

/** HTML простой таблицы «Пункт / Содержание» для вставки в шаблон. */
export function buildSimpleContractTableHtml(): string {
  const td = (left: string, right: string) =>
    `<tr><td style="${SIMPLE_TABLE_CELL_STYLE}">${left}</td><td style="${SIMPLE_TABLE_CELL_STYLE}">${right}</td></tr>`;
  return `<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;"><tr><th style="${SIMPLE_TABLE_CELL_STYLE} text-align: left;">Пункт</th><th style="${SIMPLE_TABLE_CELL_STYLE} text-align: left;">Содержание</th></tr>${td('1', 'Описание')}${td('2', '')}${td('3', '')}</table>`;
}

/** Подписи сторон для договора: ФИО заказчика подставляется из шаблона. */
export function buildContractPartySignaturesHtml(): string {
  return `<table style="width: 100%; border-collapse: collapse; margin-top: 16pt;">
  <tr>
    <td style="width: 50%; vertical-align: bottom; padding-right: 10px;">
      <p style="margin: 0 0 22pt;">Подрядчик _____________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: bottom; padding-left: 10px;">
      <p style="margin: 0 0 22pt;">Заказчик _____________________ / {{customer.signatureName|plain}}</p>
    </td>
  </tr>
</table>`;
}

/** @deprecated используйте {@link CONTRACT_SIGN_SLASH_ROW_CLASS} */
export const CONTRACT_SIGN_CUSTOMER_SLASH_CLASS = 'contractSignCustomerSlash';
export const CONTRACT_SIGN_SLASH_ROW_CLASS = 'contractSignSlashRow';
export const CONTRACT_SIGN_SIGNATURE_LINE_CLASS = 'contractSignSignatureLine';
export const CONTRACT_SIGN_NAME_TEXT_CLASS = 'contractSignNameText';
export const CONTRACT_SIGN_FIO_LINE_CLASS = 'contractSignFioLine';
export const CONTRACT_SIGN_TABLE_SIGN_ROW_CLASS = 'signTableSignRow';

const nbsp = '\u00A0';

/** Подписи для акта: на всю ширину листа; у заказчика линия для ФИО, без {{customer.signatureName}}. */
export function buildContractActHandwrittenCustomerSignaturesHtml(): string {
  return `<table class="signTable signTableActHandwritten" style="width: 100%; border-collapse: collapse;" data-contract-signatures-handwritten-customer="1"><tr><td>Исполнитель</td><td>Заказчик</td></tr>
<tr class="${CONTRACT_SIGN_TABLE_SIGN_ROW_CLASS}"><td><span class="${CONTRACT_SIGN_SLASH_ROW_CLASS}"><span class="${CONTRACT_SIGN_SIGNATURE_LINE_CLASS}">${nbsp}</span>/<span class="${CONTRACT_SIGN_NAME_TEXT_CLASS}">{{executor.directorName|plain}}</span></span></td><td><span class="${CONTRACT_SIGN_SLASH_ROW_CLASS}"><span class="${CONTRACT_SIGN_SIGNATURE_LINE_CLASS}">${nbsp}</span>/<span class="${CONTRACT_SIGN_FIO_LINE_CLASS}">${nbsp}</span></span></td></tr>
<tr class="signTableDateRow"><td></td><td>«____» ________________ 20__ г.</td></tr></table>`;
}
