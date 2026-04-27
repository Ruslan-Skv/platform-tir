/** Группы плейсхолдеров для вставки в шаблон договора (пути совпадают с `repairPackageForm.ts`). */

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
      { path: 'customer.fullName', label: 'ФИО' },
      { path: 'customer.address', label: 'Адрес' },
      { path: 'customer.phone', label: 'Телефон' },
      { path: 'customer.email', label: 'E-mail' },
      { path: 'customer.passportSeriesNumber', label: 'Паспорт (серия и номер)' },
      { path: 'customer.passportIssuedBy', label: 'Паспорт кем выдан' },
      { path: 'customer.passportIssueDate', label: 'Паспорт дата выдачи' },
    ],
  },
  {
    title: 'Исполнитель',
    items: [
      { path: 'executor.companyName', label: 'Наименование' },
      { path: 'executor.inn', label: 'ИНН' },
      { path: 'executor.kpp', label: 'КПП' },
      { path: 'executor.ogrn', label: 'ОГРН' },
      { path: 'executor.legalAddress', label: 'Юр. адрес' },
      { path: 'executor.actualAddress', label: 'Факт. адрес' },
      { path: 'executor.bankDetails', label: 'Банк. реквизиты' },
      { path: 'executor.directorName', label: 'Подписант' },
      { path: 'executor.basis', label: 'Действует на основании' },
    ],
  },
  {
    title: 'Объект',
    items: [
      { path: 'object.objectAddress', label: 'Адрес объекта' },
      { path: 'object.objectDescription', label: 'Описание работ / объекта' },
    ],
  },
  {
    title: 'Договор (реквизиты)',
    items: [
      { path: 'contract.number', label: 'Номер договора' },
      { path: 'contract.date', label: 'Дата договора' },
      { path: 'contract.totalAmount', label: 'Сумма (цифрами)' },
      { path: 'contract.totalAmountWords', label: 'Сумма прописью' },
      { path: 'contract.prepaymentAmount', label: 'Аванс / предоплата' },
      { path: 'contract.workPeriod', label: 'Сроки / период работ' },
    ],
  },
  {
    title: 'Смета',
    items: [{ path: 'estimate.notes', label: 'Текст сметы (вкладка «Данные»)' }],
  },
];
