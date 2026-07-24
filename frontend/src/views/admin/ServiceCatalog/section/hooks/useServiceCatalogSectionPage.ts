'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../service-catalog-section-page.constants';
import type { ServiceCatalogCategory } from '../service-catalog-section-page.types';
import {
  collectExpandableIds,
  flattenCategoriesForSelect,
  loadExpandedCategoryIds,
  saveExpandedCategoryIds,
} from '../service-catalog-section-page.utils';

export function useServiceCatalogSectionPage() {
  const { getAuthHeaders, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() =>
    loadExpandedCategoryIds()
  );
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    category: ServiceCatalogCategory | null;
  }>({ isOpen: false, category: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [reorderBusyKey, setReorderBusyKey] = useState<string | null>(null);
  const reorderInProgress = reorderBusyKey !== null;

  const showToast = useCallback((text: string, type: 'ok' | 'err') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchCategories = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
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
          const data: ServiceCatalogCategory[] = await res.json();
          setCategories(data);
        } else if (!options?.silent) {
          showToast('Ошибка загрузки категорий', 'err');
        }
      } catch {
        if (!options?.silent) {
          showToast('Ошибка загрузки категорий', 'err');
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [getAuthHeaders, showToast]
  );

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    void fetchCategories();
  }, [fetchCategories, isAuthenticated, isAuthLoading]);

  const flatCategories = useMemo(() => flattenCategoriesForSelect(categories), [categories]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCategoryCreated = useCallback(() => {
    void fetchCategories({ silent: true });
  }, [fetchCategories]);

  const openEditModal = useCallback((category: ServiceCatalogCategory) => {
    setEditCategoryId(category.id);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditCategoryId(null);
  }, []);

  const handleCategoryUpdated = useCallback(() => {
    void fetchCategories({ silent: true });
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveExpandedCategoryIds(next);
      return next;
    });
  };

  const expandAllCategories = () => {
    const next = new Set(collectExpandableIds(categories));
    setExpandedCategories(next);
    saveExpandedCategoryIds(next);
  };

  const collapseAllCategories = () => {
    const next = new Set<string>();
    setExpandedCategories(next);
    saveExpandedCategoryIds(next);
  };

  const openDeleteModal = (category: ServiceCatalogCategory) => {
    setDeleteModal({ isOpen: true, category });
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, category: null });
    setDeleteError(null);
  };

  const handleDeleteCategory = async () => {
    if (!deleteModal.category) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiFetch(
        `${API_URL}/admin/service-catalog/categories/${deleteModal.category.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (res.ok) {
        closeDeleteModal();
        showToast('Категория удалена', 'ok');
        void fetchCategories({ silent: true });
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(
          typeof data.message === 'string' ? data.message : 'Ошибка при удалении категории'
        );
      }
    } catch {
      setDeleteError('Ошибка сети при удалении категории');
    } finally {
      setDeleting(false);
    }
  };

  const reorderCategory = useCallback(
    async (
      category: ServiceCatalogCategory,
      siblings: ServiceCatalogCategory[],
      direction: 'up' | 'down'
    ) => {
      const idx = siblings.findIndex((s) => s.id === category.id);
      if (idx < 0) return;
      const j = direction === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= siblings.length) return;

      setReorderBusyKey(category.id);
      try {
        const res = await apiFetch(
          `${API_URL}/admin/service-catalog/categories/${category.id}/reorder?includeInactive=true`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ direction }),
          }
        );
        if (res.ok) {
          const nextTree = (await res.json()) as ServiceCatalogCategory[];
          setCategories(nextTree);
          showToast('Порядок обновлён', 'ok');
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(
            typeof data.message === 'string' ? data.message : 'Не удалось изменить порядок',
            'err'
          );
        }
      } catch {
        showToast('Ошибка сети при изменении порядка', 'err');
      } finally {
        setReorderBusyKey(null);
      }
    },
    [getAuthHeaders, showToast]
  );

  return {
    categories,
    loading,
    expandedCategories,
    deleteModal,
    deleting,
    deleteError,
    showCreateModal,
    setShowCreateModal,
    closeCreateModal,
    handleCategoryCreated,
    editCategoryId,
    openEditModal,
    closeEditModal,
    handleCategoryUpdated,
    flatCategories,
    fetchCategories,
    toggleExpand,
    expandAllCategories,
    collapseAllCategories,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteCategory,
    reorderCategory,
    reorderInProgress,
    toast,
    showToast,
  };
}

export type ServiceCatalogSectionPageModel = ReturnType<typeof useServiceCatalogSectionPage>;
