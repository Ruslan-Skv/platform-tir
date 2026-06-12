import { SERVICE_CATALOG_UI_STORAGE_KEY } from './service-catalog-items-page.constants';
import type {
  CategoryMarkupLookupRow,
  ServiceCatalogCategory,
  ServiceCatalogItem,
  ServiceCatalogUiPersist,
  StructuralCategoryRow,
} from './service-catalog-items-page.types';

export function readServiceCatalogUiState(): ServiceCatalogUiPersist | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SERVICE_CATALOG_UI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const collapsedCategoryIds = Array.isArray(o.collapsedCategoryIds)
      ? o.collapsedCategoryIds.filter((x): x is string => typeof x === 'string')
      : [];
    const nestedChildBlocksHiddenRoots = Array.isArray(o.nestedChildBlocksHiddenRoots)
      ? o.nestedChildBlocksHiddenRoots.filter((x): x is string => typeof x === 'string')
      : [];
    return { collapsedCategoryIds, nestedChildBlocksHiddenRoots };
  } catch {
    return null;
  }
}

export function writeServiceCatalogUiState(
  collapsedCategoryIds: Set<string>,
  nestedChildBlocksHiddenRoots: Set<string>
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: ServiceCatalogUiPersist = {
      collapsedCategoryIds: [...collapsedCategoryIds],
      nestedChildBlocksHiddenRoots: [...nestedChildBlocksHiddenRoots],
    };
    localStorage.setItem(SERVICE_CATALOG_UI_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // квота / приватный режим
  }
}

export function flattenServiceCategories(
  cats: ServiceCatalogCategory[],
  level = 0
): Array<{ cat: ServiceCatalogCategory; level: number }> {
  const out: Array<{ cat: ServiceCatalogCategory; level: number }> = [];
  for (const c of cats) {
    out.push({ cat: c, level });
    if (c.children?.length) {
      out.push(...flattenServiceCategories(c.children, level + 1));
    }
  }
  return out;
}

/** Все id дочерних категорий (рекурсивно), без самой `node`. */
export function collectDescendantCategoryIds(node: ServiceCatalogCategory): string[] {
  const ids: string[] = [];
  if (!node.children?.length) return ids;
  for (const ch of node.children) {
    ids.push(ch.id, ...collectDescendantCategoryIds(ch));
  }
  return ids;
}

/** Сумма длин `items` по всем вложенным категориям (без учёта позиций у самой `node`). */
export function countItemsInDescendantCategories(node: ServiceCatalogCategory): number {
  if (!node.children?.length) return 0;
  let n = 0;
  for (const ch of node.children) {
    n += ch.items?.length ?? 0;
    n += countItemsInDescendantCategories(ch);
  }
  return n;
}

/** Плоский список узлов в порядке обхода дерева с фактическим parentId по рёбрам children. */
export function flattenStructuralCategoryRows(
  nodes: ServiceCatalogCategory[],
  parentId: string | undefined,
  out: StructuralCategoryRow[] = []
): StructuralCategoryRow[] {
  for (const n of nodes) {
    out.push({ node: n, parentId });
    if (n.children?.length) {
      flattenStructuralCategoryRows(n.children, n.id, out);
    }
  }
  return out;
}

/**
 * Карта id → parentId: приоритет у `node.parentId` из API (Prisma), затем ребро обхода дерева.
 * Явный родитель не затирается «корнем» из фантомной дублирующей строки.
 */
export function buildParentMapFromStructuralRows(
  rows: StructuralCategoryRow[]
): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>();
  for (const { node, parentId } of rows) {
    if (node.parentId != null) {
      map.set(node.id, node.parentId);
      continue;
    }
    if (node.parentId === null) {
      map.set(node.id, undefined);
      continue;
    }
    if (parentId !== undefined) {
      map.set(node.id, parentId);
    } else if (!map.has(node.id)) {
      map.set(node.id, undefined);
    }
  }
  return map;
}

export function isStrictDescendantOf(
  catId: string,
  ancestorId: string,
  idToParent: Map<string, string | undefined>
): boolean {
  let p = idToParent.get(catId);
  while (p !== undefined) {
    if (p === ancestorId) return true;
    p = idToParent.get(p);
  }
  return false;
}

function dedupeCategoriesByIdSort(nodes: ServiceCatalogCategory[]): ServiceCatalogCategory[] {
  const uniq = [...new Map(nodes.map((n) => [n.id, n])).values()];
  return uniq.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id));
}

/** id, для которого в дереве есть ребро к родителю (узел не «только фантом на корне»). */
function idsWithStructuralParent(rows: StructuralCategoryRow[]): Set<string> {
  return new Set(rows.filter((r) => r.parentId !== undefined).map((r) => r.node.id));
}

/** Строки настоящих корней: parentId undefined и нет вложенной строки с тем же id. */
function getRootStructuralSiblingRows(rows: StructuralCategoryRow[]): StructuralCategoryRow[] {
  const withParent = idsWithStructuralParent(rows);
  return rows.filter((r) => r.parentId === undefined && !withParent.has(r.node.id));
}

/**
 * Строка обхода для категории: по ссылке на узел; иначе при дублях id — строка с родителем
 * (в обходе позже), а не фантом на корне с parentId undefined.
 */
function resolveStructuralRowForCategory(
  cat: ServiceCatalogCategory,
  structuralRows: StructuralCategoryRow[]
): StructuralCategoryRow | undefined {
  const byRef = structuralRows.find((r) => r.node === cat);
  if (byRef) return byRef;

  const sameId = structuralRows.filter((r) => r.node.id === cat.id);
  if (sameId.length === 0) return undefined;
  if (sameId.length === 1) return sameId[0];

  const withParent = sameId.filter((r) => r.parentId !== undefined);
  if (withParent.length > 0) {
    return withParent[withParent.length - 1];
  }
  return sameId[sameId.length - 1];
}

/**
 * Соседи по одному родителю.
 * Важно: нельзя опираться на `cat.parentId === null` как на «это корень» — у вложенных групп в DTO
 * иногда тоже приходит `parentId: null` (как у корней). Тогда старый код смешивал их с «Малярные / Стены / Потолки»
 * и перенумерация sortOrder затрагивала корневые категории.
 * Источник уровня — только ребро дерева в обходе (`parentId` строки обхода); поле `node.parentId` лишь отсекает явные «корни в БД» под чужим ребром.
 */
export function getSiblingCategories(
  cat: ServiceCatalogCategory,
  structuralRows: StructuralCategoryRow[]
): ServiceCatalogCategory[] {
  const selfRow = resolveStructuralRowForCategory(cat, structuralRows);
  if (!selfRow) {
    return [cat];
  }

  const edgeParent = selfRow.parentId;

  if (edgeParent === undefined) {
    return dedupeCategoriesByIdSort(
      getRootStructuralSiblingRows(structuralRows).map((r) => r.node)
    );
  }

  const underEdge = structuralRows.filter((r) => r.parentId === edgeParent);
  const consistent = underEdge.filter((r) => {
    const p = r.node.parentId;
    if (p === null) return false;
    if (p === undefined) return true;
    return p === edgeParent;
  });
  const rows = consistent.length > 0 ? consistent : underEdge;
  return dedupeCategoriesByIdSort(rows.map((r) => r.node));
}

export function sortItemsByOrder(items: ServiceCatalogItem[]): ServiceCatalogItem[] {
  return [...items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id)
  );
}

/**
 * После обмена двух соседних в отсортированном списке задаём всем sortOrder 0..n−1,
 * чтобы не было скачков при одинаковых sortOrder в БД и порядок совпадал с UI.
 */
export function buildRenumberedOrderAfterSwap<T extends { id: string }>(
  siblingsSorted: T[],
  idx: number,
  j: number
): { id: string; sortOrder: number }[] {
  const reordered = [...siblingsSorted];
  [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
  return reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
}

export function priceWithMarkup(base: number, markupPercent: number | null | undefined): number {
  const m = markupPercent ?? 0;
  return Math.round(base * (1 + m / 100) * 100) / 100;
}

/** Соответствует бэкенду: 0% у группы — наследовать наценку родителя. */
export function buildCategoryMarkupByIdFromTree(
  roots: ServiceCatalogCategory[]
): Map<string, CategoryMarkupLookupRow> {
  const map = new Map<string, CategoryMarkupLookupRow>();
  const walk = (nodes: ServiceCatalogCategory[]) => {
    for (const c of nodes) {
      map.set(c.id, {
        parentId: c.parentId ?? null,
        priceMarkupPercent: Number(c.priceMarkupPercent ?? 0),
      });
      if (c.children?.length) walk(c.children);
    }
  };
  walk(roots);
  return map;
}

export function effectiveServiceCatalogMarkupPercentClient(
  categoryId: string,
  byId: Map<string, CategoryMarkupLookupRow>
): number {
  let current: string | null = categoryId;
  for (let d = 0; d < 512 && current; d++) {
    const row = byId.get(current);
    if (!row) return 0;
    if (row.priceMarkupPercent !== 0) return row.priceMarkupPercent;
    current = row.parentId;
  }
  return 0;
}

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0 }).format(n);
