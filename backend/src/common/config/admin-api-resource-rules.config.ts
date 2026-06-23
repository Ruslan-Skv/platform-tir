import { AdminResourcePermissionLevel } from '../../common/types/admin-resource-permission-level';

import { resolveAdminApiRouteResource } from './admin-api-route-resources.config';

export type AdminApiResourceRule = {
  resourceId: string;

  methods: string[];

  pathPattern: RegExp;

  level: AdminResourcePermissionLevel.VIEW | AdminResourcePermissionLevel.EDIT;
};

/**

 * Исключения из общего правила «GET → VIEW, мутации → EDIT».

 * Проверяются до префиксного сопоставления в admin-api-route-resources.config.

 */

export const ADMIN_API_RESOURCE_EXCEPTIONS: AdminApiResourceRule[] = [
  // ——— Товары: legacy-маршруты /products ———

  {
    resourceId: 'admin.catalog.products',

    methods: ['POST'],

    pathPattern: /^\/api\/v1\/products$/,

    level: AdminResourcePermissionLevel.EDIT,
  },

  {
    resourceId: 'admin.catalog.products',

    methods: ['PATCH', 'DELETE'],

    pathPattern: /^\/api\/v1\/products\/[^/]+$/,

    level: AdminResourcePermissionLevel.EDIT,
  },

  {
    resourceId: 'admin.catalog.products',

    methods: ['GET', 'HEAD'],

    pathPattern: /^\/api\/v1\/products\/admin\//,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.catalog.products',

    methods: ['POST'],

    pathPattern: /^\/api\/v1\/products\/admin\//,

    level: AdminResourcePermissionLevel.EDIT,
  },

  {
    resourceId: 'admin.catalog.products',

    methods: ['GET', 'HEAD'],

    pathPattern: /^\/api\/v1\/products\/scrape\//,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.catalog.products',

    methods: ['GET', 'HEAD'],

    pathPattern: /^\/api\/v1\/product-components\/admin\//,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.catalog.products',

    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],

    pathPattern: /^\/api\/v1\/product-components(?:\/|$)/,

    level: AdminResourcePermissionLevel.EDIT,
  },

  // ——— Воронка продаж (данные через customers/funnel) ———

  {
    resourceId: 'admin.crm.funnel',

    methods: ['GET', 'HEAD'],

    pathPattern: /^\/api\/v1\/admin\/customers\/funnel(?:\/|$)/,

    level: AdminResourcePermissionLevel.VIEW,
  },

  // ——— Территория знаний: социальные действия (достаточно «Просмотр») ———

  {
    resourceId: 'admin.knowledge',

    methods: ['PATCH'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/like$/,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['GET', 'POST'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/comments$/,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['POST'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/feedback$/,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['POST', 'PATCH'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/(quiz\/submit|video-progress)$/,

    level: AdminResourcePermissionLevel.VIEW,
  },

  // Модерация обратной связи и корзина — только при «Редактирование»

  {
    resourceId: 'admin.knowledge',

    methods: ['GET', 'HEAD'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/(feedback|trash)(?:\/|$)/,

    level: AdminResourcePermissionLevel.EDIT,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['PATCH', 'DELETE'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/feedback(?:\/|$)/,

    level: AdminResourcePermissionLevel.EDIT,
  },
];

export function matchAdminApiResourceRule(
  method: string,

  requestPath: string,
): {
  resourceId: string;
  level: AdminResourcePermissionLevel.VIEW | AdminResourcePermissionLevel.EDIT;
} | null {
  const pathOnly = requestPath.split('?')[0] ?? requestPath;

  const upperMethod = method.toUpperCase();

  for (const rule of ADMIN_API_RESOURCE_EXCEPTIONS) {
    if (!rule.methods.includes(upperMethod)) continue;

    if (rule.pathPattern.test(pathOnly)) {
      return { resourceId: rule.resourceId, level: rule.level };
    }
  }

  const route = resolveAdminApiRouteResource(method, requestPath);

  if (!route) return null;

  return {
    resourceId: route.resourceId,

    level: route.isMutation ? AdminResourcePermissionLevel.EDIT : AdminResourcePermissionLevel.VIEW,
  };
}

export function permissionLevelSatisfies(
  effective: 'VIEW' | 'EDIT' | 'DENIED' | 'NONE',

  required: AdminResourcePermissionLevel.VIEW | AdminResourcePermissionLevel.EDIT,
): boolean {
  if (effective === 'DENIED' || effective === 'NONE') return false;

  if (required === AdminResourcePermissionLevel.VIEW) {
    return effective === 'VIEW' || effective === 'EDIT';
  }

  return effective === 'EDIT';
}
