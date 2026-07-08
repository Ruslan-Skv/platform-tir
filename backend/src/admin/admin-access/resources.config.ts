/**
 * Список ресурсов админки для управления доступом.
 * resourceId используется как ключ в admin_resource_permissions.
 * path — путь в админке (для отображения и привязки к маршруту).
 */
export interface AdminResourceItem {
  id: string;
  label: string;
  path: string;
}

export const ADMIN_RESOURCES: AdminResourceItem[] = [
  { id: 'admin', label: 'Дашборд', path: '/admin' },
  { id: 'admin.crm', label: 'CRM', path: '/admin/crm' },
  { id: 'admin.crm.measurements', label: 'Замеры', path: '/admin/measurements' },
  {
    id: 'admin.crm.contract-payments',
    label: 'Движ. ден. средст',
    path: '/admin/crm/contract-payments',
  },
  { id: 'admin.crm.cash-register', label: 'Касса', path: '/admin/crm/cash-register' },
  {
    id: 'admin.crm.supplier-settlements',
    label: 'Расчёты с поставщиками',
    path: '/admin/crm/supplier-settlements',
  },
  {
    id: 'admin.crm.contract-payments.incassation',
    label: 'Инкассация по оплатам (редактирование)',
    path: '/admin/crm/contract-payments',
  },
  { id: 'admin.crm.offices', label: 'Офисы', path: '/admin/crm/offices' },
  { id: 'admin.crm.installers', label: 'Мастера (монтажники)', path: '/admin/crm/installers' },
  { id: 'admin.crm.customers', label: 'Заказчики', path: '/admin/customers' },
  { id: 'admin.forms', label: 'Входящие заявки', path: '/admin/leads' },
  { id: 'admin.quiz', label: 'Квизы', path: '/admin/quiz' },
  { id: 'admin.quiz.mebel', label: 'Квиз — Мебель', path: '/admin/quiz/mebel' },
  { id: 'admin.quiz.remont', label: 'Квиз — Ремонт', path: '/admin/quiz/remont' },
  { id: 'admin.support', label: 'Чат поддержки', path: '/admin/support' },
  { id: 'admin.crm.funnel', label: 'Воронка продаж', path: '/admin/crm/funnel' },
  { id: 'admin.crm.tasks', label: 'Задачи', path: '/admin/crm/tasks' },
  { id: 'admin.crm.payroll', label: 'Расчёт з/п', path: '/admin/crm/payroll' },
  {
    id: 'admin.crm.payroll.management',
    label: 'Расчёт з/п — Управление',
    path: '/admin/crm/payroll/management',
  },
  {
    id: 'admin.contract-documents',
    label: 'Настройки — Оформление договоров',
    path: '/admin/contract-documents',
  },
  {
    id: 'admin.contract-documents.repair',
    label: 'Договора',
    path: '/admin/contract-documents/contracts',
  },
  {
    id: 'admin.contract-documents.contracts',
    label: 'Договора',
    path: '/admin/contract-documents/contracts',
  },
  {
    id: 'admin.contract-documents.instruction',
    label: 'Настройки — Оформление договоров — Инструкция',
    path: '/admin/contract-documents/instruction',
  },
  {
    id: 'admin.contract-documents.requisites',
    label: 'Настройки — Оформление договоров — Исполнители',
    path: '/admin/contract-documents/requisites',
  },
  {
    id: 'admin.contract-documents.signatories',
    label: 'Настройки — Оформление договоров — Менеджеры',
    path: '/admin/contract-documents/signatories',
  },
  {
    id: 'admin.contract-documents.templates',
    label: 'Настройки — Оформление договоров — Библиотека шаблонов',
    path: '/admin/contract-documents/templates',
  },
  {
    id: 'admin.contract-documents.repair-settings',
    label: 'Настройки — Оформление договоров — Сроки договоров',
    path: '/admin/contract-documents/settings',
  },
  {
    id: 'admin.contract-documents.markups',
    label: 'Настройки — Оформление договоров — Наценки договоров',
    path: '/admin/contract-documents/settings/markups',
  },
  {
    id: 'admin.contract-documents.estimates',
    label: 'Расчёты',
    path: '/admin/contract-documents/estimates',
  },
  { id: 'admin.accounting', label: 'Бухгалтерия', path: '/admin/accounting/invoices' },
  {
    id: 'admin.accounting.invoices',
    label: 'Счета на оплату',
    path: '/admin/accounting/invoices',
  },
  { id: 'admin.content', label: 'Контент', path: '/admin/content' },
  { id: 'admin.content.home', label: 'Главная страница', path: '/admin/content/home' },
  { id: 'admin.content.hero', label: 'Первый блок', path: '/admin/content/hero' },
  { id: 'admin.content.directions', label: 'Наши направления', path: '/admin/content/directions' },
  {
    id: 'admin.content.advantages',
    label: 'Почему выбирают нас',
    path: '/admin/content/advantages',
  },
  { id: 'admin.content.services', label: 'Комплексные решения', path: '/admin/content/services' },
  {
    id: 'admin.content.featured-products',
    label: 'Популярные товары',
    path: '/admin/content/featured-products',
  },
  {
    id: 'admin.content.contact-form',
    label: 'Контактная форма',
    path: '/admin/content/contact-form',
  },
  { id: 'admin.content.pages', label: 'Страницы', path: '/admin/content/pages' },
  { id: 'admin.content.blog', label: 'Блог', path: '/admin/content/blog' },
  { id: 'admin.content.promotions', label: 'Акции', path: '/admin/content/promotions' },
  { id: 'admin.content.careers', label: 'Вакансии', path: '/admin/content/careers' },
  { id: 'admin.content.contacts', label: 'Контакты', path: '/admin/content/contacts' },
  { id: 'admin.content.mission', label: 'Миссия компании', path: '/admin/content/mission' },
  { id: 'admin.content.photo', label: 'Наши работы', path: '/admin/content/photo' },
  { id: 'admin.content.comments', label: 'Комментарии', path: '/admin/content/comments' },
  { id: 'admin.content.navigation', label: 'Меню навигации', path: '/admin/content/navigation' },
  { id: 'admin.content.footer', label: 'Футер', path: '/admin/content/footer' },
  { id: 'admin.catalog', label: 'Каталог', path: '/admin/catalog' },
  { id: 'admin.catalog.products', label: 'Товары', path: '/admin/catalog/products' },
  { id: 'admin.catalog.categories', label: 'Категории', path: '/admin/catalog/categories' },
  { id: 'admin.catalog.attributes', label: 'Характеристики', path: '/admin/catalog/attributes' },
  {
    id: 'admin.catalog.components',
    label: 'Комплектующие',
    path: '/admin/catalog/components',
  },
  { id: 'admin.service-catalog', label: 'Ремонт квартир', path: '/admin/service-catalog' },
  {
    id: 'admin.service-catalog.items',
    label: 'Ремонт квартир — Виды работ',
    path: '/admin/service-catalog/items',
  },
  { id: 'admin.partners', label: 'Партнёры', path: '/admin/partners' },
  { id: 'admin.catalog.suppliers', label: 'Поставщики', path: '/admin/catalog/suppliers' },
  { id: 'admin.orders', label: 'Заказы', path: '/admin/orders' },
  {
    id: 'admin.orders.checkout-info',
    label: 'Порядок оформления',
    path: '/admin/orders/checkout-info',
  },
  { id: 'admin.orders.shipping', label: 'Доставка', path: '/admin/orders/shipping' },
  { id: 'admin.orders.payments', label: 'Оплаты', path: '/admin/orders/payments' },
  { id: 'admin.knowledge', label: 'Территория знаний', path: '/admin/knowledge' },
  {
    id: 'admin.knowledge.tests',
    label: 'Территория знаний — итоговые тесты',
    path: '/admin/knowledge/tests',
  },
  { id: 'admin.recruitment', label: 'Подбор менеджеров', path: '/admin/recruitment' },
  {
    id: 'admin.recruitment.analytics',
    label: 'Подбор — Аналитика',
    path: '/admin/recruitment/analytics',
  },
  { id: 'admin.analytics', label: 'Аналитика', path: '/admin/analytics' },
  { id: 'admin.analytics.sales', label: 'Обзор продаж', path: '/admin/analytics/sales' },
  {
    id: 'admin.analytics.financial',
    label: 'Финансовые отчеты',
    path: '/admin/analytics/financial',
  },
  { id: 'admin.analytics.managers', label: 'KPI менеджеров', path: '/admin/analytics/managers' },
  { id: 'admin.analytics.marketing', label: 'Маркетинг', path: '/admin/analytics/marketing' },
  { id: 'admin.settings', label: 'Настройки', path: '/admin/settings' },
  {
    id: 'admin.settings.product-templates',
    label: 'Шаблоны товаров',
    path: '/admin/settings/product-templates',
  },
  {
    id: 'admin.settings.partner-products',
    label: 'Товары партнёра',
    path: '/admin/settings/partner-products',
  },
  { id: 'admin.settings.reviews', label: 'Отзывы и оценки', path: '/admin/settings/reviews' },
  {
    id: 'admin.settings.catalog',
    label: 'Каталог',
    path: '/admin/settings/catalog',
  },
  {
    id: 'admin.settings.catalog-badges',
    label: 'Бэйджи карточек',
    path: '/admin/settings/catalog/product-badges',
  },
  {
    id: 'admin.settings.catalog-filters',
    label: 'Блок фильтров',
    path: '/admin/settings/catalog-filters',
  },
  {
    id: 'admin.settings.catalog-hub-preview',
    label: 'Превью каталога',
    path: '/admin/settings/catalog-hub-preview',
  },
  {
    id: 'admin.settings.catalog-dropdown-lists',
    label: 'Выпадающие списки',
    path: '/admin/settings/dropdown-lists',
  },
  {
    id: 'admin.settings.catalog-manufacturers',
    label: 'Производители',
    path: '/admin/settings/catalog/manufacturers',
  },
  {
    id: 'admin.settings.catalog-coating-materials',
    label: 'Материалы покрытия',
    path: '/admin/settings/catalog/coating-materials',
  },
  {
    id: 'admin.settings.catalog-canvas-types',
    label: 'Типы полотна',
    path: '/admin/settings/catalog/canvas-types',
  },
  {
    id: 'admin.settings.catalog-door-thicknesses',
    label: 'Толщина двери',
    path: '/admin/settings/catalog/door-thicknesses',
  },
  {
    id: 'admin.settings.catalog-weatherstrips',
    label: 'Уплотнители',
    path: '/admin/settings/catalog/weatherstrips',
  },
  {
    id: 'admin.settings.user-cabinet',
    label: 'Личный кабинет',
    path: '/admin/settings/user-cabinet',
  },
  {
    id: 'admin.settings.notifications',
    label: 'Уведомления в админке',
    path: '/admin/settings/notifications',
  },
  {
    id: 'admin.settings.notification-channels',
    label: 'Каналы уведомлений о заявках',
    path: '/admin/settings/notification-channels',
  },
  {
    id: 'admin.settings.checkout',
    label: 'Оформление заказов',
    path: '/admin/settings/checkout',
  },
  {
    id: 'admin.settings.seller-legal',
    label: 'Информация о продавце',
    path: '/admin/settings/seller-legal',
  },
  {
    id: 'admin.settings.site-disclaimer',
    label: 'Информация на сайте (не оферта)',
    path: '/admin/settings/site-disclaimer',
  },
  {
    id: 'admin.settings.public-offer',
    label: 'Публичные оферты',
    path: '/admin/settings/public-offers',
  },
  {
    id: 'admin.settings.delivery',
    label: 'Доставка',
    path: '/admin/settings/delivery',
  },
  {
    id: 'admin.settings.admin-link',
    label: 'Кнопка «Админка» на сайте',
    path: '/admin/settings/admin-link',
  },
  {
    id: 'admin.settings.quote-form',
    label: 'Рассчитать стоимость (виды работ)',
    path: '/admin/settings/quote-form',
  },
  {
    id: 'admin.settings.pwa',
    label: 'PWA и обновления',
    path: '/admin/settings/pwa',
  },
  { id: 'admin.settings.roles', label: 'Роли', path: '/admin/settings/roles' },
  { id: 'admin.users', label: 'Управление пользователями', path: '/admin/users' },
];
