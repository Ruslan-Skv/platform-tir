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
  { id: 'admin.crm.measurements', label: 'Замеры', path: '/admin/crm/measurements' },
  { id: 'admin.crm.contracts', label: 'Объекты', path: '/admin/crm/contracts' },
  {
    id: 'admin.crm.contract-payments',
    label: 'Движ. ден. средст',
    path: '/admin/crm/contract-payments',
  },
  { id: 'admin.crm.offices', label: 'Офисы', path: '/admin/crm/offices' },
  { id: 'admin.crm.managers', label: 'Менеджеры', path: '/admin/crm/managers' },
  { id: 'admin.crm.customers', label: 'Клиенты', path: '/admin/crm/customers' },
  { id: 'admin.forms', label: 'Заявки с форм', path: '/admin/forms' },
  { id: 'admin.support', label: 'Чат поддержки', path: '/admin/support' },
  { id: 'admin.crm.funnel', label: 'Воронка продаж', path: '/admin/crm/funnel' },
  { id: 'admin.crm.tasks', label: 'Задачи', path: '/admin/crm/tasks' },
  { id: 'admin.crm.payroll', label: 'Расчёт з/п', path: '/admin/crm/payroll' },
  {
    id: 'admin.crm.payroll.management',
    label: 'Расчёт з/п — Управление',
    path: '/admin/crm/payroll/management',
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
  { id: 'admin.content.photo', label: 'Фото', path: '/admin/content/photo' },
  { id: 'admin.content.comments', label: 'Комментарии', path: '/admin/content/comments' },
  { id: 'admin.content.navigation', label: 'Меню навигации', path: '/admin/content/navigation' },
  { id: 'admin.content.footer', label: 'Футер', path: '/admin/content/footer' },
  { id: 'admin.catalog', label: 'Каталог', path: '/admin/catalog' },
  { id: 'admin.catalog.products', label: 'Товары', path: '/admin/catalog/products' },
  { id: 'admin.catalog.categories', label: 'Категории', path: '/admin/catalog/categories' },
  { id: 'admin.catalog.attributes', label: 'Характеристики', path: '/admin/catalog/attributes' },
  { id: 'admin.partners', label: 'Партнёры', path: '/admin/partners' },
  { id: 'admin.catalog.suppliers', label: 'Поставщики', path: '/admin/catalog/suppliers' },
  { id: 'admin.orders', label: 'Заказы', path: '/admin/orders' },
  { id: 'admin.orders.shipping', label: 'Доставка', path: '/admin/orders/shipping' },
  { id: 'admin.orders.payments', label: 'Оплаты', path: '/admin/orders/payments' },
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
    id: 'admin.settings.user-cabinet',
    label: 'Личный кабинет',
    path: '/admin/settings/user-cabinet',
  },
  {
    id: 'admin.settings.notifications',
    label: 'Уведомления',
    path: '/admin/settings/notifications',
  },
  { id: 'admin.settings.roles', label: 'Роли', path: '/admin/settings/roles' },
  { id: 'admin.users', label: 'Управление пользователями', path: '/admin/users' },
];
