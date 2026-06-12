'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import {
  API_URL,
  EMPTY_DROPDOWN_ITEM_FORM,
  EMPTY_EDIT_FORM,
  EMPTY_NAV_ITEM_FORM,
  EMPTY_SUB_ITEM_FORM,
} from '../navigation-section-page.constants';
import type {
  CatalogCategoryFromApi,
  DeleteModalState,
  DropdownItemApi,
  DropdownSubItemApi,
  NavItem,
  PageMessage,
} from '../navigation-section-page.types';

export function useNavigationSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_NAV_ITEM_FORM);
  const [expandedNavId, setExpandedNavId] = useState<string | null>(null);
  const [addingDropdownForNavId, setAddingDropdownForNavId] = useState<string | null>(null);
  const [newDropdownItem, setNewDropdownItem] = useState(EMPTY_DROPDOWN_ITEM_FORM);
  const [editingDropdownId, setEditingDropdownId] = useState<string | null>(null);
  const [editDropdownForm, setEditDropdownForm] = useState(EMPTY_DROPDOWN_ITEM_FORM);
  const [addingSubForDropdownId, setAddingSubForDropdownId] = useState<string | null>(null);
  const [newSubItem, setNewSubItem] = useState(EMPTY_SUB_ITEM_FORM);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubForm, setEditSubForm] = useState(EMPTY_SUB_ITEM_FORM);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategoryFromApi[]>([]);
  const [catalogCategoriesLoading, setCatalogCategoriesLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadCatalogCategories = useCallback(async () => {
    setCatalogCategoriesLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/categories?includeInactive=true`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogCategories(Array.isArray(data) ? data : []);
      } else {
        setCatalogCategories([]);
      }
    } catch {
      setCatalogCategories([]);
    } finally {
      setCatalogCategoriesLoading(false);
    }
  }, [getAuthHeaders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/admin/navigation`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems([]);
        if (res.status === 401) {
          showMessage('error', 'Необходимо войти в аккаунт администратора');
        } else if (res.status === 403) {
          showMessage('error', 'Недостаточно прав для просмотра меню навигации');
        } else {
          showMessage('error', `Ошибка загрузки (${res.status}). Проверьте консоль.`);
        }
      }
    } catch (e) {
      console.error(e);
      setItems([]);
      showMessage(
        'error',
        'Ошибка подключения к серверу. Проверьте NEXT_PUBLIC_API_URL и доступность бэкенда.'
      );
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showMessage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!expandedNavId) {
      setCatalogCategories([]);
      return;
    }
    const expandedItem = items.find((i) => i.id === expandedNavId);
    if (expandedItem?.name === 'Каталог') {
      loadCatalogCategories();
    } else {
      setCatalogCategories([]);
    }
  }, [expandedNavId, items, loadCatalogCategories]);

  const startEdit = (item: NavItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      href: item.href,
      hasDropdown: item.hasDropdown,
      isActive: item.isActive !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/navigation/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: editForm.name,
          href: editForm.href || '#',
          hasDropdown: Boolean(editForm.hasDropdown),
          isActive: editForm.isActive,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        setEditingId(null);
        showMessage('success', 'Изменения сохранены');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    }
  };

  const openDeleteNavModal = (item: NavItem) => {
    const dropdownCount = item.dropdownItems?.length ?? 0;
    const subCount = item.dropdownItems?.reduce((acc, d) => acc + (d.submenu?.length ?? 0), 0) ?? 0;
    const total = dropdownCount + subCount;
    setDeleteModal({
      type: 'nav',
      id: item.id,
      name: item.name,
      warning:
        total > 0
          ? `Вместе с пунктом меню будут удалены все пункты выпадающего меню: ${dropdownCount} разделов и ${subCount} подпунктов.`
          : undefined,
    });
  };

  const openDeleteDropdownModal = (d: DropdownItemApi) => {
    const subCount = d.submenu?.length ?? 0;
    setDeleteModal({
      type: 'dropdown',
      id: d.id,
      name: d.name,
      warning:
        subCount > 0
          ? `Вместе с разделом будут удалены все подпункты (${subCount} шт.).`
          : undefined,
    });
  };

  const openDeleteSubModal = (s: DropdownSubItemApi) => {
    setDeleteModal({ type: 'sub', id: s.id, name: s.name });
  };

  const closeDeleteModal = () => {
    if (!deleteInProgress) setDeleteModal(null);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleteInProgress(true);
    try {
      if (deleteModal.type === 'nav') {
        const res = await apiFetch(`${API_URL}/admin/navigation/${deleteModal.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          setItems((prev) => prev.filter((i) => i.id !== deleteModal.id));
          showMessage('success', 'Пункт меню удалён');
          setDeleteModal(null);
        } else {
          showMessage('error', 'Ошибка удаления');
        }
      } else if (deleteModal.type === 'dropdown') {
        const res = await apiFetch(`${API_URL}/admin/navigation/dropdown-items/${deleteModal.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          await load();
          showMessage('success', 'Пункт выпадающего меню удалён');
          setDeleteModal(null);
        } else {
          showMessage('error', 'Ошибка удаления');
        }
      } else {
        const res = await apiFetch(
          `${API_URL}/admin/navigation/dropdown-items/sub-items/${deleteModal.id}`,
          { method: 'DELETE', headers: getAuthHeaders() }
        );
        if (res.ok) {
          await load();
          showMessage('success', 'Подпункт удалён');
          setDeleteModal(null);
        } else {
          showMessage('error', 'Ошибка удаления');
        }
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleDelete = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) openDeleteNavModal(item);
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const reordered = [...items];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, removed);
    const ids = reordered.map((i) => i.id);
    try {
      const res = await apiFetch(`${API_URL}/admin/navigation/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        showMessage('success', 'Порядок обновлён');
      } else {
        showMessage('error', 'Ошибка изменения порядка');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    }
  };

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/navigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: newItem.name.trim(),
          href: newItem.href?.trim() || '#',
          hasDropdown: newItem.hasDropdown,
          isActive: newItem.isActive,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        setNewItem(EMPTY_NAV_ITEM_FORM);
        setAdding(false);
        showMessage('success', 'Кнопка меню добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const addDropdownItem = async (navId: string) => {
    if (!newDropdownItem.name.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/admin/navigation/${navId}/dropdown-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: newDropdownItem.name.trim(),
          href: newDropdownItem.href?.trim() || '#',
          icon: newDropdownItem.icon?.trim() || null,
        }),
      });
      if (res.ok) {
        await load();
        setAddingDropdownForNavId(null);
        setNewDropdownItem(EMPTY_DROPDOWN_ITEM_FORM);
        showMessage('success', 'Пункт выпадающего меню добавлен');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const startEditDropdown = (d: DropdownItemApi) => {
    setEditingDropdownId(d.id);
    setEditDropdownForm({ name: d.name, href: d.href, icon: d.icon ?? '' });
  };

  const saveDropdownItem = async () => {
    if (!editingDropdownId) return;
    try {
      const res = await apiFetch(
        `${API_URL}/admin/navigation/dropdown-items/${editingDropdownId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            name: editDropdownForm.name,
            href: editDropdownForm.href || '#',
            icon: editDropdownForm.icon || null,
          }),
        }
      );
      if (res.ok) {
        await load();
        setEditingDropdownId(null);
        showMessage('success', 'Пункт выпадающего меню сохранён');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    }
  };

  const reorderDropdownItems = async (navId: string, ids: string[]) => {
    try {
      const res = await apiFetch(`${API_URL}/admin/navigation/${navId}/dropdown-items/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        await load();
        showMessage('success', 'Порядок обновлён');
      } else {
        showMessage('error', 'Ошибка изменения порядка');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    }
  };

  const addSubItem = async (dropdownId: string) => {
    if (!newSubItem.name.trim()) return;
    try {
      const res = await apiFetch(
        `${API_URL}/admin/navigation/dropdown-items/${dropdownId}/sub-items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            name: newSubItem.name.trim(),
            href: newSubItem.href?.trim() || '#',
          }),
        }
      );
      if (res.ok) {
        await load();
        setAddingSubForDropdownId(null);
        setNewSubItem(EMPTY_SUB_ITEM_FORM);
        showMessage('success', 'Подпункт добавлен');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  const startEditSub = (s: DropdownSubItemApi) => {
    setEditingSubId(s.id);
    setEditSubForm({ name: s.name, href: s.href });
  };

  const saveSubItem = async () => {
    if (!editingSubId) return;
    try {
      const res = await apiFetch(
        `${API_URL}/admin/navigation/dropdown-items/sub-items/${editingSubId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            name: editSubForm.name,
            href: editSubForm.href || '#',
          }),
        }
      );
      if (res.ok) {
        await load();
        setEditingSubId(null);
        showMessage('success', 'Подпункт сохранён');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    }
  };

  const reorderSubItems = async (dropdownId: string, ids: string[]) => {
    try {
      const res = await apiFetch(
        `${API_URL}/admin/navigation/dropdown-items/${dropdownId}/sub-items/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ ids }),
        }
      );
      if (res.ok) {
        await load();
        showMessage('success', 'Порядок подпунктов обновлён');
      } else {
        showMessage('error', 'Ошибка изменения порядка');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    }
  };

  return {
    items,
    loading,
    message,
    editingId,
    editForm,
    setEditForm,
    adding,
    setAdding,
    newItem,
    setNewItem,
    expandedNavId,
    setExpandedNavId,
    addingDropdownForNavId,
    setAddingDropdownForNavId,
    newDropdownItem,
    setNewDropdownItem,
    editingDropdownId,
    setEditingDropdownId,
    editDropdownForm,
    setEditDropdownForm,
    addingSubForDropdownId,
    setAddingSubForDropdownId,
    newSubItem,
    setNewSubItem,
    editingSubId,
    setEditingSubId,
    editSubForm,
    setEditSubForm,
    catalogCategories,
    catalogCategoriesLoading,
    deleteModal,
    deleteInProgress,
    startEdit,
    cancelEdit,
    saveEdit,
    openDeleteDropdownModal,
    openDeleteSubModal,
    closeDeleteModal,
    confirmDelete,
    handleDelete,
    moveItem,
    handleAdd,
    addDropdownItem,
    startEditDropdown,
    saveDropdownItem,
    reorderDropdownItems,
    addSubItem,
    startEditSub,
    saveSubItem,
    reorderSubItems,
  };
}

export type NavigationSectionPageModel = ReturnType<typeof useNavigationSectionPage>;
