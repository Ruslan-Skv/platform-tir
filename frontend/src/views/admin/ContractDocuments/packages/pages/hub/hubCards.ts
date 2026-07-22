export type HubCard = {
  href: string;
  title: string;
  hint: string;
};

export const CONTRACT_DOCUMENTS_HUB_CARDS: HubCard[] = [
  {
    href: '/admin/contract-documents/instruction',
    title: 'Инструкция по работе с разделом',
    hint: 'Плейсхолдеры, Excel, CRM, печать и хранение шаблонов — всё в одном месте.',
  },
  {
    href: '/admin/contract-documents/requisites',
    title: 'Исполнители',
    hint: 'Наборы реквизитов Исполнителя для быстрого выбора в договоре.',
  },
  {
    href: '/admin/contract-documents/signatories',
    title: 'Менеджеры',
    hint: 'Карточки менеджера для договоров: ФИО, основание полномочий, офис продаж и связь с CRM.',
  },
  {
    href: '/admin/contract-documents/templates',
    title: 'Библиотека шаблонов',
    hint: 'Договор, акты, ПКО и производственный журнал для направления «Ремонт».',
  },
  {
    href: '/admin/contract-documents/settings',
    title: 'Сроки договоров',
    hint: 'Срок по умолчанию для «Ремонт» и «Окна» (рабочие дни); меняет только суперадмин.',
  },
  {
    href: '/admin/contract-documents/settings/markups',
    title: 'Наценки договоров',
    hint: 'Наценка при расчёте заказ-наряда по «Окна» (цена счёт-заказа минус %); меняет суперадмин.',
  },
  {
    href: '/admin/contract-documents/settings/ceilings-price-list',
    title: 'Прайсы · Натяжные потолки',
    hint: 'Полотно, ленты, профили и товар для спецификации договоров CEILINGS.',
  },
];
