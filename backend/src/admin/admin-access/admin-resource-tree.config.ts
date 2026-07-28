import { UserRole } from '@prisma/client';
import {
  isKnowledgeCategoryResourceId,
  isKnowledgeCategoryTestsResourceId,
  KNOWLEDGE_RESOURCE_ID,
  KNOWLEDGE_TESTS_RESOURCE_ID,
} from './knowledge-resources.util';

/**
 * Явный родитель ресурса по структуре сайдбара админки.
 * Топ-пункты (Договора, Расчёты, Замеры, Заявки, Чат поддержки, …) сюда не входят — у них нет родителя.
 * Наследование DENIED идёт только по этой карте, не по префиксу resourceId.
 */
export const ADMIN_RESOURCE_PARENT: Readonly<Record<string, string>> = {
  // CRM
  'admin.crm.contract-payments': 'admin.crm',
  'admin.crm.cash-register': 'admin.crm',
  'admin.crm.supplier-settlements': 'admin.crm',
  'admin.crm.offices': 'admin.crm',
  // admin.forms / admin.support — топ-пункты сайдбара (как Замеры), не наследуют DENIED от CRM
  'admin.crm.funnel': 'admin.crm',
  'admin.crm.tasks': 'admin.crm',
  'admin.crm.my-work-day': 'admin.crm',
  'admin.crm.work-days': 'admin.crm.my-work-day',
  'admin.crm.payroll': 'admin.crm',
  'admin.crm.payroll.management': 'admin.crm.payroll',
  'admin.crm.contract-payments.incassation': 'admin.crm.contract-payments',

  // Бухгалтерия
  'admin.accounting.invoices': 'admin.accounting',

  // Настройки → Оформление договоров (не путать с топ-«Договора» / «Расчёты»)
  'admin.contract-documents': 'admin.settings',
  'admin.contract-documents.requisites': 'admin.contract-documents',
  'admin.contract-documents.signatories': 'admin.contract-documents',
  'admin.contract-documents.templates': 'admin.contract-documents',
  'admin.contract-documents.repair-settings': 'admin.contract-documents',
  'admin.contract-documents.markups': 'admin.contract-documents',

  // Контент
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

  // Квизы
  'admin.quiz.mebel': 'admin.quiz',
  'admin.quiz.remont': 'admin.quiz',

  // Каталог
  'admin.catalog.products': 'admin.catalog',
  'admin.catalog.categories': 'admin.catalog',
  'admin.catalog.attributes': 'admin.catalog',
  'admin.catalog.components': 'admin.catalog',

  // Прайсы
  'admin.price-lists.ceilings': 'admin.price-lists',

  // Ремонт квартир
  'admin.service-catalog.items': 'admin.service-catalog',

  // Заказы
  'admin.orders.checkout-info': 'admin.orders',
  'admin.orders.shipping': 'admin.orders',
  'admin.orders.payments': 'admin.orders',

  // Территория знаний
  'admin.knowledge.tests': 'admin.knowledge',

  // Подбор
  'admin.recruitment.analytics': 'admin.recruitment',

  // Аналитика
  'admin.analytics.sales': 'admin.analytics',
  'admin.analytics.financial': 'admin.analytics',
  'admin.analytics.managers': 'admin.analytics',
  'admin.analytics.marketing': 'admin.analytics',

  // Настройки
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

/** Ресурсы ветки «Настройки» (+ хаб оформления договоров) — только SUPER_ADMIN / ADMIN. */
const SETTINGS_RESTRICTED_ROOTS = [
  'admin.settings',
  'admin.contract-documents',
  'admin.users',
] as const;

export function getAdminResourceParent(resourceId: string): string | null {
  if (isKnowledgeCategoryResourceId(resourceId)) {
    return KNOWLEDGE_RESOURCE_ID;
  }
  if (isKnowledgeCategoryTestsResourceId(resourceId)) {
    return KNOWLEDGE_TESTS_RESOURCE_ID;
  }
  if (resourceId === KNOWLEDGE_TESTS_RESOURCE_ID) {
    return KNOWLEDGE_RESOURCE_ID;
  }
  return ADMIN_RESOURCE_PARENT[resourceId] ?? null;
}

/** Цепочка предков от ближайшего родителя к корню (без самого resourceId). */
export function getAdminResourceAncestors(resourceId: string): string[] {
  const ancestors: string[] = [];
  const seen = new Set<string>();
  let current: string | null = getAdminResourceParent(resourceId);
  while (current && !seen.has(current)) {
    ancestors.push(current);
    seen.add(current);
    current = getAdminResourceParent(current);
  }
  return ancestors;
}

export function isAdminSettingsRestrictedResource(resourceId: string): boolean {
  if (
    SETTINGS_RESTRICTED_ROOTS.includes(resourceId as (typeof SETTINGS_RESTRICTED_ROOTS)[number])
  ) {
    return true;
  }
  return getAdminResourceAncestors(resourceId).some((id) =>
    SETTINGS_RESTRICTED_ROOTS.includes(id as (typeof SETTINGS_RESTRICTED_ROOTS)[number]),
  );
}

export function canRoleAccessAdminSettingsResources(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}
