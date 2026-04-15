'use client';

import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  FoldVertical,
  UnfoldVertical,
} from 'lucide-react';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/features/auth';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from './ServiceCatalogItemsPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  sortOrder: number;
  isActive: boolean;
  category?: { id: string; name: string; slug: string };
}

interface ServiceCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  children?: ServiceCatalogCategory[];
  items?: ServiceCatalogItem[];
  _count?: { items: number };
}

function flattenServiceCategories(
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
function collectDescendantCategoryIds(node: ServiceCatalogCategory): string[] {
  const ids: string[] = [];
  if (!node.children?.length) return ids;
  for (const ch of node.children) {
    ids.push(ch.id, ...collectDescendantCategoryIds(ch));
  }
  return ids;
}

/** Сумма длин `items` по всем вложенным категориям (без учёта позиций у самой `node`). */
function countItemsInDescendantCategories(node: ServiceCatalogCategory): number {
  if (!node.children?.length) return 0;
  let n = 0;
  for (const ch of node.children) {
    n += ch.items?.length ?? 0;
    n += countItemsInDescendantCategories(ch);
  }
  return n;
}

type StructuralCategoryRow = {
  node: ServiceCatalogCategory;
  parentId: string | undefined;
};

/** Плоский список узлов в порядке обхода дерева с фактическим parentId по рёбрам children. */
function flattenStructuralCategoryRows(
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
function buildParentMapFromStructuralRows(
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

function isStrictDescendantOf(
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
function getSiblingCategories(
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

function sortItemsByOrder(items: ServiceCatalogItem[]): ServiceCatalogItem[] {
  return [...items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id)
  );
}

/**
 * После обмена двух соседних в отсортированном списке задаём всем sortOrder 0..n−1,
 * чтобы не было скачков при одинаковых sortOrder в БД и порядок совпадал с UI.
 */
function buildRenumberedOrderAfterSwap<T extends { id: string }>(
  siblingsSorted: T[],
  idx: number,
  j: number
): { id: string; sortOrder: number }[] {
  const reordered = [...siblingsSorted];
  [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
  return reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0 }).format(n);

export function ServiceCatalogItemsPage() {
  const { getAuthHeaders } = useAuth();
  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'item';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewItem, setShowNewItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'м²',
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<Partial<ServiceCatalogItem>>({});
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  /** Корневые родители (level 0), у которых скрыт список блоков вложенных категорий. */
  const [nestedChildBlocksHiddenRoots, setNestedChildBlocksHiddenRoots] = useState<Set<string>>(
    () => new Set()
  );
  /** `cat:id` | `item:id` — блокировка кнопок при PATCH порядка */
  const [reorderBusyKey, setReorderBusyKey] = useState<string | null>(null);
  const reorderInProgress = reorderBusyKey !== null;

  const structuralCategoryRows = useMemo(
    () => flattenStructuralCategoryRows(categories, undefined, []),
    [categories]
  );

  const categoryParentMap = useMemo(
    () => buildParentMapFromStructuralRows(structuralCategoryRows),
    [structuralCategoryRows]
  );

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleAllDescendantsCollapsed = (parent: ServiceCatalogCategory) => {
    const ids = collectDescendantCategoryIds(parent);
    if (ids.length === 0) return;
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev);
      const allCollapsed = ids.every((id) => next.has(id));
      if (allCollapsed) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  const toggleNestedChildCategoryBlocksVisibility = (rootParentId: string) => {
    setNestedChildBlocksHiddenRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootParentId)) next.delete(rootParentId);
      else next.add(rootParentId);
      return next;
    });
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const res = await fetch(
          `${API_URL}/admin/service-catalog/categories?includeInactive=true`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (res.ok) {
          const c = await res.json();
          setCategories(c);
        }
      } catch {
        showMessage('error', 'Ошибка загрузки');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    load();
  }, [load]);

  const reorderCategory = async (cat: ServiceCatalogCategory, direction: 'up' | 'down') => {
    const siblings = getSiblingCategories(cat, structuralCategoryRows);
    const idx = siblings.findIndex((s) => s.id === cat.id);
    if (idx < 0) return;
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= siblings.length) return;

    setReorderBusyKey(`cat:${cat.id}`);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(
        `${API_URL}/admin/service-catalog/categories/${cat.id}/reorder?includeInactive=true`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ direction }),
        }
      );
      if (res.ok) {
        const nextTree = (await res.json()) as ServiceCatalogCategory[];
        setCategories(nextTree);
        showMessage('success', 'Порядок групп обновлён');
      } else {
        const errText = await res.text().catch(() => '');
        showMessage(
          'error',
          errText
            ? `Не удалось изменить порядок: ${errText.slice(0, 200)}`
            : 'Не удалось изменить порядок'
        );
      }
    } catch {
      showMessage('error', 'Ошибка сети');
    } finally {
      setReorderBusyKey(null);
    }
  };

  const reorderItem = async (
    items: ServiceCatalogItem[],
    itemId: string,
    direction: 'up' | 'down'
  ) => {
    const sorted = sortItemsByOrder(items);
    const idx = sorted.findIndex((it) => it.id === itemId);
    if (idx < 0) return;
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= sorted.length) return;
    const rawUpdates = buildRenumberedOrderAfterSwap(sorted, idx, j);
    const changedOnly = rawUpdates.filter((u) => {
      const orig = sorted.find((x) => x.id === u.id);
      return (orig?.sortOrder ?? 0) !== u.sortOrder;
    });
    const updates = changedOnly.length > 0 ? changedOnly : rawUpdates;
    setReorderBusyKey(`item:${itemId}`);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const results: Response[] = [];
      for (const u of updates) {
        results.push(
          await fetch(`${API_URL}/admin/service-catalog/items/${u.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sortOrder: u.sortOrder }),
          })
        );
      }
      if (results.every((r) => r.ok)) {
        showMessage('success', 'Порядок видов работ обновлён');
        await load(true);
      } else {
        showMessage('error', 'Не удалось изменить порядок');
      }
    } catch {
      showMessage('error', 'Ошибка сети');
    } finally {
      setReorderBusyKey(null);
    }
  };

  const handleAddItem = async (categoryId: string) => {
    const price = parseFloat(newItem.price.replace(',', '.'));
    if (!newItem.name.trim() || Number.isNaN(price) || price < 0) {
      showMessage('error', 'Заполните название и корректную цену');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          categoryId,
          name: newItem.name.trim(),
          price,
          unit: newItem.unit || 'м²',
        }),
      });
      if (res.ok) {
        showMessage('success', 'Вид работ добавлен');
        setShowNewItem(null);
        setNewItem({ name: '', description: '', price: '', unit: 'м²' });
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const handleUpdateItem = async (id: string) => {
    if (
      editItemData.name === undefined &&
      editItemData.price === undefined &&
      editItemData.unit === undefined
    ) {
      setEditingItem(null);
      setEditItemData({});
      return;
    }
    try {
      const body: Record<string, unknown> = {};
      if (editItemData.name !== undefined) body.name = editItemData.name;
      if (editItemData.price !== undefined) body.price = editItemData.price;
      if (editItemData.unit !== undefined) body.unit = editItemData.unit;
      const res = await fetch(`${API_URL}/admin/service-catalog/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showMessage('success', 'Вид работ обновлён');
        setEditingItem(null);
        setEditItemData({});
        load();
      } else {
        showMessage('error', 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/items/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showMessage('success', 'Вид работ удалён');
        setDeleteTarget(null);
        load();
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Виды работ</h1>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Виды работ по категориям</h2>
          {categories.length === 0 ? (
            <p className={styles.empty}>
              Создайте категории в разделе «Категории», затем добавляйте виды работ.
            </p>
          ) : (
            flattenServiceCategories(categories).map(({ cat, level }) => {
              if (level > 0) {
                for (const rootId of nestedChildBlocksHiddenRoots) {
                  if (isStrictDescendantOf(cat.id, rootId, categoryParentMap)) {
                    return null;
                  }
                }
              }

              const isCollapsed = collapsedCategoryIds.has(cat.id);
              const itemsCount = cat.items?.length ?? 0;
              const descendantIds =
                level === 0 && cat.children?.length ? collectDescendantCategoryIds(cat) : [];
              const nestedGroupCount = descendantIds.length;
              const nestedItemsCount =
                level === 0 && cat.children?.length ? countItemsInDescendantCategories(cat) : 0;
              const allNestedCollapsed =
                descendantIds.length > 0 &&
                descendantIds.every((id) => collapsedCategoryIds.has(id));
              const nestedChildBlocksHidden =
                level === 0 && descendantIds.length > 0 && nestedChildBlocksHiddenRoots.has(cat.id);
              const siblingCats = getSiblingCategories(cat, structuralCategoryRows);
              const catOrderIdx = siblingCats.findIndex((s) => s.id === cat.id);
              const canMoveCategoryUp = siblingCats.length > 1 && catOrderIdx > 0;
              const canMoveCategoryDown =
                siblingCats.length > 1 && catOrderIdx >= 0 && catOrderIdx < siblingCats.length - 1;
              const itemsSorted = sortItemsByOrder(cat.items ?? []);
              return (
                <div
                  key={cat.id}
                  className={`${styles.categoryBlock} ${level === 0 ? styles.categoryBlockParent : styles.categoryBlockChild}`}
                  style={level > 0 ? { marginLeft: `calc(${level} * 2rem)` } : undefined}
                >
                  <div className={styles.categoryBlockHeader}>
                    <div className={styles.categoryHeaderControls}>
                      <button
                        type="button"
                        className={styles.expandButton}
                        onClick={() => toggleCategory(cat.id)}
                        title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? '+' : '−'}
                      </button>
                      {descendantIds.length > 0 ? (
                        <>
                          <button
                            type="button"
                            className={styles.nestedToggleButton}
                            onClick={() => toggleAllDescendantsCollapsed(cat)}
                            title={
                              allNestedCollapsed
                                ? 'Развернуть таблицы видов работ во всех вложенных категориях'
                                : 'Свернуть таблицы видов работ во всех вложенных категориях'
                            }
                            aria-label={
                              allNestedCollapsed
                                ? 'Развернуть таблицы видов работ во всех вложенных категориях'
                                : 'Свернуть таблицы видов работ во всех вложенных категориях'
                            }
                          >
                            {allNestedCollapsed ? (
                              <ChevronsUp className={styles.nestedToggleIcon} aria-hidden />
                            ) : (
                              <ChevronsDown className={styles.nestedToggleIcon} aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            className={styles.nestedListToggleButton}
                            onClick={() => toggleNestedChildCategoryBlocksVisibility(cat.id)}
                            title={
                              nestedChildBlocksHidden
                                ? 'Показать список вложенных категорий'
                                : 'Скрыть список вложенных категорий'
                            }
                            aria-label={
                              nestedChildBlocksHidden
                                ? 'Показать список вложенных категорий'
                                : 'Скрыть список вложенных категорий'
                            }
                          >
                            {nestedChildBlocksHidden ? (
                              <UnfoldVertical className={styles.nestedToggleIcon} aria-hidden />
                            ) : (
                              <FoldVertical className={styles.nestedToggleIcon} aria-hidden />
                            )}
                          </button>
                        </>
                      ) : null}
                    </div>
                    <div className={styles.categoryHeaderMain}>
                      <div className={styles.categoryTitleWithReorder}>
                        <h3
                          className={`${styles.categoryBlockTitle} ${level > 0 ? styles.categoryBlockTitleNested : ''}`}
                        >
                          <span className={styles.categoryTitleRow}>
                            {cat.image ? (
                              <img src={cat.image} alt="" className={styles.categoryBlockImage} />
                            ) : cat.icon && serviceCatalogIconMap[cat.icon] ? (
                              <span className={styles.categoryBlockIcon}>
                                {React.createElement(serviceCatalogIconMap[cat.icon], {
                                  className: styles.categoryBlockIconSvg,
                                })}
                              </span>
                            ) : null}
                            {cat.name}
                            {itemsCount > 0 && (
                              <span className={styles.categoryBlockCount}> ({itemsCount})</span>
                            )}
                          </span>
                        </h3>
                        {siblingCats.length > 1 ? (
                          <div
                            className={styles.reorderGroupButtons}
                            role="group"
                            aria-label="Порядок группы в списке"
                          >
                            <button
                              type="button"
                              className={styles.reorderIconButton}
                              disabled={!canMoveCategoryUp || reorderInProgress}
                              title="Переместить группу выше"
                              aria-label="Переместить группу выше"
                              onClick={() => void reorderCategory(cat, 'up')}
                            >
                              <ChevronUp className={styles.reorderGroupIcon} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className={styles.reorderIconButton}
                              disabled={!canMoveCategoryDown || reorderInProgress}
                              title="Переместить группу ниже"
                              aria-label="Переместить группу ниже"
                              onClick={() => void reorderCategory(cat, 'down')}
                            >
                              <ChevronDown className={styles.reorderGroupIcon} aria-hidden />
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {level === 0 && nestedGroupCount > 0 ? (
                        <div className={styles.parentNestedStats} role="status">
                          <span className={styles.parentNestedStatLine}>
                            Вложенных групп:{' '}
                            <strong className={styles.parentNestedStatValue}>
                              {nestedGroupCount}
                            </strong>
                          </span>
                          <span className={styles.parentNestedStatLine}>
                            Видов работ во вложенных:{' '}
                            <strong className={styles.parentNestedStatValue}>
                              {nestedItemsCount}
                            </strong>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <>
                      <table className={styles.itemsTable}>
                        <colgroup>
                          <col className={styles.nameColumn} />
                          <col className={styles.priceColumn} />
                          <col className={styles.unitColumn} />
                          <col className={styles.actionsColumn} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Название</th>
                            <th>Цена за ед.</th>
                            <th>Ед. изм.</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsSorted.map((item, itemIdx) => {
                            const canMoveItemUp =
                              itemsSorted.length > 1 && itemIdx > 0 && editingItem !== item.id;
                            const canMoveItemDown =
                              itemsSorted.length > 1 &&
                              itemIdx < itemsSorted.length - 1 &&
                              editingItem !== item.id;
                            return (
                              <tr key={item.id}>
                                <td className={styles.nameCell}>
                                  {editingItem === item.id ? (
                                    <textarea
                                      value={editItemData.name ?? item.name}
                                      onChange={(e) =>
                                        setEditItemData((p) => ({ ...p, name: e.target.value }))
                                      }
                                      className={styles.nameTextarea}
                                      rows={1}
                                    />
                                  ) : (
                                    item.name
                                  )}
                                </td>
                                <td>
                                  {editingItem === item.id ? (
                                    <input
                                      type="text"
                                      value={
                                        editItemData.price !== undefined
                                          ? String(editItemData.price)
                                          : String(item.price)
                                      }
                                      onChange={(e) =>
                                        setEditItemData((p) => ({
                                          ...p,
                                          price: parseFloat(e.target.value.replace(',', '.')) || 0,
                                        }))
                                      }
                                      className={styles.input}
                                      style={{ width: 100 }}
                                    />
                                  ) : (
                                    formatPrice(item.price)
                                  )}
                                </td>
                                <td>
                                  {editingItem === item.id ? (
                                    <input
                                      type="text"
                                      value={editItemData.unit ?? item.unit}
                                      onChange={(e) =>
                                        setEditItemData((p) => ({ ...p, unit: e.target.value }))
                                      }
                                      className={styles.input}
                                      style={{ width: 60 }}
                                    />
                                  ) : (
                                    item.unit
                                  )}
                                </td>
                                <td>
                                  {editingItem === item.id ? (
                                    <>
                                      <button
                                        type="button"
                                        className={styles.smallButton}
                                        onClick={() => handleUpdateItem(item.id)}
                                      >
                                        Сохранить
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.smallButton}
                                        onClick={() => {
                                          setEditingItem(null);
                                          setEditItemData({});
                                        }}
                                      >
                                        Отмена
                                      </button>
                                    </>
                                  ) : (
                                    <span className={styles.cellActions}>
                                      <span
                                        className={styles.itemReorderWrap}
                                        role="group"
                                        aria-label="Порядок в списке"
                                      >
                                        <button
                                          type="button"
                                          className={styles.reorderIconButton}
                                          disabled={!canMoveItemUp || reorderInProgress}
                                          title="Выше в списке"
                                          aria-label="Выше в списке"
                                          onClick={() =>
                                            void reorderItem(cat.items ?? [], item.id, 'up')
                                          }
                                        >
                                          <ChevronUp
                                            className={styles.reorderItemIcon}
                                            aria-hidden
                                          />
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.reorderIconButton}
                                          disabled={!canMoveItemDown || reorderInProgress}
                                          title="Ниже в списке"
                                          aria-label="Ниже в списке"
                                          onClick={() =>
                                            void reorderItem(cat.items ?? [], item.id, 'down')
                                          }
                                        >
                                          <ChevronDown
                                            className={styles.reorderItemIcon}
                                            aria-hidden
                                          />
                                        </button>
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.editButton}
                                        onClick={() => {
                                          setEditingItem(item.id);
                                          setEditItemData({
                                            name: item.name,
                                            price: item.price,
                                            unit: item.unit,
                                          });
                                        }}
                                        title="Редактировать"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: 'item',
                                            id: item.id,
                                            name: item.name,
                                          })
                                        }
                                        title="Удалить"
                                      >
                                        🗑️
                                      </button>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {showNewItem === cat.id && (
                            <tr className={styles.addItemRow}>
                              <td className={styles.nameCell}>
                                <textarea
                                  value={newItem.name}
                                  onChange={(e) =>
                                    setNewItem((p) => ({ ...p, name: e.target.value }))
                                  }
                                  placeholder="Название"
                                  className={styles.nameTextarea}
                                  rows={1}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={newItem.price}
                                  onChange={(e) =>
                                    setNewItem((p) => ({ ...p, price: e.target.value }))
                                  }
                                  placeholder="Цена"
                                  className={styles.input}
                                  style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={newItem.unit}
                                  onChange={(e) =>
                                    setNewItem((p) => ({ ...p, unit: e.target.value }))
                                  }
                                  placeholder="м²"
                                  className={styles.input}
                                  style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.saveButton}
                                  onClick={() => handleAddItem(cat.id)}
                                >
                                  Добавить
                                </button>
                                <button
                                  type="button"
                                  className={styles.cancelButton}
                                  onClick={() => {
                                    setShowNewItem(null);
                                    setNewItem({
                                      name: '',
                                      description: '',
                                      price: '',
                                      unit: 'м²',
                                    });
                                  }}
                                >
                                  Отмена
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {showNewItem !== cat.id && (
                        <button
                          type="button"
                          className={styles.addItemButton}
                          onClick={() => setShowNewItem(cat.id)}
                        >
                          + Добавить вид работ
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>

        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Подтверждение удаления"
          message={deleteTarget ? `Удалить вид работ «${deleteTarget.name}»?` : ''}
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          variant="danger"
        />
      </div>
      {message &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`${styles.toast} ${message.type === 'success' ? styles.toastSuccess : styles.toastError}`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </div>,
          document.body
        )}
    </>
  );
}
