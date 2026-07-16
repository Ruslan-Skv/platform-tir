'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import { API_URL } from '../category-attributes-page.constants';
import type {
  Attribute,
  Category,
  CategoryAttribute,
  CategoryAttributesPageProps,
} from '../category-attributes-page.types';
import { isListAttributeType } from '../category-attributes-page.utils';

export function useCategoryAttributesPage({ categoryId }: CategoryAttributesPageProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const noticeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reordering, setReordering] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    type: 'TEXT' as Attribute['type'],
    unit: '',
    isFilterable: true,
    optionRows: [] as string[],
  });

  const [applyingToProducts, setApplyingToProducts] = useState(false);
  const [selectedForApply, setSelectedForApply] = useState<string[]>([]);
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [deleteModal, setDeleteModal] = useState<{
    attributeId: string;
    attributeName: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clearNoticeModal = useCallback(() => {
    if (noticeCloseTimerRef.current !== null) {
      clearTimeout(noticeCloseTimerRef.current);
      noticeCloseTimerRef.current = null;
    }
    setNoticeModal(null);
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (noticeCloseTimerRef.current !== null) {
      clearTimeout(noticeCloseTimerRef.current);
    }
    setNoticeModal({ type, text });
    noticeCloseTimerRef.current = setTimeout(() => {
      setNoticeModal(null);
      noticeCloseTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeCloseTimerRef.current !== null) {
        clearTimeout(noticeCloseTimerRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) {
        setLoading(true);
      }
      try {
        const [categoryRes, attrsRes, allAttrsRes] = await Promise.all([
          apiFetch(`${API_URL}/categories/${categoryId}`),
          apiFetch(`${API_URL}/categories/${categoryId}/attributes`),
          apiFetch(`${API_URL}/categories/attributes/all`),
        ]);

        if (categoryRes.ok) {
          const data = await categoryRes.json();
          setCategory(data);
        }

        if (attrsRes.ok) {
          const data: CategoryAttribute[] = await attrsRes.json();
          const sorted = [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCategoryAttributes(sorted);
        }

        if (allAttrsRes.ok) {
          const data = await allAttrsRes.json();
          setAllAttributes(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showMessage('error', 'Ошибка загрузки данных');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [categoryId, showMessage]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const persistCategoryAttributesOrder = async (
    items: Array<{ attributeId: string; order: number }>
  ) => {
    if (items.length === 0) return;
    try {
      setReordering(true);
      await Promise.all(
        items.map(({ attributeId, order }) =>
          apiFetch(`${API_URL}/categories/${categoryId}/attributes/${attributeId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ order }),
          })
        )
      );
    } catch {
      showMessage('error', 'Не удалось сохранить порядок атрибутов');
      fetchData({ silent: true });
    } finally {
      setReordering(false);
    }
  };

  const moveCategoryAttribute = async (attributeId: string, direction: 'up' | 'down') => {
    if (reordering) return;
    const index = categoryAttributes.findIndex((ca) => ca.attributeId === attributeId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryAttributes.length) return;

    const next = [...categoryAttributes];
    const tmp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = tmp;

    const normalized = next.map((ca, i) => ({ ...ca, order: i }));
    setCategoryAttributes(normalized);

    await persistCategoryAttributesOrder([
      { attributeId: normalized[index].attributeId, order: normalized[index].order },
      { attributeId: normalized[targetIndex].attributeId, order: normalized[targetIndex].order },
    ]);
  };

  const availableAttributes = allAttributes.filter(
    (attr) => !categoryAttributes.some((ca) => ca.attributeId === attr.id)
  );

  const handleAddAttributes = async (attributeIds: string[], asRequired: boolean) => {
    if (attributeIds.length === 0) return;

    setSaving(true);
    try {
      const response = await apiFetch(`${API_URL}/categories/${categoryId}/attributes/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          attributeIds,
          isRequired: asRequired,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось добавить атрибуты');
      }

      showMessage('success', 'Атрибуты добавлены');
      setShowAddModal(false);
      fetchData({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка добавления атрибутов';
      showMessage('error', message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteAttributeModal = (attributeId: string, attributeName: string) => {
    setDeleteModal({ attributeId, attributeName });
  };

  const closeDeleteAttributeModal = () => {
    if (deleting) return;
    setDeleteModal(null);
  };

  const handleDeleteAttributeFromCategory = async () => {
    if (!deleteModal) return;

    setDeleting(true);
    try {
      const response = await apiFetch(
        `${API_URL}/categories/${categoryId}/attributes/${deleteModal.attributeId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setDeleteModal(null);
        showMessage('success', 'Атрибут удалён из категории');
        fetchData({ silent: true });
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'Failed to remove attribute'
        );
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Ошибка удаления атрибута');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleRequired = async (attributeId: string, currentValue: boolean) => {
    try {
      const response = await apiFetch(
        `${API_URL}/categories/${categoryId}/attributes/${attributeId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ isRequired: !currentValue }),
        }
      );

      if (response.ok) {
        showMessage(
          'success',
          !currentValue
            ? 'Атрибут обязателен при сохранении карточки товара в этой категории'
            : 'Обязательность снята'
        );
        fetchData({ silent: true });
      } else {
        const data = await response.json().catch(() => ({}));
        showMessage(
          'error',
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'Не удалось обновить обязательность'
        );
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleCreateAttribute = async (payload: {
    name: string;
    slug: string;
    type: Attribute['type'];
    unit: string;
    isFilterable: boolean;
    optionRows: string[];
    linkAsRequired: boolean;
  }) => {
    setSaving(true);
    try {
      const valuesPayload = isListAttributeType(payload.type)
        ? payload.optionRows.map((v) => v.trim()).filter(Boolean)
        : undefined;

      const response = await apiFetch(`${API_URL}/categories/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: payload.name,
          slug: payload.slug,
          type: payload.type,
          unit: payload.unit || undefined,
          isFilterable: payload.isFilterable,
          values: valuesPayload,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'Не удалось создать атрибут'
        );
      }

      const created = await response.json();

      const linkResponse = await apiFetch(`${API_URL}/categories/${categoryId}/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          attributeId: created.id,
          isRequired: payload.linkAsRequired,
        }),
      });

      if (!linkResponse.ok) {
        throw new Error('Атрибут создан, но не удалось привязать к категории');
      }

      showMessage('success', 'Атрибут создан и добавлен в категорию');
      setShowCreateModal(false);
      fetchData({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка создания атрибута';
      showMessage('error', message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToProducts = async () => {
    if (selectedForApply.length === 0) {
      showMessage('error', 'Выберите атрибуты для применения');
      return;
    }

    setApplyingToProducts(true);
    try {
      const attributes = selectedForApply.map((attrId) => ({
        attributeId: attrId,
        defaultValue: defaultValues[attrId] || '',
      }));

      const response = await apiFetch(`${API_URL}/categories/${categoryId}/attributes/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ attributes }),
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('success', `Обновлено ${result.updated} из ${result.totalProducts} товаров`);
        setSelectedForApply([]);
        setDefaultValues({});
      } else {
        throw new Error('Failed to apply attributes');
      }
    } catch {
      showMessage('error', 'Ошибка применения атрибутов');
    } finally {
      setApplyingToProducts(false);
    }
  };

  const toggleSelectForApply = (attrId: string) => {
    setSelectedForApply((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
    );
  };

  const openEditModal = (attr: Attribute) => {
    setEditingAttribute(attr);
    const sortedValues = [...attr.values].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    );
    setEditForm({
      name: attr.name,
      slug: attr.slug,
      type: attr.type,
      unit: attr.unit || '',
      isFilterable: attr.isFilterable,
      optionRows: sortedValues.map((v) => v.value),
    });
    setShowEditModal(true);
  };

  const handleEditAttribute = async () => {
    if (!editingAttribute || !editForm.name || !editForm.slug) {
      showMessage('error', 'Заполните название и slug');
      return;
    }

    setSaving(true);
    try {
      const listValues = isListAttributeType(editForm.type)
        ? editForm.optionRows.map((v) => v.trim()).filter(Boolean)
        : [];

      const response = await apiFetch(`${API_URL}/attributes/${editingAttribute.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          type: editForm.type,
          unit: editForm.unit || null,
          isFilterable: editForm.isFilterable,
          values: listValues,
        }),
      });

      if (response.ok) {
        showMessage('success', 'Атрибут обновлён');
        setShowEditModal(false);
        setEditingAttribute(null);
        fetchData({ silent: true });
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update attribute');
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Ошибка обновления атрибута');
    } finally {
      setSaving(false);
    }
  };

  return {
    categoryId,
    router,
    category,
    categoryAttributes,
    loading,
    saving,
    noticeModal,
    reordering,
    showAddModal,
    setShowAddModal,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editingAttribute,
    editForm,
    setEditForm,
    applyingToProducts,
    selectedForApply,
    defaultValues,
    setDefaultValues,
    clearNoticeModal,
    availableAttributes,
    moveCategoryAttribute,
    handleAddAttributes,
    deleteModal,
    deleting,
    openDeleteAttributeModal,
    closeDeleteAttributeModal,
    handleDeleteAttributeFromCategory,
    handleToggleRequired,
    handleCreateAttribute,
    handleApplyToProducts,
    toggleSelectForApply,
    openEditModal,
    handleEditAttribute,
  };
}

export type CategoryAttributesPageModel = ReturnType<typeof useCategoryAttributesPage>;
