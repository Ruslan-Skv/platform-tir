'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../../shared/categories-page.constants';
import type { Category } from '../../shared/categories-page.types';
import {
  collectExpandableIds,
  flattenCategories,
  loadExpandedCategoryIds,
  saveExpandedCategoryIds,
} from '../../shared/categories-page.utils';

export type UseCategoriesPageOptions = {
  initialEditCategoryId?: string | null;
};

export function useCategoriesPage(options: UseCategoriesPageOptions = {}) {
  const { initialEditCategoryId = null } = options;
  const router = useRouter();
  const { getAuthHeaders, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() =>
    loadExpandedCategoryIds()
  );
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    category: Category | null;
  }>({ isOpen: false, category: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
        const response = await apiFetch(`${API_URL}/categories?includeInactive=true`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data: Category[] = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    void fetchCategories();
  }, [fetchCategories, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (initialEditCategoryId) {
      setEditCategoryId(initialEditCategoryId);
    }
  }, [initialEditCategoryId]);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCategoryCreated = useCallback(
    (_created: Category) => {
      void fetchCategories();
    },
    [fetchCategories]
  );

  const openEditModal = useCallback((category: Category) => {
    setEditCategoryId(category.id);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditCategoryId(null);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('edit')) {
      router.replace('/admin/catalog/categories');
    }
  }, [router]);

  const handleCategoryUpdated = useCallback(
    (_updated: Category) => {
      void fetchCategories({ silent: true });
    },
    [fetchCategories]
  );

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

  const handleManageAttributes = (categoryId: string) => {
    router.push(`/admin/catalog/categories/${categoryId}/attributes`);
  };

  const openDeleteModal = (category: Category) => {
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
      const response = await apiFetch(`${API_URL}/categories/${deleteModal.category.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        closeDeleteModal();
        fetchCategories();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message || 'Ошибка при удалении категории');
      }
    } catch {
      setDeleteError('Ошибка сети при удалении категории');
    } finally {
      setDeleting(false);
    }
  };

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
    handleManageAttributes,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteCategory,
    toast,
    showToast,
    router,
  };
}

export type CategoriesPageModel = ReturnType<typeof useCategoriesPage>;
