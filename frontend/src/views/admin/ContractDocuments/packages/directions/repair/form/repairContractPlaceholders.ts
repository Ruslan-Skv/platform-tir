/**
 * Группы плейсхолдеров для вставки в шаблон договора (пути совпадают с `repairPackageForm.ts`).
 * Для заказчика без жирного в предпросмотре: `{{customer.field|plain}}` (см. `applyTemplate`).
 * `meta.currentDate` подставляется из `repairPackageFormForTemplate` (дата на момент рендера).
 * `contract.contractCost` / `productsCost` / `worksCost` — из сметы, спецификации (Окна) и скидки по договору.
 */

export interface RepairContractPlaceholderItem {
  path: string;
  label: string;
}

export interface RepairContractPlaceholderGroup {
  title: string;
  items: RepairContractPlaceholderItem[];
}

export const REPAIR_CONTRACT_PLACEHOLDER_GROUPS: RepairContractPlaceholderGroup[] = [
  {
    title: 'Заказчик (автоподстановка по типу)',
    items: [
      {
        path: 'customer.fullName',
        label:
          'Заказчик в тексте документа (ФЛ/ЮЛ/ИП — формулировка подбирается автоматически по вкладке)',
      },
      { path: 'customer.displayName', label: 'Краткое имя (ФИО или организация)' },
      { path: 'customer.contractPartyLine', label: 'Преамбула договора (до «далее Заказчик»)' },
      { path: 'customer.actPartyLine', label: 'Сторона в акте' },
      { path: 'customer.payerLine', label: 'Плательщик в ПКО («От …»)' },
      { path: 'customer.signatureName', label: 'Подпись в графе «Заказчик»' },
      { path: 'customer.requisitesHtml', label: 'Реквизиты заказчика (HTML-блок)' },
      { path: 'customer.typeLabel', label: 'Тип заказчика (текстом)' },
    ],
  },
  {
    title: 'Заказчик (поля формы)',
    items: [
      { path: 'customer.type', label: 'Тип заказчика (PERSON / COMPANY / ENTREPRENEUR)' },
      { path: 'customer.fullName', label: 'ФИО (физлицо, поле формы)' },
      {
        path: 'customer.representativeFullNameNominative',
        label: 'ФИО представителя (именительный падеж)',
      },
      {
        path: 'customer.representativeFullNameGenitive',
        label: 'ФИО представителя (родительный падеж)',
      },
      { path: 'customer.organizationName', label: 'Наименование организации' },
      {
        path: 'customer.representativePositionNominative',
        label: 'Должность представителя (именит. падеж)',
      },
      {
        path: 'customer.representativePositionGenitive',
        label: 'Должность представителя (родит. падеж)',
      },
      { path: 'customer.inn', label: 'ИНН заказчика' },
      { path: 'customer.ogrn', label: 'ОГРН заказчика' },
      { path: 'customer.address', label: 'Адрес' },
      { path: 'customer.phone', label: 'Телефон' },
      { path: 'customer.email', label: 'E-mail' },
      { path: 'customer.bankDetails', label: 'Банковские реквизиты заказчика' },
      { path: 'customer.buyerLine', label: 'Покупатель в счёте (наименование и ИНН)' },
      { path: 'customer.passportSeriesNumber', label: 'Паспорт (серия и номер)' },
      { path: 'customer.passportIssuedBy', label: 'Паспорт кем выдан' },
      { path: 'customer.passportIssueDate', label: 'Паспорт дата выдачи' },
    ],
  },
  {
    title: 'Исполнитель',
    items: [
      { path: 'executor.executorKind', label: 'Тип исполнителя (COMPANY / ENTREPRENEUR)' },
      { path: 'executor.companyName', label: 'Наименование' },
      { path: 'executor.inn', label: 'ИНН' },
      { path: 'executor.innKppRegLine', label: 'ИНН, КПП, ОГРН или ИНН, ОГРНИП (одной строкой)' },
      { path: 'executor.kpp', label: 'КПП (ЮЛ)' },
      { path: 'executor.ogrn', label: 'ОГРН (ЮЛ)' },
      { path: 'executor.ogrnip', label: 'ОГРНИП (ИП)' },
      { path: 'executor.legalAddress', label: 'Юр. адрес' },
      { path: 'executor.actualAddress', label: 'Адрес для корреспонденции' },
      { path: 'executor.bankDetails', label: 'Банк. реквизиты' },
      { path: 'executor.bankName', label: 'Банк (из реквизитов, для счёта)' },
      { path: 'executor.bankBik', label: 'БИК (из реквизитов)' },
      { path: 'executor.bankCorrAccount', label: 'Корр. счёт (из реквизитов)' },
      { path: 'executor.bankSettlementAccount', label: 'Р/с (из реквизитов)' },
      { path: 'executor.supplierLine', label: 'Поставщик (наименование и ИНН)' },
      { path: 'executor.email', label: 'E-mail исполнителя' },
      {
        path: 'executor.directorNameNominative',
        label: 'Менеджер (именительный падеж)',
      },
      {
        path: 'executor.directorNameGenitive',
        label: 'Менеджер (родительный падеж)',
      },
      { path: 'executor.directorName', label: 'Менеджер (legacy)' },
      { path: 'executor.basis', label: 'Действует на основании' },
      { path: 'executor.salesOffice', label: 'Офис продаж' },
      { path: 'executor.officePhone', label: 'Телефон офиса' },
    ],
  },
  {
    title: 'Объект',
    items: [
      { path: 'object.objectAddress', label: 'Адрес объекта' },
      { path: 'object.objectFloor', label: 'Этаж' },
      { path: 'object.objectDescription', label: 'Описание работ / объекта' },
    ],
  },
  {
    title: 'Договор (реквизиты)',
    items: [
      { path: 'contract.number', label: 'Номер договора' },
      { path: 'contract.date', label: 'Дата договора (дд.мм.гггг)' },
      { path: 'contract.totalAmount', label: 'Сумма (цифрами)' },
      { path: 'contract.contractCost', label: 'Стоимость договора' },
      { path: 'contract.productsCost', label: 'Стоимость изделий' },
      { path: 'contract.worksCost', label: 'Стоимость работ' },
      {
        path: 'contract.grandTotalAmount',
        label: 'СД итог. (договор + все Д/с со сметой, цифрами)',
      },
      {
        path: 'contract.grandTotalAmountWords',
        label: 'СД итог. (договор + все Д/с, прописью)',
      },
      { path: 'contract.recommendedPrepayment', label: 'Рекомендованная предоплата (70%)' },
      { path: 'contract.totalAmountWords', label: 'Сумма прописью' },
      { path: 'contract.prepaymentAmount', label: 'Оплата (сумма)' },
      {
        path: 'contract.prepaymentAmountWords',
        label: 'Оплата прописью (из поля «Оплата»)',
      },
      { path: 'contract.paymentBasis', label: 'Основание (платёж / перечисление)' },
      { path: 'contract.invoiceNumber', label: 'Номер счёта на оплату' },
      { path: 'contract.invoiceTitleLine', label: 'Заголовок счёта («Счёт на оплату № … от …»)' },
      {
        path: 'contract.prepaymentAmountFormatted',
        label: 'Сумма счёта (с разделителем тысяч)',
      },
      {
        path: 'contract.prepaymentAmountWordsInvoice',
        label: 'Сумма счёта прописью (краткий формат)',
      },
      { path: 'contract.prepaymentDate', label: 'Дата оплаты (дд.мм.гггг, для ПКО)' },
      { path: 'contract.paymentFormLabel', label: 'Способ оплаты (текст, для ПКО)' },
      { path: 'contract.workPeriod', label: 'Срок договора (рабочих дней, число)' },
      {
        path: 'contract.discountPercent',
        label: 'Скидка по договору (%, число; применяется к смете и Д/с)',
      },
    ],
  },
  {
    title: 'Счёт на оплату (таблица)',
    items: [
      {
        path: 'invoice.linesHtml',
        label: 'Строки таблицы товаров/услуг (HTML, вставка в <tbody>)',
      },
      { path: 'invoice.itemsCount', label: 'Количество позиций' },
      {
        path: 'invoice.qrCodeHtml',
        label: 'QR-код для оплаты (HTML, ST0001 по реквизитам исполнителя)',
      },
    ],
  },
  {
    title: 'Дата',
    items: [
      {
        path: 'meta.currentDate',
        label: 'Сегодняшняя дата (дд.мм.гггг, на момент предпросмотра или печати)',
      },
    ],
  },
];
