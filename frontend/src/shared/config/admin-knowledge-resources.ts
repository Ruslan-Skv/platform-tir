export const KNOWLEDGE_RESOURCE_ID = 'admin.knowledge';

export const KNOWLEDGE_TESTS_RESOURCE_ID = 'admin.knowledge.tests';

export const KNOWLEDGE_CATEGORY_RESOURCE_PREFIX = 'admin.knowledge.category.';

export const KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX = 'admin.knowledge.category-tests.';

export function buildKnowledgeCategoryResourceId(categoryId: string): string {
  return `${KNOWLEDGE_CATEGORY_RESOURCE_PREFIX}${categoryId}`;
}

export function buildKnowledgeCategoryTestsResourceId(categoryId: string): string {
  return `${KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX}${categoryId}`;
}

export function parseKnowledgeCategoryResourceId(resourceId: string): string | null {
  if (!resourceId.startsWith(KNOWLEDGE_CATEGORY_RESOURCE_PREFIX)) {
    return null;
  }
  const categoryId = resourceId.slice(KNOWLEDGE_CATEGORY_RESOURCE_PREFIX.length);
  return categoryId.length > 0 ? categoryId : null;
}

export function parseKnowledgeCategoryTestsResourceId(resourceId: string): string | null {
  if (!resourceId.startsWith(KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX)) {
    return null;
  }
  const categoryId = resourceId.slice(KNOWLEDGE_CATEGORY_TESTS_RESOURCE_PREFIX.length);
  return categoryId.length > 0 ? categoryId : null;
}

export function getKnowledgeCategoryResourceLabel(categoryName: string): string {
  return `Территория знаний — ${categoryName}`;
}

export function getKnowledgeCategoryTestsResourceLabel(categoryName: string): string {
  return `Территория знаний — тесты: ${categoryName}`;
}

export function getKnowledgeTestsResourceLabel(): string {
  return 'Территория знаний — итоговые тесты';
}

export function isKnowledgeCategoryResourceId(resourceId: string): boolean {
  return parseKnowledgeCategoryResourceId(resourceId) !== null;
}

export function isKnowledgeCategoryTestsResourceId(resourceId: string): boolean {
  return parseKnowledgeCategoryTestsResourceId(resourceId) !== null;
}
