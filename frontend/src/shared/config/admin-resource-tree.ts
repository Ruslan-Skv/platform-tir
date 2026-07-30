/**
 * Зеркало backend/src/admin/admin-access/admin-resource-tree.config.ts
 * Явный родитель ресурса по структуре сайдбара админки.
 */
import {
  KNOWLEDGE_CATEGORY_RESOURCE_PREFIX,
  KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX,
  KNOWLEDGE_RESOURCE_ID,
  KNOWLEDGE_TESTS_RESOURCE_ID,
} from './admin-knowledge-resources';

export const ADMIN_RESOURCE_PARENT: Readonly<Record<string, string>> = {
  'admin.crm.contract-payments': 'admin.crm',
  'admin.crm.cash-register': 'admin.crm',
  'admin.crm.supplier-settlements': 'admin.crm',
  'admin.crm.offices': 'admin.crm',
  // admin.forms / admin.forms.director / admin.support / admin.crm.my-work-day — топ-пункты сайдбара
  'admin.crm.funnel': 'admin.crm',
  'admin.crm.tasks': 'admin.crm',
  'admin.crm.work-days': 'admin.crm',
  'admin.crm.payroll': 'admin.crm',
  'admin.crm.payroll.management': 'admin.crm.payroll',
  'admin.crm.contract-payments.incassation': 'admin.crm.contract-payments',

  'admin.accounting.invoices': 'admin.accounting',

  'admin.contract-documents': 'admin.settings',
  'admin.contract-documents.requisites': 'admin.contract-documents',
  'admin.contract-documents.signatories': 'admin.contract-documents',
  'admin.contract-documents.templates': 'admin.contract-documents',
  'admin.contract-documents.repair-settings': 'admin.contract-documents',
  'admin.contract-documents.numbering': 'admin.contract-documents',
  'admin.contract-documents.markups': 'admin.contract-documents',

  'admin.content.home': 'admin.content',
  'admin.content.hero': 'admin.content.home',
  'admin.content.directions': 'admin.content.home',
  'admin.content.advantages': 'admin.content.home',
  'admin.content.services': 'admin.content.home',
  'admin.content.featured-products': 'admin.content.home',
  'admin.content.contact-form': 'admin.content.home',
  'admin.content.pages': 'admin.content',
  'admin.content.blog': 'admin.content',
  'admin.content.promotions': 'admin.content',
  'admin.content.careers': 'admin.content',
  'admin.content.contacts': 'admin.content',
  'admin.content.mission': 'admin.content',
  'admin.content.photo': 'admin.content',
  'admin.content.comments': 'admin.content',
  'admin.content.navigation': 'admin.content',
  'admin.content.footer': 'admin.content',

  'admin.quiz.mebel': 'admin.quiz',
  'admin.quiz.remont': 'admin.quiz',

  'admin.catalog.products': 'admin.catalog',
  'admin.catalog.categories': 'admin.catalog',
  'admin.catalog.attributes': 'admin.catalog',
  'admin.catalog.components': 'admin.catalog',

  'admin.price-lists.ceilings': 'admin.price-lists',

  'admin.service-catalog.items': 'admin.service-catalog',

  'admin.orders.checkout-info': 'admin.orders',
  'admin.orders.shipping': 'admin.orders',
  'admin.orders.payments': 'admin.orders',

  'admin.knowledge.tests': 'admin.knowledge',

  'admin.recruitment.analytics': 'admin.recruitment',

  'admin.analytics.sales': 'admin.analytics',
  'admin.analytics.financial': 'admin.analytics',
  'admin.analytics.managers': 'admin.analytics',
  'admin.analytics.marketing': 'admin.analytics',

  'admin.settings.appearance': 'admin.settings',
  'admin.settings.product-templates': 'admin.settings',
  'admin.settings.partner-products': 'admin.settings',
  'admin.settings.reviews': 'admin.settings',
  'admin.settings.catalog': 'admin.settings',
  'admin.settings.catalog-badges': 'admin.settings',
  'admin.settings.catalog-dropdown-lists': 'admin.settings',
  'admin.settings.catalog-manufacturers': 'admin.settings.catalog-dropdown-lists',
  'admin.settings.catalog-coating-materials': 'admin.settings.catalog-dropdown-lists',
  'admin.settings.catalog-canvas-types': 'admin.settings.catalog-dropdown-lists',
  'admin.settings.catalog-door-thicknesses': 'admin.settings.catalog-dropdown-lists',
  'admin.settings.catalog-weatherstrips': 'admin.settings.catalog-dropdown-lists',
  'admin.settings.catalog-filters': 'admin.settings',
  'admin.settings.catalog-hub-preview': 'admin.settings',
  'admin.settings.user-cabinet': 'admin.settings',
  'admin.settings.notifications': 'admin.settings',
  'admin.settings.notification-channels': 'admin.settings',
  'admin.settings.checkout': 'admin.settings',
  'admin.settings.seller-legal': 'admin.settings',
  'admin.settings.site-disclaimer': 'admin.settings',
  'admin.settings.public-offer': 'admin.settings',
  'admin.settings.delivery': 'admin.settings',
  'admin.settings.admin-link': 'admin.settings',
  'admin.settings.quote-form': 'admin.settings',
  'admin.settings.pwa': 'admin.settings',
  'admin.settings.work-days': 'admin.settings',
  'admin.settings.roles': 'admin.settings',
  'admin.users': 'admin.settings',
};

export function getAdminResourceParent(resourceId: string): string | null {
  if (resourceId.startsWith(KNOWLEDGE_CATEGORY_RESOURCE_PREFIX)) {
    return KNOWLEDGE_RESOURCE_ID;
  }
  if (resourceId.startsWith(KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX)) {
    return KNOWLEDGE_TESTS_RESOURCE_ID;
  }
  if (resourceId === KNOWLEDGE_TESTS_RESOURCE_ID) {
    return KNOWLEDGE_RESOURCE_ID;
  }
  return ADMIN_RESOURCE_PARENT[resourceId] ?? null;
}

export function getAdminResourceChildren(parentId: string): string[] {
  return Object.entries(ADMIN_RESOURCE_PARENT)
    .filter(([, parent]) => parent === parentId)
    .map(([child]) => child);
}

export function canRoleSeeAdminSettingsNav(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

const SETTINGS_RESTRICTED_ROOTS = [
  'admin.settings',
  'admin.contract-documents',
  'admin.users',
] as const;

export function isAdminSettingsRestrictedResource(resourceId: string): boolean {
  if (
    SETTINGS_RESTRICTED_ROOTS.includes(resourceId as (typeof SETTINGS_RESTRICTED_ROOTS)[number])
  ) {
    return true;
  }
  let current = getAdminResourceParent(resourceId);
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (SETTINGS_RESTRICTED_ROOTS.includes(current as (typeof SETTINGS_RESTRICTED_ROOTS)[number])) {
      return true;
    }
    seen.add(current);
    current = getAdminResourceParent(current);
  }
  return false;
}
