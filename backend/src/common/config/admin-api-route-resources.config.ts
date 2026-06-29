/**
 * Сопоставление префиксов API с resourceId админки.
 * При совпадении: GET/HEAD → VIEW, мутации → EDIT (если нет исключения в admin-api-resource-rules).
 * Список отсортирован по длине prefix (длиннейший первым) при резолве.
 */
export const ADMIN_API_SKIPPED_PREFIXES = [
  '/api/v1/admin/access',
  '/api/v1/admin/presence',
] as const;

const ADMIN_API_ROUTE_RESOURCE_PREFIXES_RAW: ReadonlyArray<{
  prefix: string;
  resourceId: string;
}> = [
  // Бухгалтерия — счета (вложенные маршруты пакетов договоров)
  {
    prefix: '/api/v1/admin/contract-document-packages/payment-invoices',
    resourceId: 'admin.accounting.invoices',
  },
  // Настройки каталога (справочники)
  {
    prefix: '/api/v1/admin/catalog/coating-materials',
    resourceId: 'admin.settings.catalog-coating-materials',
  },
  {
    prefix: '/api/v1/admin/catalog/door-thicknesses',
    resourceId: 'admin.settings.catalog-door-thicknesses',
  },
  {
    prefix: '/api/v1/admin/catalog/canvas-types',
    resourceId: 'admin.settings.catalog-canvas-types',
  },
  {
    prefix: '/api/v1/admin/catalog/weatherstrips',
    resourceId: 'admin.settings.catalog-weatherstrips',
  },
  {
    prefix: '/api/v1/admin/catalog/manufacturers',
    resourceId: 'admin.settings.catalog-manufacturers',
  },
  {
    prefix: '/api/v1/admin/catalog/hub-preview',
    resourceId: 'admin.settings.catalog-hub-preview',
  },
  {
    prefix: '/api/v1/admin/catalog-filter-blocks',
    resourceId: 'admin.settings.catalog-filters',
  },
  {
    prefix: '/api/v1/admin/product-card-badges',
    resourceId: 'admin.settings.catalog-badges',
  },
  { prefix: '/api/v1/admin/catalog-block', resourceId: 'admin.settings.catalog' },
  // Каталог
  { prefix: '/api/v1/admin/catalog/products', resourceId: 'admin.catalog.products' },
  { prefix: '/api/v1/admin/catalog/suppliers', resourceId: 'admin.catalog.suppliers' },
  { prefix: '/api/v1/admin/catalog/attributes', resourceId: 'admin.catalog.attributes' },
  // Контент — главная
  {
    prefix: '/api/v1/admin/home/featured-products',
    resourceId: 'admin.content.featured-products',
  },
  {
    prefix: '/api/v1/admin/home/partner-products',
    resourceId: 'admin.settings.partner-products',
  },
  { prefix: '/api/v1/admin/home/contact-form', resourceId: 'admin.content.contact-form' },
  { prefix: '/api/v1/admin/home/directions', resourceId: 'admin.content.directions' },
  { prefix: '/api/v1/admin/home/advantages', resourceId: 'admin.content.advantages' },
  { prefix: '/api/v1/admin/home/services', resourceId: 'admin.content.services' },
  { prefix: '/api/v1/admin/home/hero', resourceId: 'admin.content.hero' },
  { prefix: '/api/v1/admin/home/footer', resourceId: 'admin.content.footer' },
  { prefix: '/api/v1/admin/home/sections', resourceId: 'admin.content.home' },
  { prefix: '/api/v1/admin/settings/seller-legal', resourceId: 'admin.settings.seller-legal' },
  {
    prefix: '/api/v1/admin/settings/site-disclaimer',
    resourceId: 'admin.settings.site-disclaimer',
  },
  { prefix: '/api/v1/admin/settings/public-offers', resourceId: 'admin.settings.public-offer' },
  // Договоры и оформление
  {
    prefix: '/api/v1/admin/contract-document-packages',
    resourceId: 'admin.contract-documents.repair',
  },
  {
    prefix: '/api/v1/admin/contract-document-objects',
    resourceId: 'admin.contract-documents',
  },
  { prefix: '/api/v1/admin/contracts', resourceId: 'admin.contract-documents.repair' },
  // CRM
  { prefix: '/api/v1/admin/contract-payments', resourceId: 'admin.crm.contract-payments' },
  { prefix: '/api/v1/admin/office-cash', resourceId: 'admin.crm.cash-register' },
  { prefix: '/api/v1/admin/measurements', resourceId: 'admin.crm.measurements' },
  { prefix: '/api/v1/admin/customers', resourceId: 'admin.crm.customers' },
  { prefix: '/api/v1/admin/installers', resourceId: 'admin.crm.installers' },
  { prefix: '/api/v1/admin/offices', resourceId: 'admin.crm.offices' },
  { prefix: '/api/v1/admin/tasks', resourceId: 'admin.crm.tasks' },
  { prefix: '/api/v1/admin/crm-directions', resourceId: 'admin.crm' },
  { prefix: '/api/v1/admin/complex-objects', resourceId: 'admin.crm.customers' },
  // Прочие разделы админки
  { prefix: '/api/v1/admin/knowledge', resourceId: 'admin.knowledge' },
  { prefix: '/api/v1/admin/forms', resourceId: 'admin.forms' },
  { prefix: '/api/v1/admin/leads', resourceId: 'admin.forms' },
  { prefix: '/api/v1/admin/quiz', resourceId: 'admin.quiz' },
  { prefix: '/api/v1/admin/blog', resourceId: 'admin.content.blog' },
  { prefix: '/api/v1/admin/promotions', resourceId: 'admin.content.promotions' },
  { prefix: '/api/v1/admin/photo', resourceId: 'admin.content.photo' },
  { prefix: '/api/v1/admin/pages', resourceId: 'admin.content.pages' },
  { prefix: '/api/v1/admin/navigation', resourceId: 'admin.content.navigation' },
  { prefix: '/api/v1/admin/orders', resourceId: 'admin.orders' },
  { prefix: '/api/v1/admin/partners', resourceId: 'admin.partners' },
  { prefix: '/api/v1/admin/service-catalog', resourceId: 'admin.service-catalog' },
  { prefix: '/api/v1/admin/recruitment', resourceId: 'admin.recruitment' },
  { prefix: '/api/v1/admin/analytics', resourceId: 'admin.analytics' },
  { prefix: '/api/v1/admin/notifications', resourceId: 'admin.settings.notifications' },
  { prefix: '/api/v1/admin/user-cabinet', resourceId: 'admin.settings.user-cabinet' },
  { prefix: '/api/v1/admin/reviews', resourceId: 'admin.settings.reviews' },
  { prefix: '/api/v1/admin/dashboard', resourceId: 'admin' },
  { prefix: '/api/v1/admin/site-public', resourceId: 'admin.settings' },
  { prefix: '/api/v1/admin/site-feedback', resourceId: 'admin.settings' },
  // Маршруты вне admin/, используемые UI админки
  { prefix: '/api/v1/categories', resourceId: 'admin.catalog.categories' },
  { prefix: '/api/v1/attributes', resourceId: 'admin.catalog.attributes' },
  { prefix: '/api/v1/users', resourceId: 'admin.users' },
  { prefix: '/api/v1/products', resourceId: 'admin.catalog.products' },
  { prefix: '/api/v1/product-components', resourceId: 'admin.catalog.products' },
  { prefix: '/api/v1/support', resourceId: 'admin.support' },
];

export const ADMIN_API_ROUTE_RESOURCE_PREFIXES = [...ADMIN_API_ROUTE_RESOURCE_PREFIXES_RAW].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function resolveAdminApiRouteResource(
  method: string,
  requestPath: string,
): { resourceId: string; isMutation: boolean } | null {
  const pathOnly = requestPath.split('?')[0] ?? requestPath;

  if (ADMIN_API_SKIPPED_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) {
    return null;
  }

  for (const { prefix, resourceId } of ADMIN_API_ROUTE_RESOURCE_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return {
        resourceId,
        isMutation: MUTATION_METHODS.has(method.toUpperCase()),
      };
    }
  }

  return null;
}
