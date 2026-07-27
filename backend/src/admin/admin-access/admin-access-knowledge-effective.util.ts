import { UserRole } from '@prisma/client';
import { getUserEffectiveAccessForResource } from './access-effective.util';
import { AdminResourcePermissionLevel } from './dto/set-permission.dto';
import { KNOWLEDGE_RESOURCE_ID, KNOWLEDGE_TESTS_RESOURCE_ID } from './knowledge-resources.util';

export type AccessPermissionContext = {
  userPerms: Array<{ resourceId: string; permission: string }>;
  rolePermsForUser: Array<{ resourceId: string; permission: string }>;
  allRolePermsForRole: Array<{ resourceId: string; permission: AdminResourcePermissionLevel }>;
};

export type EffectivePermissionLevel = 'VIEW' | 'PARTICIPATE' | 'EDIT' | 'DENIED' | 'NONE';

export function computeDirectEffectivePermission(
  resourceId: string,
  userRole: UserRole,
  ctx: AccessPermissionContext,
): EffectivePermissionLevel {
  const userExplicit = ctx.userPerms.find((p) => p.resourceId === resourceId)?.permission as
    | AdminResourcePermissionLevel
    | undefined;
  const roleExplicit = ctx.rolePermsForUser.find((p) => p.resourceId === resourceId)?.permission as
    | AdminResourcePermissionLevel
    | undefined;

  return getUserEffectiveAccessForResource(
    resourceId,
    userRole,
    userExplicit,
    roleExplicit,
    ctx.allRolePermsForRole,
  );
}

export function computeKnowledgeSubResourceEffectivePermission(
  resourceId: string,
  userRole: UserRole,
  ctx: AccessPermissionContext,
): EffectivePermissionLevel {
  const direct = computeDirectEffectivePermission(resourceId, userRole, ctx);
  if (direct === 'DENIED') return 'DENIED';
  if (direct === 'VIEW' || direct === 'PARTICIPATE' || direct === 'EDIT') return direct;

  const parent = computeDirectEffectivePermission(KNOWLEDGE_RESOURCE_ID, userRole, ctx);
  if (parent === 'DENIED') return 'DENIED';
  if (parent === 'VIEW' || parent === 'PARTICIPATE' || parent === 'EDIT') return parent;
  return 'NONE';
}

export function computeKnowledgeTestsBlockEffectivePermission(
  userRole: UserRole,
  ctx: AccessPermissionContext,
): EffectivePermissionLevel {
  return computeKnowledgeSubResourceEffectivePermission(KNOWLEDGE_TESTS_RESOURCE_ID, userRole, ctx);
}

export function computeKnowledgeCategoryEffectivePermission(
  categoryResourceId: string,
  userRole: UserRole,
  ctx: AccessPermissionContext,
): EffectivePermissionLevel {
  return computeKnowledgeSubResourceEffectivePermission(categoryResourceId, userRole, ctx);
}

export function computeKnowledgeCategoryTestsEffectivePermission(
  categoryTestsResourceId: string,
  userRole: UserRole,
  ctx: AccessPermissionContext,
): EffectivePermissionLevel {
  const direct = computeDirectEffectivePermission(categoryTestsResourceId, userRole, ctx);
  if (direct === 'DENIED') return 'DENIED';
  if (direct === 'VIEW' || direct === 'PARTICIPATE' || direct === 'EDIT') return direct;

  const testsBlock = computeKnowledgeTestsBlockEffectivePermission(userRole, ctx);
  if (testsBlock === 'DENIED') return 'DENIED';
  if (testsBlock === 'VIEW' || testsBlock === 'PARTICIPATE' || testsBlock === 'EDIT') {
    return testsBlock;
  }

  const parent = computeDirectEffectivePermission(KNOWLEDGE_RESOURCE_ID, userRole, ctx);
  if (parent === 'DENIED') return 'DENIED';
  if (parent === 'VIEW' || parent === 'PARTICIPATE' || parent === 'EDIT') return parent;
  return 'NONE';
}
