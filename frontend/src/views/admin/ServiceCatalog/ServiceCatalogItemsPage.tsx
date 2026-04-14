'use client';

import React, { useCallback, useEffect, useState } from 'react';

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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/categories?includeInactive=true`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const c = await res.json();
        setCategories(c);
      }
    } catch {
      showMessage('error', 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
  }, [load]);

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
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Виды работ</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Виды работ по категориям</h2>
        {categories.length === 0 ? (
          <p className={styles.empty}>
            Создайте категории в разделе «Категории», затем добавляйте виды работ.
          </p>
        ) : (
          flattenServiceCategories(categories).map(({ cat, level }) => {
            const isCollapsed = collapsedCategoryIds.has(cat.id);
            const itemsCount = cat.items?.length ?? 0;
            return (
              <div key={cat.id} className={styles.categoryBlock}>
                <div
                  className={styles.categoryBlockHeader}
                  style={{ paddingLeft: `${10 + level * 16}px` }}
                >
                  <button
                    type="button"
                    className={styles.expandButton}
                    onClick={() => toggleCategory(cat.id)}
                    title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? '+' : '−'}
                  </button>
                  <h3 className={styles.categoryBlockTitle}>
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
                  </h3>
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
                        {(cat.items ?? []).map((item) => (
                          <tr key={item.id}>
                            <td className={styles.nameCell}>
                              {editingItem === item.id ? (
                                <textarea
                                  value={editItemData.name ?? item.name}
                                  onChange={(e) =>
                                    setEditItemData((p) => ({ ...p, name: e.target.value }))
                                  }
                                  className={styles.nameTextarea}
                                  rows={2}
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
                        ))}
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
                                rows={2}
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
                                  setNewItem({ name: '', description: '', price: '', unit: 'м²' });
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
  );
}
