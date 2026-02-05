'use client';

import React, { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './NavigationSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  hasDropdown: boolean;
  category: string | null;
}

const CATEGORY_OPTIONS = [
  { value: '', label: '— нет —' },
  { value: 'products', label: 'products (каталог товаров)' },
  { value: 'services', label: 'services (каталог услуг)' },
  { value: 'promotions', label: 'promotions (акции)' },
  { value: 'blog', label: 'blog' },
  { value: 'photo', label: 'photo' },
];

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
    category: string;
  }>({
    name: '',
    href: '',
    hasDropdown: false,
    category: '',
  });
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    href: string;
    hasDropdown: boolean;
    category: string;
  }>({
    name: '',
    href: '#',
    hasDropdown: false,
    category: '',
  });

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
        setItems(data);
      }
    } catch (e) {
      console.error(e);
      showMessage('error', 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [getAuthHeaders]);

  const startEdit = (item: NavItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      href: item.href,
      hasDropdown: item.hasDropdown,
      category: item.category ?? '',
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
          hasDropdown: editForm.hasDropdown,
          category: editForm.category || null,
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

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот пункт меню?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/navigation/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        showMessage('success', 'Пункт меню удалён');
      } else {
        showMessage('error', 'Ошибка удаления');
      }
    } catch {
      showMessage('error', 'Ошибка удаления');
    }
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
          category: newItem.category || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        setNewItem({ name: '', href: '#', hasDropdown: false, category: '' });
        setAdding(false);
        showMessage('success', 'Кнопка меню добавлена');
      } else {
        showMessage('error', 'Ошибка добавления');
      }
    } catch {
      showMessage('error', 'Ошибка добавления');
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
          Управление кнопками в шапке сайта: добавление, редактирование текста и ссылок, порядок.
        </p>
      </header>

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Кнопки меню</h2>
        {items.length === 0 && !adding ? (
          <p style={{ color: '#6b7280', marginBottom: 16 }}>
            Пунктов пока нет. Добавьте первую кнопку ниже или используйте константы на фронте по
            умолчанию.
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
                  <div className={styles.inputRow} style={{ flex: 2 }}>
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
                    <select
                      className={styles.select}
                      value={editForm.category}
                      onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value || 'empty'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                </>
              ) : (
                <>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemHref}>{item.href}</span>
                  {item.hasDropdown && (
                    <span className={styles.itemBadge}>
                      dropdown {item.category ? `· ${item.category}` : ''}
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
                  </div>
                </>
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
            <select
              className={styles.select}
              value={newItem.category}
              onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
                setNewItem({ name: '', href: '#', hasDropdown: false, category: '' });
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
