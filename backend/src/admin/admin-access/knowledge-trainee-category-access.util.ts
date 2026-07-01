import { KNOWLEDGE_CATEGORY_RESOURCE_PREFIX } from './knowledge-resources.util';

type PermissionRow = { resourceId: string; permission: string };

/** Закрыт ли подресурс знаний явным DENIED (не унаследованным от родителя). */
export function isKnowledgeSubResourceExplicitlyDenied(
  resourceId: string,
  resourcePrefix: string,
  userPerms: PermissionRow[],
  rolePerms: PermissionRow[],
): boolean {
  if (!resourceId.startsWith(resourcePrefix)) {
    return false;
  }

  const userPerm = userPerms.find((p) => p.resourceId === resourceId)?.permission;
  if (userPerm === 'DENIED') return true;

  const rolePerm = rolePerms.find((p) => p.resourceId === resourceId)?.permission;
  return rolePerm === 'DENIED';
}

/** Закрыта ли категория явным DENIED на ресурсе категории (не унаследованным от родителя). */
export function isKnowledgeCategoryExplicitlyDenied(
  categoryResourceId: string,
  userPerms: PermissionRow[],
  rolePerms: PermissionRow[],
): boolean {
  return isKnowledgeSubResourceExplicitlyDenied(
    categoryResourceId,
    KNOWLEDGE_CATEGORY_RESOURCE_PREFIX,
    userPerms,
    rolePerms,
  );
}
