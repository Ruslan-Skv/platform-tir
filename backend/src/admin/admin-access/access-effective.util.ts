import { UserRole } from '@prisma/client';
import { AdminResourcePermissionLevel } from './dto/set-permission.dto';
import {
  canRoleAccessAdminSettingsResources,
  getAdminResourceAncestors,
  isAdminSettingsRestrictedResource,
} from './admin-resource-tree.config';
import {
  isKnowledgeCategoryResourceId,
  isKnowledgeCategoryTestsResourceId,
  KNOWLEDGE_RESOURCE_ID,
  KNOWLEDGE_TESTS_RESOURCE_ID,
} from './knowledge-resources.util';
import { ROLE_DEFAULT_RESOURCES } from './role-default-resources.config';

export type RoleAccessSource =
  | 'super_admin'
  | 'default'
  | 'role_override'
  | 'role_denied'
  | 'inherited_denied'
  | 'none';

export type EffectiveAccess = 'EDIT' | 'PARTICIPATE' | 'VIEW' | 'NONE' | 'DENIED';

export interface RoleAccessOverviewItem {
  role: UserRole;
  effective: EffectiveAccess;
  source: RoleAccessSource;
  overridePermission?: AdminResourcePermissionLevel;
  hasExplicitOverride: boolean;
}

type RolePermissionRow = {
  resourceId: string;
  permission: AdminResourcePermissionLevel;
};

function isResourceDeniedByRolePermissions(
  resourceId: string,
  rolePerms: RolePermissionRow[],
): boolean {
  const deniedIds = new Set(
    rolePerms.filter((p) => p.permission === 'DENIED').map((p) => p.resourceId),
  );
  if (deniedIds.has(resourceId)) return true;
  return getAdminResourceAncestors(resourceId).some((ancestorId) => deniedIds.has(ancestorId));
}

export function getRoleEffectiveAccessForResource(
  resourceId: string,
  role: UserRole,
  explicitPerm: AdminResourcePermissionLevel | undefined,
  allRolePermsForRole: RolePermissionRow[],
): RoleAccessOverviewItem {
  if (role === 'SUPER_ADMIN') {
    return {
      role,
      effective: 'EDIT',
      source: 'super_admin',
      hasExplicitOverride: false,
    };
  }

  if (!canRoleAccessAdminSettingsResources(role) && isAdminSettingsRestrictedResource(resourceId)) {
    return {
      role,
      effective: 'NONE',
      source: 'none',
      hasExplicitOverride: false,
    };
  }

  if (explicitPerm === 'DENIED') {
    return {
      role,
      effective: 'DENIED',
      source: 'role_denied',
      overridePermission: AdminResourcePermissionLevel.DENIED,
      hasExplicitOverride: true,
    };
  }

  if (explicitPerm === 'VIEW' || explicitPerm === 'PARTICIPATE' || explicitPerm === 'EDIT') {
    return {
      role,
      effective: explicitPerm,
      source: 'role_override',
      overridePermission: explicitPerm,
      hasExplicitOverride: true,
    };
  }

  if (isResourceDeniedByRolePermissions(resourceId, allRolePermsForRole)) {
    return {
      role,
      effective: 'DENIED',
      source: 'inherited_denied',
      hasExplicitOverride: false,
    };
  }

  const defaults = ROLE_DEFAULT_RESOURCES[role] ?? ['admin'];
  if (defaults.includes(resourceId)) {
    return {
      role,
      effective: 'EDIT',
      source: 'default',
      hasExplicitOverride: false,
    };
  }

  return {
    role,
    effective: 'NONE',
    source: 'none',
    hasExplicitOverride: false,
  };
}

export function getRoleEffectiveAccessForResourceWithInheritance(
  resourceId: string,
  role: UserRole,
  explicitPerm: AdminResourcePermissionLevel | undefined,
  allRolePermsForRole: RolePermissionRow[],
): RoleAccessOverviewItem {
  const item = getRoleEffectiveAccessForResource(
    resourceId,
    role,
    explicitPerm,
    allRolePermsForRole,
  );

  if (
    (!isKnowledgeCategoryResourceId(resourceId) &&
      !isKnowledgeCategoryTestsResourceId(resourceId) &&
      resourceId !== KNOWLEDGE_TESTS_RESOURCE_ID) ||
    item.effective !== 'NONE'
  ) {
    return item;
  }

  const parentExplicit = allRolePermsForRole.find(
    (permission) => permission.resourceId === KNOWLEDGE_RESOURCE_ID,
  )?.permission;
  const parentItem = getRoleEffectiveAccessForResource(
    KNOWLEDGE_RESOURCE_ID,
    role,
    parentExplicit,
    allRolePermsForRole,
  );

  if (
    parentItem.effective === 'VIEW' ||
    parentItem.effective === 'PARTICIPATE' ||
    parentItem.effective === 'EDIT'
  ) {
    return {
      role,
      effective: parentItem.effective,
      source: parentItem.source,
      overridePermission: parentItem.overridePermission,
      hasExplicitOverride: false,
    };
  }

  return item;
}

export function getUserEffectiveAccessForResource(
  resourceId: string,
  userRole: UserRole,
  userExplicit: AdminResourcePermissionLevel | undefined,
  roleExplicit: AdminResourcePermissionLevel | undefined,
  allRolePermsForRole: RolePermissionRow[],
): EffectiveAccess {
  if (userRole === 'SUPER_ADMIN') {
    return 'EDIT';
  }

  if (
    !canRoleAccessAdminSettingsResources(userRole) &&
    isAdminSettingsRestrictedResource(resourceId)
  ) {
    return 'NONE';
  }

  if (userExplicit === AdminResourcePermissionLevel.DENIED) {
    return 'DENIED';
  }
  if (userExplicit === AdminResourcePermissionLevel.VIEW) {
    return 'VIEW';
  }
  if (userExplicit === AdminResourcePermissionLevel.PARTICIPATE) {
    return 'PARTICIPATE';
  }
  if (userExplicit === AdminResourcePermissionLevel.EDIT) {
    return 'EDIT';
  }

  return getRoleEffectiveAccessForResource(resourceId, userRole, roleExplicit, allRolePermsForRole)
    .effective;
}
