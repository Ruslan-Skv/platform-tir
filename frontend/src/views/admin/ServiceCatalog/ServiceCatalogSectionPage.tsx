'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import { SERVICE_ICON_OPTIONS } from './SERVICE_ICON_OPTIONS';
import styles from './ServiceCatalogSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type ServiceIconOptionValue = (typeof SERVICE_ICON_OPTIONS)[number]['value'];

interface NewServiceCategoryForm {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: ServiceIconOptionValue | '';
  image: string;
  showPricesInPublic: boolean;
  /** Наценка на группу, % к базовой цене видов работ (может быть отрицательной). */
  priceMarkupPercent: number;
}

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
  showPricesInPublic: boolean;
  priceMarkupPercent?: number;
  sortOrder: number;
  isActive: boolean;
  parentId?: string | null;
  children?: ServiceCatalogCategory[];
  items?: ServiceCatalogItem[];
  _count?: { items: number };
}

function flattenCategoriesForSelect(
  cats: ServiceCatalogCategory[],
  prefix = ''
): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const c of cats) {
    out.push({ id: c.id, name: prefix + c.name });
    if (c.children?.length) {
      out.push(...flattenCategoriesForSelect(c.children, prefix + '— '));
    }
  }
  return out;
}

/** id категории и всех потомков (для запрета выбора родителем самой себя / поддерева) */
function collectDescendantIds(cat: ServiceCatalogCategory): Set<string> {
  const s = new Set<string>();
  const walk = (c: ServiceCatalogCategory) => {
    for (const ch of c.children ?? []) {
      s.add(ch.id);
      walk(ch);
    }
  };
  walk(cat);
  return s;
}

/** Число вложенных категорий во всём поддереве (без самой категории) */
function countNestedCategories(cat: ServiceCatalogCategory): number {
  return collectDescendantIds(cat).size;
}

function buildDeleteCategoryModalMessage(name: string, nestedCategoryCount: number): string {
  if (nestedCategoryCount > 0) {
    return `Удалить категорию «${name}»?\n\nБудут также удалены все дочерние и вложенные подкатегории (${nestedCategoryCount}) и все виды работ внутри этой ветки.`;
  }
  return `Удалить категорию «${name}»? Все виды работ в этой категории также будут удалены.`;
}

function findCategoryById(
  cats: ServiceCatalogCategory[],
  id: string
): ServiceCatalogCategory | null {
  for (const c of cats) {
    if (c.id === id) return c;
    const inner = c.children?.length ? findCategoryById(c.children, id) : null;
    if (inner) return inner;
  }
  return null;
}

/** DFS-список для отображения дерева: дочерние узлы показываются только если родитель «раскрыт» */
function flattenVisible(
  cats: ServiceCatalogCategory[],
  level: number,
  expanded: Set<string>
): Array<{ cat: ServiceCatalogCategory; level: number }> {
  const out: Array<{ cat: ServiceCatalogCategory; level: number }> = [];
  for (const c of cats) {
    out.push({ cat: c, level });
    const ch = c.children;
    if (ch?.length && expanded.has(c.id)) {
      out.push(...flattenVisible(ch, level + 1, expanded));
    }
  }
  return out;
}

const INITIAL_NEW_SERVICE_CATEGORY: NewServiceCategoryForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  icon: '',
  image: '',
  showPricesInPublic: true,
  priceMarkupPercent: 0,
};

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export function ServiceCatalogSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [categories, setCategories] = useState<ServiceCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category';
    id: string;
    name: string;
    nestedCategoryCount: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [newCategory, setNewCategory] = useState<NewServiceCategoryForm>(() => ({
    ...INITIAL_NEW_SERVICE_CATEGORY,
  }));
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [showNewIconPicker, setShowNewIconPicker] = useState(false);
  const newCategoryFileInputRef = useRef<HTMLInputElement>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [editCategoryData, setEditCategoryData] = useState<{
    name: string;
    slug: string;
    icon: string;
    image: string;
    showPricesInPublic: boolean;
    priceMarkupPercent: number;
    parentId: string | null;
  } | null>(null);
  const editCategoryFileInputRef = useRef<HTMLInputElement>(null);
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
    editCategoryFileInputRef.current && (editCategoryFileInputRef.current.value = '');
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
    body.priceMarkupPercent = Number(newCategory.priceMarkupPercent) || 0;

    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/categories`, {
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
        showPricesInPublic: editCategoryData.showPricesInPublic,
        priceMarkupPercent: Number(editCategoryData.priceMarkupPercent) || 0,
        parentId: editCategoryData.parentId,
      };
      const res = await fetch(`${API_URL}/admin/service-catalog/categories/${id}`, {
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
      const res = await fetch(`${API_URL}/admin/service-catalog/categories/${deleteTarget.id}`, {
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
        <h1 className={styles.title}>Категории ремонта квартир</h1>
        <button type="button" className={styles.addButton} onClick={openCreateModal}>
          + Добавить категорию
        </button>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Категории</h2>
        <div className={styles.categoriesTree}>
          {categories.length > 0 ? (
            <ul className={styles.categoriesList}>
              {flattenVisible(categories, 0, expandedCategoryIds).map(({ cat, level }) => {
                const hasChildNodes = (cat.children?.length ?? 0) > 0;
                return (
                  <li key={cat.id} className={styles.categoryItem}>
                    {editingCategory === cat.id && editCategoryData ? (
                      <div className={styles.categoryEditRow}>
                        <input
                          type="text"
                          value={editCategoryData.name}
                          onChange={(e) =>
                            setEditCategoryData((p) =>
                              p ? { ...p, name: e.target.value, slug: slugify(e.target.value) } : p
                            )
                          }
                          className={styles.input}
                          placeholder="Название"
                        />
                        <input
                          type="text"
                          value={editCategoryData.slug}
                          onChange={(e) =>
                            setEditCategoryData((p) => (p ? { ...p, slug: e.target.value } : p))
                          }
                          className={styles.input}
                          placeholder="Slug"
                        />
                        <label className={styles.formGroup}>
                          <span className={styles.parentFieldLabel}>Родительская категория</span>
                          <select
                            className={styles.select}
                            value={editCategoryData.parentId ?? ''}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p ? { ...p, parentId: e.target.value || null } : p
                              )
                            }
                          >
                            <option value="">Корень (верхний уровень)</option>
                            {flatForParentSelect
                              .filter((o) => !editExcludedParentIds.has(o.id))
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <div className={styles.iconPickerWrapper}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                          >
                            {editCategoryData.icon &&
                            serviceCatalogIconMap[editCategoryData.icon] ? (
                              React.createElement(serviceCatalogIconMap[editCategoryData.icon], {
                                className: styles.iconButtonSvg,
                              })
                            ) : (
                              <span className={styles.iconButtonPlaceholder}>📁</span>
                            )}
                            {' Выбрать иконку'}
                          </button>
                          {showEditIconPicker && (
                            <div className={styles.iconPicker}>
                              <div className={styles.iconGrid}>
                                {SERVICE_ICON_OPTIONS.map((opt) => {
                                  const IconC = serviceCatalogIconMap[opt.value];
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      className={`${styles.iconOption} ${editCategoryData.icon === opt.value ? styles.iconSelected : ''}`}
                                      onClick={() => {
                                        setEditCategoryData((p) =>
                                          p ? { ...p, icon: opt.value } : p
                                        );
                                        setShowEditIconPicker(false);
                                      }}
                                      title={opt.label}
                                    >
                                      {IconC && <IconC className={styles.iconOptionSvg} />}
                                    </button>
                                  );
                                })}
                              </div>
                              {editCategoryData.icon && (
                                <button
                                  type="button"
                                  className={styles.clearIconButton}
                                  onClick={() => {
                                    setEditCategoryData((p) => (p ? { ...p, icon: '' } : p));
                                    setShowEditIconPicker(false);
                                  }}
                                >
                                  Очистить иконку
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={styles.orDivider}>или</span>
                        <div className={styles.imageUploadWrapper}>
                          <input
                            type="file"
                            ref={editCategoryFileInputRef}
                            accept="image/*"
                            onChange={handleEditCategoryImageSelect}
                            className={styles.fileInput}
                            id="edit-category-image"
                          />
                          <label htmlFor="edit-category-image" className={styles.uploadButton}>
                            📷 Картинка
                          </label>
                        </div>
                        {(editCategoryData.image || editCategoryData.icon) && (
                          <div className={styles.iconImagePreview}>
                            {editCategoryData.image ? (
                              <div className={styles.imagePreviewWrapper}>
                                <img
                                  src={editCategoryData.image}
                                  alt=""
                                  className={styles.imagePreview}
                                />
                                <button
                                  type="button"
                                  className={styles.removeImageButton}
                                  onClick={clearEditCategoryImage}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : editCategoryData.icon &&
                              serviceCatalogIconMap[editCategoryData.icon] ? (
                              <span className={styles.iconPreview}>
                                {React.createElement(serviceCatalogIconMap[editCategoryData.icon], {
                                  className: styles.iconPreviewSvg,
                                })}
                              </span>
                            ) : null}
                          </div>
                        )}
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={editCategoryData.showPricesInPublic}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p ? { ...p, showPricesInPublic: e.target.checked } : p
                              )
                            }
                          />
                          Показывать цены на сайте
                        </label>
                        <label className={styles.formGroup}>
                          <span className={styles.parentFieldLabel}>
                            Наценка на группу, % (к базовой цене; может быть отрицательной)
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            className={styles.input}
                            value={editCategoryData.priceMarkupPercent}
                            onChange={(e) =>
                              setEditCategoryData((p) =>
                                p
                                  ? {
                                      ...p,
                                      priceMarkupPercent: parseFloat(e.target.value) || 0,
                                    }
                                  : p
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.saveButton}
                          onClick={() => handleUpdateCategory(cat.id)}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className={styles.cancelButton}
                          onClick={() => {
                            setEditingCategory(null);
                            setEditCategoryData(null);
                            setShowEditIconPicker(false);
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div
                        className={styles.categoryRow}
                        style={{ paddingLeft: `${12 + level * 18}px` }}
                      >
                        <div className={styles.categoryInfo}>
                          {hasChildNodes ? (
                            <button
                              type="button"
                              className={styles.treeExpandButton}
                              onClick={() => toggleCategoryExpand(cat.id)}
                              title={expandedCategoryIds.has(cat.id) ? 'Свернуть' : 'Развернуть'}
                              aria-expanded={expandedCategoryIds.has(cat.id)}
                            >
                              {expandedCategoryIds.has(cat.id) ? '▼' : '▶'}
                            </button>
                          ) : (
                            <span className={styles.expandPlaceholder} />
                          )}
                          {cat.image ? (
                            <img src={cat.image} alt="" className={styles.categoryImage} />
                          ) : cat.icon && serviceCatalogIconMap[cat.icon] ? (
                            <span className={styles.categoryIcon}>
                              {React.createElement(serviceCatalogIconMap[cat.icon], {
                                className: styles.categoryIconSvg,
                              })}
                            </span>
                          ) : null}
                          <Link
                            href={`/catalog/services/${cat.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.categoryName}
                          >
                            {cat.name}
                          </Link>
                          <span className={styles.categorySlug}>{cat.slug}</span>
                          <span className={styles.itemsCount}>
                            {cat.items?.length ?? cat._count?.items ?? 0} видов работ
                          </span>
                        </div>
                        <div className={styles.categoryActions}>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => {
                              setEditingCategory(cat.id);
                              setEditCategoryData({
                                name: cat.name,
                                slug: cat.slug,
                                icon: cat.icon || '',
                                image: cat.image || '',
                                showPricesInPublic: cat.showPricesInPublic ?? true,
                                priceMarkupPercent: Number(cat.priceMarkupPercent ?? 0),
                                parentId: cat.parentId ?? null,
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
                                type: 'category',
                                id: cat.id,
                                name: cat.name,
                                nestedCategoryCount: countNestedCategories(cat),
                              })
                            }
                            title="Удалить категорию"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptyList}>Категории не найдены</div>
          )}
        </div>
      </section>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => !creating && closeCreateModal()}>
          <div className={styles.createModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Создать категорию</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {createMessage && (
                <div className={`${styles.messageBox} ${styles[createMessage.type]}`}>
                  {createMessage.text}
                </div>
              )}

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Название *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategory((prev) => ({
                      ...prev,
                      name,
                      slug: slugify(name),
                    }));
                  }}
                  placeholder="Например: Малярные работы"
                  className={styles.createInput}
                />
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Slug (URL) *</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="malyarnye-raboty"
                  className={styles.createInput}
                />
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Родительская категория</label>
                <select
                  className={styles.createSelect}
                  value={newCategory.parentId}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, parentId: e.target.value }))
                  }
                >
                  <option value="">Без родителя (корневая)</option>
                  {flatForParentSelect.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Описание</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Краткое описание категории"
                  className={styles.createTextarea}
                  rows={3}
                />
              </div>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>Иконка или изображение</label>
                <div className={styles.createIconImageRow}>
                  <div className={styles.iconPickerWrapper}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setShowNewIconPicker(!showNewIconPicker)}
                    >
                      {newCategory.icon && serviceCatalogIconMap[newCategory.icon] ? (
                        React.createElement(serviceCatalogIconMap[newCategory.icon], {
                          className: styles.iconButtonSvg,
                        })
                      ) : (
                        <span className={styles.iconButtonPlaceholder}>📁</span>
                      )}
                      {' Выбрать иконку'}
                    </button>
                    {showNewIconPicker && (
                      <div className={styles.iconPicker}>
                        <div className={styles.iconGrid}>
                          {SERVICE_ICON_OPTIONS.map((opt) => {
                            const IconC = serviceCatalogIconMap[opt.value];
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                className={`${styles.iconOption} ${newCategory.icon === opt.value ? styles.iconSelected : ''}`}
                                onClick={() => {
                                  setNewCategory((prev) => ({ ...prev, icon: opt.value }));
                                  setShowNewIconPicker(false);
                                }}
                                title={opt.label}
                              >
                                {IconC && <IconC className={styles.iconOptionSvg} />}
                              </button>
                            );
                          })}
                        </div>
                        {newCategory.icon ? (
                          <button
                            type="button"
                            className={styles.clearIconButton}
                            onClick={() => {
                              setNewCategory((prev) => ({ ...prev, icon: '' }));
                              setShowNewIconPicker(false);
                            }}
                          >
                            Очистить иконку
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <span className={styles.orDivider}>или</span>
                  <div className={styles.imageUploadWrapper}>
                    <input
                      type="file"
                      ref={newCategoryFileInputRef}
                      accept="image/*"
                      onChange={handleNewCategoryImageSelect}
                      className={styles.fileInput}
                      id="new-category-image-modal"
                    />
                    <label htmlFor="new-category-image-modal" className={styles.uploadButton}>
                      📷 Загрузить картинку
                    </label>
                  </div>
                </div>

                {(newCategory.icon || newCategory.image) && (
                  <div className={styles.createPreviewSection}>
                    <span className={styles.previewLabel}>Предпросмотр:</span>
                    <div className={styles.createPreview}>
                      {newCategory.image ? (
                        <div className={styles.imagePreviewWrapper}>
                          <img src={newCategory.image} alt="" className={styles.imagePreview} />
                          <button
                            type="button"
                            className={styles.removeImageButton}
                            onClick={clearNewCategoryImage}
                          >
                            ✕
                          </button>
                        </div>
                      ) : newCategory.icon && serviceCatalogIconMap[newCategory.icon] ? (
                        <span className={styles.iconPreview}>
                          {React.createElement(serviceCatalogIconMap[newCategory.icon], {
                            className: styles.iconPreviewSvg,
                          })}
                        </span>
                      ) : null}
                      <span className={styles.previewName}>
                        {newCategory.name || 'Название категории'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={newCategory.showPricesInPublic}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      showPricesInPublic: e.target.checked,
                    }))
                  }
                />
                Показывать цены на сайте
              </label>

              <div className={styles.createFormGroup}>
                <label className={styles.label}>
                  Наценка на группу, % (к базовой цене видов работ; может быть отрицательной)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  value={newCategory.priceMarkupPercent}
                  onChange={(e) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      priceMarkupPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalFooterCancel}
                onClick={closeCreateModal}
                disabled={creating}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleAddCategory()}
                disabled={creating || !newCategory.name.trim() || !newCategory.slug.trim()}
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={
          deleteTarget && deleteTarget.nestedCategoryCount > 0
            ? 'Удаление категории и подкатегорий'
            : 'Подтверждение удаления'
        }
        message={
          deleteTarget
            ? buildDeleteCategoryModalMessage(deleteTarget.name, deleteTarget.nestedCategoryCount)
            : ''
        }
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
