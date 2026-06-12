'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../service-catalog-items-page.constants';
import type {
  NewServiceCatalogItemForm,
  ServiceCatalogCategory,
  ServiceCatalogDeleteTarget,
  ServiceCatalogItem,
} from '../service-catalog-items-page.types';
import {
  buildCategoryMarkupByIdFromTree,
  buildParentMapFromStructuralRows,
  buildRenumberedOrderAfterSwap,
  collectDescendantCategoryIds,
  flattenStructuralCategoryRows,
  getSiblingCategories,
  readServiceCatalogUiState,
  sortItemsByOrder,
  writeServiceCatalogUiState,
} from '../service-catalog-items-page.utils';

export function useServiceCatalogItemsPage() {
  const { getAuthHeaders } = useAuth();
  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceCatalogDeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewItem, setShowNewItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<NewServiceCatalogItemForm>({
    name: '',
    description: '',
    price: '',
    unit: 'м²',
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<Partial<ServiceCatalogItem>>({});
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const [nestedChildBlocksHiddenRoots, setNestedChildBlocksHiddenRoots] = useState<Set<string>>(
    () => new Set()
  );
  const skipPersistUiRef = useRef(true);
  const [reorderBusyKey, setReorderBusyKey] = useState<string | null>(null);
  const reorderInProgress = reorderBusyKey !== null;

  useEffect(() => {
    const saved = readServiceCatalogUiState();
    if (saved) {
      setCollapsedCategoryIds(new Set(saved.collapsedCategoryIds));
      setNestedChildBlocksHiddenRoots(new Set(saved.nestedChildBlocksHiddenRoots));
    }
  }, []);

  useEffect(() => {
    if (skipPersistUiRef.current) {
      skipPersistUiRef.current = false;
      return;
    }
    writeServiceCatalogUiState(collapsedCategoryIds, nestedChildBlocksHiddenRoots);
  }, [collapsedCategoryIds, nestedChildBlocksHiddenRoots]);

  const structuralCategoryRows = useMemo(
    () => flattenStructuralCategoryRows(categories, undefined, []),
    [categories]
  );

  const categoryMarkupById = useMemo(
    () => buildCategoryMarkupByIdFromTree(categories),
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
        const res = await apiFetch(
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
      const res = await apiFetch(
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
          await apiFetch(`${API_URL}/admin/service-catalog/items/${u.id}`, {
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
      const res = await apiFetch(`${API_URL}/admin/service-catalog/items`, {
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
      const res = await apiFetch(`${API_URL}/admin/service-catalog/items/${id}`, {
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
      const res = await apiFetch(`${API_URL}/admin/service-catalog/items/${deleteTarget.id}`, {
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

  return {
    categories,
    loading,
    message,
    deleteTarget,
    setDeleteTarget,
    deleting,
    showNewItem,
    setShowNewItem,
    newItem,
    setNewItem,
    editingItem,
    setEditingItem,
    editItemData,
    setEditItemData,
    collapsedCategoryIds,
    nestedChildBlocksHiddenRoots,
    reorderInProgress,
    structuralCategoryRows,
    categoryMarkupById,
    categoryParentMap,
    toggleCategory,
    toggleAllDescendantsCollapsed,
    toggleNestedChildCategoryBlocksVisibility,
    reorderCategory,
    reorderItem,
    handleAddItem,
    handleUpdateItem,
    handleDelete,
  };
}

export type ServiceCatalogItemsPageModel = ReturnType<typeof useServiceCatalogItemsPage>;
