/**
 * Группы плейсхолдеров для вставки в шаблон договора (пути совпадают с `repairPackageForm.ts`).
 * Для заказчика без жирного в предпросмотре: `{{customer.field|plain}}` (см. `applyTemplate`).
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
    title: 'Заказчик',
    items: [
      { path: 'customer.type', label: 'Тип заказчика (ФЛ/ЮЛ/ИП)' },
      { path: 'customer.fullName', label: 'ФИО заказчика (физлицо)' },
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
        label: 'Должность представителя (именительный падеж)',
      },
      {
        path: 'customer.representativePositionGenitive',
        label: 'Должность представителя (родительный падеж)',
      },
      { path: 'customer.inn', label: 'ИНН заказчика' },
      { path: 'customer.ogrn', label: 'ОГРН заказчика' },
      { path: 'customer.address', label: 'Адрес' },
      { path: 'customer.phone', label: 'Телефон' },
      { path: 'customer.email', label: 'E-mail' },
      { path: 'customer.bankDetails', label: 'Банковские реквизиты заказчика' },
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
      { path: 'executor.email', label: 'E-mail исполнителя' },
      {
        path: 'executor.directorNameNominative',
        label: 'Подписант (именительный падеж)',
      },
      {
        path: 'executor.directorNameGenitive',
        label: 'Подписант (родительный падеж)',
      },
      { path: 'executor.directorName', label: 'Подписант (legacy)' },
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
      { path: 'contract.date', label: 'Дата договора' },
      { path: 'contract.totalAmount', label: 'Сумма (цифрами)' },
      { path: 'contract.recommendedPrepayment', label: 'Рекомендованная предоплата (70%)' },
      { path: 'contract.totalAmountWords', label: 'Сумма прописью' },
      { path: 'contract.prepaymentAmount', label: 'Аванс / предоплата' },
      { path: 'contract.workPeriod', label: 'Сроки / период работ' },
    ],
  },
  {
    title: 'Смета',
    items: [
      { path: 'estimate.notes', label: 'Текст сметы (автосводка/комментарий)' },
      { path: 'estimate.total', label: 'Итоговая сумма сметы' },
      { path: 'estimate.rooms', label: 'Список помещений и позиций (текстом)' },
      { path: 'estimate.roomsHtml', label: 'Смета таблицей (готовый HTML-блок)' },
      { path: 'estimate.roomsCount', label: 'Количество помещений в смете' },
      { path: 'estimate.linesCount', label: 'Количество позиций в смете' },
    ],
  },
];
