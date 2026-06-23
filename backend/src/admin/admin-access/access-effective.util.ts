import { UserRole } from '@prisma/client';
import { AdminResourcePermissionLevel } from './dto/set-permission.dto';
import { isKnowledgeCategoryResourceId, KNOWLEDGE_RESOURCE_ID } from './knowledge-resources.util';
import { ROLE_DEFAULT_RESOURCES } from './role-default-resources.config';

export type RoleAccessSource =
  | 'super_admin'
  | 'default'
  | 'role_override'
  | 'role_denied'
  | 'inherited_denied'
  | 'none';

export type EffectiveAccess = 'EDIT' | 'VIEW' | 'NONE' | 'DENIED';

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
  return rolePerms.some(
    (p) =>
      p.permission === 'DENIED' &&
      (p.resourceId === resourceId || resourceId.startsWith(`${p.resourceId}.`)),
  );
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

  if (explicitPerm === 'DENIED') {
    return {
      role,
      effective: 'DENIED',
      source: 'role_denied',
      overridePermission: AdminResourcePermissionLevel.DENIED,
      hasExplicitOverride: true,
    };
  }

  if (explicitPerm === 'VIEW' || explicitPerm === 'EDIT') {
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

  if (!isKnowledgeCategoryResourceId(resourceId) || item.effective !== 'NONE') {
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

  if (parentItem.effective === 'VIEW' || parentItem.effective === 'EDIT') {
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

  if (userExplicit === AdminResourcePermissionLevel.DENIED) {
    return 'DENIED';
  }
  if (userExplicit === AdminResourcePermissionLevel.VIEW) {
    return 'VIEW';
  }
  if (userExplicit === AdminResourcePermissionLevel.EDIT) {
    return 'EDIT';
  }

  return getRoleEffectiveAccessForResource(resourceId, userRole, roleExplicit, allRolePermsForRole)
    .effective;
}
