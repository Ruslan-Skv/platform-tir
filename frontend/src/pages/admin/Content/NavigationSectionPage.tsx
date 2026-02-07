'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';

import styles from './NavigationSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Категория каталога из API (для отображения в блоке «Каталог») */
export interface CatalogCategoryFromApi {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  parentId: string | null;
  children?: CatalogCategoryFromApi[];
  _count?: { products: number; totalProducts?: number };
}

export interface DropdownSubItemApi {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}

export interface DropdownItemApi {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  icon: string | null;
  submenu: DropdownSubItemApi[];
}

export interface NavItem {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  hasDropdown: boolean;
  isActive?: boolean;
  dropdownItems?: DropdownItemApi[];
}

export function NavigationSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    href: string;
    hasDropdown: boolean;
    isActive: boolean;
  }>({
    name: '',
    href: '',
    hasDropdown: false,
    isActive: true,
  });
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    href: string;
    hasDropdown: boolean;
    isActive: boolean;
  }>({
    name: '',
    href: '#',
    hasDropdown: false,
    isActive: true,
  });

  // Управление выпадающим меню: какой пункт навигации развёрнут
  const [expandedNavId, setExpandedNavId] = useState<string | null>(null);
  // Добавление пункта выпадающего меню (navItemId)
  const [addingDropdownForNavId, setAddingDropdownForNavId] = useState<string | null>(null);
  const [newDropdownItem, setNewDropdownItem] = useState({ name: '', href: '#', icon: '' });
  // Редактирование пункта выпадающего меню (dropdownItemId)
  const [editingDropdownId, setEditingDropdownId] = useState<string | null>(null);
  const [editDropdownForm, setEditDropdownForm] = useState({ name: '', href: '#', icon: '' });
  // Добавление подпункта (dropdownItemId)
  const [addingSubForDropdownId, setAddingSubForDropdownId] = useState<string | null>(null);
  const [newSubItem, setNewSubItem] = useState({ name: '', href: '#' });
  // Редактирование подпункта (subItemId)
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubForm, setEditSubForm] = useState({ name: '', href: '#' });

  // Категории каталога (для пункта «Каталог» — разделы и подразделы из Каталог → Категории)
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategoryFromApi[]>([]);
  const [catalogCategoriesLoading, setCatalogCategoriesLoading] = useState(false);

  // Кастомное модальное окно подтверждения удаления (вместо браузерного confirm)
  const [deleteModal, setDeleteModal] = useState<{
    type: 'nav' | 'dropdown' | 'sub';
    id: string;
    name: string;
    warning?: string;
  } | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const loadCatalogCategories = useCallback(async () => {
    setCatalogCategoriesLoading(true);
    try {
      const res = await fetch(`${API_URL}/categories?includeInactive=true`, {
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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/navigation`, { headers: getAuthHeaders() });
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
  };

  useEffect(() => {
    load();
  }, [getAuthHeaders]);

  // При раскрытии пункта «Каталог» подгружаем категории каталога (разделы и подразделы)
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
      const res = await fetch(`${API_URL}/admin/navigation/${editingId}`, {
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
        const res = await fetch(`${API_URL}/admin/navigation/${deleteModal.id}`, {
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
        const res = await fetch(`${API_URL}/admin/navigation/dropdown-items/${deleteModal.id}`, {
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
        const res = await fetch(
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

  const handleDelete = (_id: string) => {
    const item = items.find((i) => i.id === _id);
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
      const res = await fetch(`${API_URL}/admin/navigation/reorder`, {
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
      const res = await fetch(`${API_URL}/admin/navigation`, {
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
        setNewItem({ name: '', href: '#', hasDropdown: false, isActive: true });
        setAdding(false);
        showMessage('success', 'Кнопка меню добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
    }
  };

  // --- Dropdown items ---
  const addDropdownItem = async (navId: string) => {
    if (!newDropdownItem.name.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/navigation/${navId}/dropdown-items`, {
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
        setNewDropdownItem({ name: '', href: '#', icon: '' });
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
      const res = await fetch(`${API_URL}/admin/navigation/dropdown-items/${editingDropdownId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: editDropdownForm.name,
          href: editDropdownForm.href || '#',
          icon: editDropdownForm.icon || null,
        }),
      });
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
      const res = await fetch(`${API_URL}/admin/navigation/${navId}/dropdown-items/reorder`, {
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

  // --- Sub-items ---
  const addSubItem = async (dropdownId: string) => {
    if (!newSubItem.name.trim()) return;
    try {
      const res = await fetch(
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
        setNewSubItem({ name: '', href: '#' });
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
      const res = await fetch(
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
      const res = await fetch(
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

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Меню навигации</h1>
        <p className={styles.subtitle}>
          Управление кнопками в шапке сайта и вложенным выпадающим меню: добавление, редактирование,
          ссылки и иконки.
        </p>
      </header>

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      {deleteModal && (
        <div
          className={styles.modalOverlay}
          onClick={closeDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 id="delete-modal-title" className={styles.modalTitle}>
              Удаление
            </h2>
            <p className={styles.modalMessage}>Удалить «{deleteModal.name}»?</p>
            {deleteModal.warning && (
              <div className={styles.modalWarning}>{deleteModal.warning}</div>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeDeleteModal}
                disabled={deleteInProgress}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={confirmDelete}
                disabled={deleteInProgress}
              >
                {deleteInProgress ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Кнопки меню</h2>
        {items.length === 0 && !adding ? (
          <p style={{ color: '#6b7280', marginBottom: 16 }}>
            Пунктов пока нет. Добавьте первую кнопку ниже или выполните в backend команду{' '}
            <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 4 }}>
              npx prisma db seed
            </code>
            , чтобы создать пункты по умолчанию (Каталог, Блог и т.д.).
          </p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  title="Поднять"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  title="Опустить"
                >
                  ↓
                </button>
              </div>
              {editingId === item.id ? (
                <>
                  <div className={styles.editBlock}>
                    <div className={styles.inputRow}>
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Текст кнопки"
                      />
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm.href}
                        onChange={(e) => setEditForm((p) => ({ ...p, href: e.target.value }))}
                        placeholder="Ссылка"
                      />
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editForm.hasDropdown}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, hasDropdown: e.target.checked }))
                          }
                        />
                        Выпадающее меню
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, isActive: e.target.checked }))
                          }
                        />
                        Показывать в меню
                      </label>
                    </div>
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                        onClick={saveEdit}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={cancelEdit}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <span
                    className={styles.itemName}
                    style={item.isActive === false ? { opacity: 0.7 } : undefined}
                  >
                    {item.name}
                  </span>
                  <span className={styles.itemHref}>{item.href}</span>
                  {item.isActive === false && (
                    <span className={styles.itemBadgeInactive}>Скрыт</span>
                  )}
                  {item.hasDropdown && (
                    <span className={styles.itemBadge}>
                      {item.name === 'Каталог'
                        ? 'категории каталога'
                        : `выпадающее меню (${item.dropdownItems?.length ?? 0} пунктов)`}
                    </span>
                  )}
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => startEdit(item)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDelete(item.id)}
                    >
                      Удалить
                    </button>
                    {item.hasDropdown && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() =>
                          setExpandedNavId((prev) => (prev === item.id ? null : item.id))
                        }
                      >
                        {expandedNavId === item.id ? 'Свернуть меню' : 'Управление выпадающим меню'}
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Блок управления вложенным меню */}
              {item.hasDropdown && expandedNavId === item.id && editingId !== item.id && (
                <div className={styles.dropdownBlock}>
                  {item.name === 'Каталог' ? (
                    <>
                      <h3 className={styles.dropdownBlockTitle}>Разделы и подразделы каталога</h3>
                      <p className={styles.dropdownBlockNote}>
                        Содержимое выпадающего меню «Каталог» формируется из категорий каталога.
                        Управление: добавление, редактирование, порядок — в разделе Каталог →
                        Категории.
                      </p>
                      <Link
                        href="/admin/catalog/categories"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                        style={{ marginBottom: 12 }}
                      >
                        Управление категориями каталога
                      </Link>
                      {catalogCategoriesLoading ? (
                        <p style={{ color: '#6b7280', marginTop: 8 }}>Загрузка разделов…</p>
                      ) : catalogCategories.length === 0 ? (
                        <p style={{ color: '#6b7280', marginTop: 8 }}>
                          Категорий пока нет. Добавьте их в разделе Каталог → Категории.
                        </p>
                      ) : (
                        <div className={styles.catalogCategoriesList}>
                          {catalogCategories.map((root) => (
                            <div key={root.id} className={styles.dropdownItemRow}>
                              <span className={styles.dropdownItemName}>{root.name}</span>
                              <span className={styles.itemHref}>/catalog/products/{root.slug}</span>
                              {root.icon && (
                                <span className={styles.itemBadge} title={root.icon}>
                                  иконка
                                </span>
                              )}
                              {root._count?.products != null && (
                                <span className={styles.itemBadge}>
                                  {root._count.products} товаров
                                </span>
                              )}
                              <div className={styles.subList}>
                                {(root.children ?? []).map((child) => (
                                  <div key={child.id} className={styles.subItemRow}>
                                    <span className={styles.subItemName}>{child.name}</span>
                                    <span className={styles.itemHref}>
                                      /catalog/products/{root.slug}/{child.slug}
                                    </span>
                                    {child._count?.products != null && (
                                      <span className={styles.itemBadge}>
                                        {child._count.products} товаров
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className={styles.dropdownBlockTitle}>Пункты выпадающего меню</h3>
                      {(item.dropdownItems ?? []).map((d, dIndex) => (
                        <div key={d.id} className={styles.dropdownItemRow}>
                          {editingDropdownId === d.id ? (
                            <div className={styles.dropdownEditRow}>
                              <input
                                type="text"
                                className={styles.input}
                                value={editDropdownForm.name}
                                onChange={(e) =>
                                  setEditDropdownForm((p) => ({ ...p, name: e.target.value }))
                                }
                                placeholder="Название"
                              />
                              <input
                                type="text"
                                className={styles.input}
                                value={editDropdownForm.href}
                                onChange={(e) =>
                                  setEditDropdownForm((p) => ({ ...p, href: e.target.value }))
                                }
                                placeholder="Ссылка"
                              />
                              <input
                                type="text"
                                className={styles.input}
                                value={editDropdownForm.icon}
                                onChange={(e) =>
                                  setEditDropdownForm((p) => ({ ...p, icon: e.target.value }))
                                }
                                placeholder="Иконка (heroicons или URL)"
                              />
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                                onClick={saveDropdownItem}
                              >
                                Сохранить
                              </button>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                onClick={() => setEditingDropdownId(null)}
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={styles.dropdownItemName}>{d.name}</span>
                              <span className={styles.itemHref}>{d.href}</span>
                              {d.icon && (
                                <span className={styles.itemBadge} title={d.icon}>
                                  иконка
                                </span>
                              )}
                              <div className={styles.itemActions}>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                  onClick={() => startEditDropdown(d)}
                                >
                                  Изменить
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                                  onClick={() => openDeleteDropdownModal(d)}
                                >
                                  Удалить
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                  onClick={() =>
                                    setAddingSubForDropdownId((prev) =>
                                      prev === d.id ? null : d.id
                                    )
                                  }
                                >
                                  + Подпункт
                                </button>
                                {dIndex > 0 && (
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                    onClick={() => {
                                      const ids = (item.dropdownItems ?? []).map((x) => x.id);
                                      const swap = ids[dIndex - 1];
                                      ids[dIndex - 1] = ids[dIndex];
                                      ids[dIndex] = swap;
                                      reorderDropdownItems(item.id, ids);
                                    }}
                                    title="Поднять"
                                  >
                                    ↑
                                  </button>
                                )}
                                {dIndex < (item.dropdownItems?.length ?? 0) - 1 && (
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                    onClick={() => {
                                      const ids = (item.dropdownItems ?? []).map((x) => x.id);
                                      const swap = ids[dIndex + 1];
                                      ids[dIndex + 1] = ids[dIndex];
                                      ids[dIndex] = swap;
                                      reorderDropdownItems(item.id, ids);
                                    }}
                                    title="Опустить"
                                  >
                                    ↓
                                  </button>
                                )}
                              </div>
                            </>
                          )}

                          {/* Подпункты */}
                          <div className={styles.subList}>
                            {(d.submenu ?? []).map((s, sIdx) => (
                              <div key={s.id} className={styles.subItemRow}>
                                {editingSubId === s.id ? (
                                  <div className={styles.dropdownEditRow}>
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={editSubForm.name}
                                      onChange={(e) =>
                                        setEditSubForm((p) => ({ ...p, name: e.target.value }))
                                      }
                                      placeholder="Название"
                                    />
                                    <input
                                      type="text"
                                      className={styles.input}
                                      value={editSubForm.href}
                                      onChange={(e) =>
                                        setEditSubForm((p) => ({ ...p, href: e.target.value }))
                                      }
                                      placeholder="Ссылка"
                                    />
                                    <button
                                      type="button"
                                      className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                                      onClick={saveSubItem}
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                      onClick={() => setEditingSubId(null)}
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className={styles.subItemName}>{s.name}</span>
                                    <span className={styles.itemHref}>{s.href}</span>
                                    <div className={styles.itemActions}>
                                      <button
                                        type="button"
                                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                        onClick={() => startEditSub(s)}
                                      >
                                        Изменить
                                      </button>
                                      <button
                                        type="button"
                                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                                        onClick={() => openDeleteSubModal(s)}
                                      >
                                        Удалить
                                      </button>
                                      {sIdx > 0 && (
                                        <button
                                          type="button"
                                          className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                          onClick={() => {
                                            const ids = (d.submenu ?? []).map((x) => x.id);
                                            const t = ids[sIdx - 1];
                                            ids[sIdx - 1] = ids[sIdx];
                                            ids[sIdx] = t;
                                            reorderSubItems(d.id, ids);
                                          }}
                                          title="Поднять"
                                        >
                                          ↑
                                        </button>
                                      )}
                                      {sIdx < (d.submenu?.length ?? 0) - 1 && (
                                        <button
                                          type="button"
                                          className={`${styles.btn} ${styles.btnSecondary} ${styles.reorderBtn}`}
                                          onClick={() => {
                                            const ids = (d.submenu ?? []).map((x) => x.id);
                                            const t = ids[sIdx + 1];
                                            ids[sIdx + 1] = ids[sIdx];
                                            ids[sIdx] = t;
                                            reorderSubItems(d.id, ids);
                                          }}
                                          title="Опустить"
                                        >
                                          ↓
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                            {addingSubForDropdownId === d.id && (
                              <div className={styles.addForm}>
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={newSubItem.name}
                                  onChange={(e) =>
                                    setNewSubItem((p) => ({ ...p, name: e.target.value }))
                                  }
                                  placeholder="Название подпункта"
                                  style={{ maxWidth: 180 }}
                                />
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={newSubItem.href}
                                  onChange={(e) =>
                                    setNewSubItem((p) => ({ ...p, href: e.target.value }))
                                  }
                                  placeholder="Ссылка"
                                  style={{ maxWidth: 200 }}
                                />
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                                  onClick={() => addSubItem(d.id)}
                                  disabled={!newSubItem.name.trim()}
                                >
                                  Добавить
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                                  onClick={() => {
                                    setAddingSubForDropdownId(null);
                                    setNewSubItem({ name: '', href: '#' });
                                  }}
                                >
                                  Отмена
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {addingDropdownForNavId === item.id ? (
                        <div className={styles.addForm}>
                          <input
                            type="text"
                            className={styles.input}
                            value={newDropdownItem.name}
                            onChange={(e) =>
                              setNewDropdownItem((p) => ({ ...p, name: e.target.value }))
                            }
                            placeholder="Название пункта"
                            style={{ maxWidth: 180 }}
                          />
                          <input
                            type="text"
                            className={styles.input}
                            value={newDropdownItem.href}
                            onChange={(e) =>
                              setNewDropdownItem((p) => ({ ...p, href: e.target.value }))
                            }
                            placeholder="Ссылка"
                            style={{ maxWidth: 200 }}
                          />
                          <input
                            type="text"
                            className={styles.input}
                            value={newDropdownItem.icon}
                            onChange={(e) =>
                              setNewDropdownItem((p) => ({ ...p, icon: e.target.value }))
                            }
                            placeholder="Иконка (опционально)"
                            style={{ maxWidth: 160 }}
                          />
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                            onClick={() => addDropdownItem(item.id)}
                            disabled={!newDropdownItem.name.trim()}
                          >
                            Добавить пункт
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                            onClick={() => {
                              setAddingDropdownForNavId(null);
                              setNewDropdownItem({ name: '', href: '#', icon: '' });
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                          onClick={() => setAddingDropdownForNavId(item.id)}
                          style={{ marginTop: 8 }}
                        >
                          + Добавить пункт выпадающего меню
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {adding ? (
          <div className={styles.addForm}>
            <input
              type="text"
              className={styles.input}
              value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              placeholder="Текст кнопки"
              style={{ maxWidth: 180 }}
            />
            <input
              type="text"
              className={styles.input}
              value={newItem.href}
              onChange={(e) => setNewItem((p) => ({ ...p, href: e.target.value }))}
              placeholder="Ссылка (например /blog)"
              style={{ maxWidth: 200 }}
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newItem.hasDropdown}
                onChange={(e) => setNewItem((p) => ({ ...p, hasDropdown: e.target.checked }))}
              />
              Выпадающее меню
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newItem.isActive}
                onChange={(e) => setNewItem((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Показывать в меню
            </label>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
              onClick={handleAdd}
              disabled={!newItem.name.trim()}
            >
              Добавить
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
              onClick={() => {
                setAdding(false);
                setNewItem({ name: '', href: '#', hasDropdown: false, isActive: true });
              }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
            onClick={() => setAdding(true)}
            style={{ marginTop: 16 }}
          >
            + Добавить кнопку меню
          </button>
        )}
      </section>
    </div>
  );
}
