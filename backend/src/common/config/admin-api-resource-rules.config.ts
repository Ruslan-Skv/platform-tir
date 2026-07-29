import { AdminResourcePermissionLevel } from '../../common/types/admin-resource-permission-level';

import { resolveAdminApiRouteResource } from './admin-api-route-resources.config';

export type AdminApiResourceRule = {
  resourceId: string;

  methods: string[];

  pathPattern: RegExp;

  level:
    | AdminResourcePermissionLevel.VIEW
    | AdminResourcePermissionLevel.PARTICIPATE
    | AdminResourcePermissionLevel.EDIT;
};

/**

 * Shared-read маршруты без проверки resourceId (достаточно JwtAuth + @Roles).

 * Направления/список CRM-пользователей нужны топ-разделам (Договора, Замеры, Заказчики),

 * даже если хаб admin.crm явно закрыт — DENIED с хаба не наследуется на эти разделы.

 */

export const ADMIN_API_RESOURCE_SKIPS: ReadonlyArray<{
  methods: string[];
  pathPattern: RegExp;
}> = [
  {
    methods: ['GET', 'HEAD'],
    pathPattern: /^\/api\/v1\/admin\/crm-directions$/,
  },
  {
    methods: ['GET', 'HEAD'],
    pathPattern: /^\/api\/v1\/admin\/crm-directions\/users\/list$/,
  },
  {
    methods: ['GET', 'HEAD'],
    pathPattern: /^\/api\/v1\/admin\/crm-directions\/users\/me\/directions$/,
  },
  // Колокольчик / личная доставка / push: JWT + роль админки, без admin.settings.notifications
  {
    methods: ['GET', 'HEAD'],
    pathPattern: /^\/api\/v1\/admin\/notifications\/settings$/,
  },
  {
    methods: ['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE'],
    pathPattern: /^\/api\/v1\/admin\/notifications\/settings\/me$/,
  },
  {
    methods: ['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE'],
    pathPattern: /^\/api\/v1\/admin\/notifications\/(bell|push)(?:\/|$)/,
  },
  // Лента непромодерированных отзывов для колокольчика (не страница настроек отзывов)
  {
    methods: ['GET', 'HEAD'],
    pathPattern: /^\/api\/v1\/admin\/reviews$/,
  },
];

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

  // ——— Территория знаний: социальные действия (нужен уровень «Участие») ———

  {
    resourceId: 'admin.knowledge',

    methods: ['PATCH'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/like$/,

    level: AdminResourcePermissionLevel.PARTICIPATE,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['PATCH'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/favorite$/,

    level: AdminResourcePermissionLevel.PARTICIPATE,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['GET', 'POST'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/comments$/,

    level: AdminResourcePermissionLevel.PARTICIPATE,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['POST'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/feedback$/,

    level: AdminResourcePermissionLevel.PARTICIPATE,
  },

  // Прогресс обучения (тест, видео, отметка «изучено») — с уровня «Просмотр»
  {
    resourceId: 'admin.knowledge',

    methods: ['POST', 'PATCH'],

    pathPattern:
      /^\/api\/v1\/admin\/knowledge\/materials\/[^/]+\/(quiz\/submit|progress|study-complete)$/,

    level: AdminResourcePermissionLevel.VIEW,
  },

  {
    resourceId: 'admin.knowledge',

    methods: ['POST'],

    pathPattern: /^\/api\/v1\/admin\/knowledge\/category-tests\/[^/]+\/submit$/,

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
  level:
    | AdminResourcePermissionLevel.VIEW
    | AdminResourcePermissionLevel.PARTICIPATE
    | AdminResourcePermissionLevel.EDIT;
} | null {
  const pathOnly = requestPath.split('?')[0] ?? requestPath;

  const upperMethod = method.toUpperCase();

  for (const skip of ADMIN_API_RESOURCE_SKIPS) {
    if (!skip.methods.includes(upperMethod)) continue;
    if (skip.pathPattern.test(pathOnly)) {
      return null;
    }
  }

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
  effective: 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE',

  required:
    | AdminResourcePermissionLevel.VIEW
    | AdminResourcePermissionLevel.PARTICIPATE
    | AdminResourcePermissionLevel.EDIT,
): boolean {
  if (effective === 'DENIED' || effective === 'NONE') return false;

  if (required === AdminResourcePermissionLevel.EDIT) {
    return effective === 'EDIT';
  }

  if (required === AdminResourcePermissionLevel.PARTICIPATE) {
    return effective === 'PARTICIPATE' || effective === 'EDIT';
  }

  return effective === 'VIEW' || effective === 'PARTICIPATE' || effective === 'EDIT';
}
