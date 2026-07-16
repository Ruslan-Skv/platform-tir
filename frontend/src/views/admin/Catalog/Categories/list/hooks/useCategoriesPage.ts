'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../../shared/categories-page.constants';
import type { Category, CreateMessage, NewCategoryForm } from '../../shared/categories-page.types';
import {
  collectExpandableIds,
  flattenCategories,
  loadExpandedCategoryIds,
  saveExpandedCategoryIds,
} from '../../shared/categories-page.utils';

const EMPTY_NEW_CATEGORY: NewCategoryForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  icon: '',
  image: '',
};

export function useCategoriesPage() {
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
  const [newCategory, setNewCategory] = useState<NewCategoryForm>(EMPTY_NEW_CATEGORY);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<CreateMessage | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    void fetchCategories();
  }, [fetchCategories, isAuthenticated, isAuthLoading]);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setNewCategory((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setNewCategory((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.slug) {
      setCreateMessage({ type: 'error', text: 'Заполните название и slug' });
      return;
    }

    setCreating(true);
    setCreateMessage(null);

    try {
      const categoryData: {
        name: string;
        slug: string;
        description?: string;
        parentId?: string;
        icon?: string;
        image?: string;
      } = {
        name: newCategory.name,
        slug: newCategory.slug,
      };

      if (newCategory.description && newCategory.description.trim()) {
        categoryData.description = newCategory.description.trim();
      }

      if (newCategory.parentId && newCategory.parentId.trim()) {
        categoryData.parentId = newCategory.parentId;
      }

      if (newCategory.icon && newCategory.icon.trim()) {
        categoryData.icon = newCategory.icon.trim();
      }

      if (newCategory.image && newCategory.image.trim()) {
        categoryData.image = newCategory.image.trim();
      }

      const response = await apiFetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(categoryData),
      });

      if (response.ok) {
        const created = await response.json();
        setCreateMessage({ type: 'success', text: `Категория "${created.name}" создана` });
        setNewCategory(EMPTY_NEW_CATEGORY);
        setImagePreview(null);
        fetchCategories();

        setTimeout(() => {
          setShowCreateModal(false);
          setCreateMessage(null);
        }, 1500);
      } else {
        const data = await response.json().catch(() => ({}));
        setCreateMessage({ type: 'error', text: data.message || 'Ошибка создания категории' });
      }
    } catch {
      setCreateMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setCreating(false);
    }
  };

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
    newCategory,
    setNewCategory,
    creating,
    createMessage,
    showIconPicker,
    setShowIconPicker,
    imagePreview,
    fileInputRef,
    flatCategories,
    fetchCategories,
    handleImageSelect,
    clearImage,
    handleCreateCategory,
    toggleExpand,
    expandAllCategories,
    collapseAllCategories,
    handleManageAttributes,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteCategory,
    router,
  };
}

export type CategoriesPageModel = ReturnType<typeof useCategoriesPage>;
