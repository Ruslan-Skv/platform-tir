// Возможные slug категории "Двери межкомнатные"
const INTERIOR_DOORS_SLUGS = ['interior-doors', 'dveri-mezhkomnatnye', 'mezhkomnatnye-dveri'];

/**
 * Проверяет, является ли slug категорией "Двери межкомнатные"
 */
function isInteriorDoorsSlug(slug: string): boolean {
  return INTERIOR_DOORS_SLUGS.includes(slug);
}

/**
 * Рекурсивно проверяет, является ли категория "Двери межкомнатные" или её дочерней категорией
 */
function checkCategoryRecursive(
  categoryId: string,
  categories: Array<{ id: string; slug: string; parentId?: string | null }>,
  visited = new Set<string>()
): boolean {
  // Предотвращаем бесконечные циклы
  if (visited.has(categoryId)) {
    return false;
  }
  visited.add(categoryId);

  // Находим категорию в списке
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    return false;
  }

  // Проверяем, является ли это категорией "Двери межкомнатные"
  if (isInteriorDoorsSlug(category.slug)) {
    return true;
  }

  // Если есть родительская категория, проверяем её рекурсивно
  if (category.parentId) {
    return checkCategoryRecursive(category.parentId, categories, visited);
  }

  return false;
}

/**
 * Проверяет, является ли категория "Двери межкомнатные" или её дочерней категорией
 * (упрощенная версия для случая, когда есть только slug и parent slug)
 */
export function isInteriorDoorsCategory(
  categorySlug: string,
  parentCategorySlug?: string | null
): boolean {
  // Проверяем, является ли это категорией "Двери межкомнатные"
  if (isInteriorDoorsSlug(categorySlug)) {
    return true;
  }

  // Проверяем, является ли родительская категория "Двери межкомнатные"
  if (parentCategorySlug && isInteriorDoorsSlug(parentCategorySlug)) {
    return true;
  }

  return false;
}

/**
 * Проверяет, является ли категория товара "Двери межкомнатные" или её дочерней категорией
 */
export function isInteriorDoorsProduct(category: {
  slug: string;
  parent?: { slug: string } | null;
}): boolean {
  return isInteriorDoorsCategory(category.slug, category.parent?.slug);
}

/**
 * Преобразует вложенную структуру категорий в плоский массив
 */
function flattenCategories(
  categories: Array<{
    id: string;
    slug: string;
    children?: Array<{ id: string; slug: string; parentId?: string | null }>;
  }>,
  parentId: string | null = null
): Array<{ id: string; slug: string; parentId: string | null }> {
  const result: Array<{ id: string; slug: string; parentId: string | null }> = [];

  for (const category of categories) {
    result.push({
      id: category.id,
      slug: category.slug,
      parentId,
    });

    if (category.children && category.children.length > 0) {
      // Рекурсивно обрабатываем дочерние категории
      const children = flattenCategories(category.children as any, category.id);
      result.push(...children);
    }
  }

  return result;
}

/**
 * Проверяет, является ли категория "Двери межкомнатные" или её дочерней категорией
 * по ID категории и списку всех категорий (для админки)
 * Поддерживает как плоский массив, так и вложенную структуру
 */
export function isInteriorDoorsCategoryById(
  categoryId: string,
  categories: Array<{ id: string; slug: string; parentId?: string | null; children?: any[] }>
): boolean {
  if (!categoryId || categories.length === 0) {
    console.log('❌ isInteriorDoorsCategoryById: нет categoryId или categories пуст');
    return false;
  }

  // Проверяем, является ли это вложенной структурой (есть children)
  const hasNestedStructure = categories.some((cat) => cat.children && cat.children.length > 0);

  // Если вложенная структура, преобразуем в плоскую
  const flatCategories = hasNestedStructure
    ? flattenCategories(categories as any)
    : (categories as Array<{ id: string; slug: string; parentId?: string | null }>);

  console.log('🔍 isInteriorDoorsCategoryById:', {
    categoryId,
    hasNestedStructure,
    flatCategoriesCount: flatCategories.length,
    targetCategory: flatCategories.find((c) => c.id === categoryId),
  });

  const result = checkCategoryRecursive(categoryId, flatCategories);
  console.log('✅ isInteriorDoorsCategoryById result:', result);
  return result;
}
