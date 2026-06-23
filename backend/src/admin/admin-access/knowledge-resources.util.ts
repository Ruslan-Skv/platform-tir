export const KNOWLEDGE_RESOURCE_ID = 'admin.knowledge';

export const KNOWLEDGE_CATEGORY_RESOURCE_PREFIX = 'admin.knowledge.category.';

export function buildKnowledgeCategoryResourceId(categoryId: string): string {
  return `${KNOWLEDGE_CATEGORY_RESOURCE_PREFIX}${categoryId}`;
}

export function parseKnowledgeCategoryResourceId(resourceId: string): string | null {
  if (!resourceId.startsWith(KNOWLEDGE_CATEGORY_RESOURCE_PREFIX)) {
    return null;
  }
  const categoryId = resourceId.slice(KNOWLEDGE_CATEGORY_RESOURCE_PREFIX.length);
  return categoryId.length > 0 ? categoryId : null;
}

export function isKnowledgeCategoryResourceId(resourceId: string): boolean {
  return parseKnowledgeCategoryResourceId(resourceId) !== null;
}
