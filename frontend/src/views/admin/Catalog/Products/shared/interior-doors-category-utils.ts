/**
 * Определение дерева категорий «Межкомнатные двери» для админки (комплектующие, подсказки).
 * Дерево приходит из GET /categories (вложенные children).
 */

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  /** По умолчанию true; false — размеры в карточке товара не обязательны. */
  sizesRequired?: boolean;
  children?: CategoryTreeNode[];
}

/** Узел-корень «Межкомнатные двери» в каталоге */
export function matchesInteriorDoorsRootCategory(cat: CategoryTreeNode): boolean {
  const name = cat.name.toLowerCase();
  const slug = cat.slug.toLowerCase();
  const nameMatch = name.includes('межкомнат') && name.includes('двер');
  const slugMatch =
    (slug.includes('mezhkomnat') && (slug.includes('dver') || slug.includes('door'))) ||
    slug.includes('mezhkomnatnye-dveri') ||
    slug.includes('dveri-mezhkomnat');
  return nameMatch || slugMatch;
}

/**
 * Корневая категория «Межкомнатные двери», внутри которой лежит выбранная категория.
 * null — товар не в этой ветке или категория не найдена в дереве.
 */
function findInteriorDoorsRootForSelectionInner(
  tree: CategoryTreeNode[],
  targetId: string,
  activeRoot: CategoryTreeNode | null
): CategoryTreeNode | null | undefined {
  for (const n of tree) {
    const nextRoot = matchesInteriorDoorsRootCategory(n) ? n : activeRoot;
    if (n.id === targetId) {
      return nextRoot;
    }
    if (n.children?.length) {
      const found = findInteriorDoorsRootForSelectionInner(n.children, targetId, nextRoot);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function findInteriorDoorsRootForSelection(
  tree: CategoryTreeNode[],
  targetId: string
): CategoryTreeNode | null {
  const r = findInteriorDoorsRootForSelectionInner(tree, targetId, null);
  return r === undefined ? null : r;
}

/** Все ID категорий в поддеревьях корней «Межкомнатные двери» (корень + потомки) */
export function collectInteriorDoorsSubtreeIdsFromRoots(tree: CategoryTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const collectSubtree = (node: CategoryTreeNode) => {
    ids.add(node.id);
    for (const ch of node.children ?? []) {
      collectSubtree(ch);
    }
  };
  const walk = (nodes: CategoryTreeNode[]) => {
    for (const n of nodes) {
      if (matchesInteriorDoorsRootCategory(n)) {
        collectSubtree(n);
      }
      if (n.children?.length) {
        walk(n.children);
      }
    }
  };
  walk(tree);
  return ids;
}

/** Найти категорию по id в дереве (включая вложенные). */
export function findCategoryInTree<T extends CategoryTreeNode>(
  tree: T[],
  categoryId: string
): T | null {
  for (const node of tree) {
    if (node.id === categoryId) return node;
    if (node.children?.length) {
      const found = findCategoryInTree(node.children as T[], categoryId);
      if (found) return found;
    }
  }
  return null;
}
