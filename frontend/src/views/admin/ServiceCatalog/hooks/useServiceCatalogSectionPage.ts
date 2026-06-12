'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL, INITIAL_NEW_SERVICE_CATEGORY } from '../service-catalog-section-page.constants';
import type {
  DeleteTarget,
  EditCategoryData,
  NewServiceCategoryForm,
  PageMessage,
  ServiceCatalogCategory,
} from '../service-catalog-section-page.types';
import {
  collectDescendantIds,
  findCategoryById,
  flattenCategoriesForSelect,
} from '../service-catalog-section-page.utils';

export function useServiceCatalogSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<PageMessage | null>(null);
  const [newCategory, setNewCategory] = useState<NewServiceCategoryForm>(() => ({
    ...INITIAL_NEW_SERVICE_CATEGORY,
  }));
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [showNewIconPicker, setShowNewIconPicker] = useState(false);
  const newCategoryFileInputRef = useRef<HTMLInputElement>(null);
  const newCategoryCardBgFileInputRef = useRef<HTMLInputElement>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [editCategoryData, setEditCategoryData] = useState<EditCategoryData | null>(null);
  const editCategoryFileInputRef = useRef<HTMLInputElement>(null);
  const editCategoryCardBgFileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [getAuthHeaders, showMessage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = new Set<string>();
    const walk = (cats: ServiceCatalogCategory[]) => {
      cats.forEach((c) => {
        if (c.children?.length) {
          s.add(c.id);
          walk(c.children);
        }
      });
    };
    walk(categories);
    setExpandedCategoryIds(s);
  }, [categories]);

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flatForParentSelect = useMemo(() => flattenCategoriesForSelect(categories), [categories]);

  const editExcludedParentIds = useMemo(() => {
    if (!editingCategory) return new Set<string>();
    const node = findCategoryById(categories, editingCategory);
    if (!node) return new Set<string>([editingCategory]);
    const s = collectDescendantIds(node);
    s.add(node.id);
    return s;
  }, [categories, editingCategory]);

  const openCreateModal = useCallback(() => {
    setNewCategory({ ...INITIAL_NEW_SERVICE_CATEGORY });
    setShowNewIconPicker(false);
    setCreateMessage(null);
    if (newCategoryFileInputRef.current) newCategoryFileInputRef.current.value = '';
    if (newCategoryCardBgFileInputRef.current) newCategoryCardBgFileInputRef.current.value = '';
    setShowCreateModal(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    if (creating) return;
    setShowCreateModal(false);
    setCreateMessage(null);
  }, [creating]);

  const handleNewCategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setNewCategory((prev) => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const clearNewCategoryImage = () => {
    setNewCategory((prev) => ({ ...prev, image: '' }));
    if (newCategoryFileInputRef.current) newCategoryFileInputRef.current.value = '';
  };

  const handleEditCategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editCategoryData) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setEditCategoryData((p) => (p ? { ...p, image: reader.result as string } : p));
      reader.readAsDataURL(file);
    }
  };

  const clearEditCategoryImage = () => {
    setEditCategoryData((p) => (p ? { ...p, image: '' } : p));
    if (editCategoryFileInputRef.current) editCategoryFileInputRef.current.value = '';
  };

  const handleNewCategoryCardBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setNewCategory((prev) => ({ ...prev, cardBackgroundImage: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const clearNewCategoryCardBg = () => {
    setNewCategory((prev) => ({ ...prev, cardBackgroundImage: '' }));
    if (newCategoryCardBgFileInputRef.current) newCategoryCardBgFileInputRef.current.value = '';
  };

  const handleEditCategoryCardBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editCategoryData) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setEditCategoryData((p) =>
          p ? { ...p, cardBackgroundImage: reader.result as string } : p
        );
      reader.readAsDataURL(file);
    }
  };

  const clearEditCategoryCardBg = () => {
    setEditCategoryData((p) => (p ? { ...p, cardBackgroundImage: '' } : p));
    if (editCategoryCardBgFileInputRef.current) editCategoryCardBgFileInputRef.current.value = '';
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.slug.trim()) {
      setCreateMessage({ type: 'error', text: 'Заполните название и slug' });
      return;
    }

    setCreating(true);
    setCreateMessage(null);

    const body: Record<string, unknown> = {
      name: newCategory.name.trim(),
      slug: newCategory.slug.trim(),
      showPricesInPublic: newCategory.showPricesInPublic,
    };

    if (newCategory.description.trim()) {
      body.description = newCategory.description.trim();
    }
    if (newCategory.parentId.trim()) {
      body.parentId = newCategory.parentId.trim();
    }
    if (newCategory.icon.trim()) {
      body.icon = newCategory.icon.trim();
    }
    if (newCategory.image.trim()) {
      body.image = newCategory.image.trim();
    }
    if (newCategory.cardBackgroundImage.trim()) {
      body.cardBackgroundImage = newCategory.cardBackgroundImage.trim();
    }
    body.cardBackgroundTransparent = newCategory.cardBackgroundTransparent;
    body.priceMarkupPercent = Number(newCategory.priceMarkupPercent) || 0;

    try {
      const res = await apiFetch(`${API_URL}/admin/service-catalog/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = (await res.json()) as { name?: string };
        setCreateMessage({
          type: 'success',
          text: `Категория «${created.name ?? newCategory.name.trim()}» создана`,
        });
        setNewCategory({ ...INITIAL_NEW_SERVICE_CATEGORY });
        if (newCategoryFileInputRef.current) newCategoryFileInputRef.current.value = '';
        if (newCategoryCardBgFileInputRef.current) newCategoryCardBgFileInputRef.current.value = '';
        load();

        setTimeout(() => {
          setShowCreateModal(false);
          setCreateMessage(null);
        }, 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateMessage({
          type: 'error',
          text: typeof err.message === 'string' ? err.message : 'Ошибка создания категории',
        });
      }
    } catch {
      setCreateMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryData) return;
    try {
      const payload = {
        name: editCategoryData.name,
        slug: editCategoryData.slug,
        icon: editCategoryData.icon || undefined,
        image: editCategoryData.image?.trim() || null,
        cardBackgroundImage: editCategoryData.cardBackgroundImage?.trim() || null,
        cardBackgroundTransparent: editCategoryData.cardBackgroundTransparent,
        showPricesInPublic: editCategoryData.showPricesInPublic,
        priceMarkupPercent: Number(editCategoryData.priceMarkupPercent) || 0,
        parentId: editCategoryData.parentId,
      };
      const res = await apiFetch(`${API_URL}/admin/service-catalog/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showMessage('success', 'Категория обновлена');
        setEditingCategory(null);
        setEditCategoryData(null);
        setShowEditIconPicker(false);
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', typeof err.message === 'string' ? err.message : 'Ошибка обновления');
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/service-catalog/categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showMessage('success', 'Категория удалена');
        setDeleteTarget(null);
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', typeof err.message === 'string' ? err.message : 'Ошибка удаления');
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
    showCreateModal,
    creating,
    createMessage,
    newCategory,
    setNewCategory,
    expandedCategoryIds,
    showNewIconPicker,
    setShowNewIconPicker,
    newCategoryFileInputRef,
    newCategoryCardBgFileInputRef,
    editingCategory,
    setEditingCategory,
    showEditIconPicker,
    setShowEditIconPicker,
    editCategoryData,
    setEditCategoryData,
    editCategoryFileInputRef,
    editCategoryCardBgFileInputRef,
    flatForParentSelect,
    editExcludedParentIds,
    toggleCategoryExpand,
    openCreateModal,
    closeCreateModal,
    handleNewCategoryImageSelect,
    clearNewCategoryImage,
    handleEditCategoryImageSelect,
    clearEditCategoryImage,
    handleNewCategoryCardBgSelect,
    clearNewCategoryCardBg,
    handleEditCategoryCardBgSelect,
    clearEditCategoryCardBg,
    handleAddCategory,
    handleUpdateCategory,
    handleDelete,
  };
}

export type ServiceCatalogSectionPageModel = ReturnType<typeof useServiceCatalogSectionPage>;
