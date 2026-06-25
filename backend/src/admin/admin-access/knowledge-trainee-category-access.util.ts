import { KNOWLEDGE_CATEGORY_RESOURCE_PREFIX } from './knowledge-resources.util';

type PermissionRow = { resourceId: string; permission: string };

/** Закрыта ли категория явным DENIED на ресурсе категории (не унаследованным от родителя). */
export function isKnowledgeCategoryExplicitlyDenied(
  categoryResourceId: string,
  userPerms: PermissionRow[],
  rolePerms: PermissionRow[],
): boolean {
  if (!categoryResourceId.startsWith(KNOWLEDGE_CATEGORY_RESOURCE_PREFIX)) {
    return false;
  }

  const userPerm = userPerms.find((p) => p.resourceId === categoryResourceId)?.permission;
  if (userPerm === 'DENIED') return true;

  const rolePerm = rolePerms.find((p) => p.resourceId === categoryResourceId)?.permission;
  return rolePerm === 'DENIED';
}
