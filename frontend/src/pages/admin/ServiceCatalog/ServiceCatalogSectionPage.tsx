'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import { SERVICE_ICON_OPTIONS } from './SERVICE_ICON_OPTIONS';
import styles from './ServiceCatalogSectionPage.module.css';

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
  items?: ServiceCatalogItem[];
  _count?: { items: number };
}

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
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [showNewIconPicker, setShowNewIconPicker] = useState(false);
  const newCategoryFileInputRef = useRef<HTMLInputElement>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [editCategoryData, setEditCategoryData] = useState<{
    name: string;
    slug: string;
    icon: string;
    image: string;
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

  const handleNewCategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewCategoryImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearNewCategoryImage = () => {
    setNewCategoryImage('');
    newCategoryFileInputRef.current && (newCategoryFileInputRef.current.value = '');
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
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      showMessage('error', 'Заполните название и slug');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          slug: newCategorySlug.trim(),
          icon: newCategoryIcon || undefined,
          image: newCategoryImage.trim() || undefined,
        }),
      });
      if (res.ok) {
        showMessage('success', 'Категория создана');
        setNewCategoryName('');
        setNewCategorySlug('');
        setNewCategoryIcon('');
        setNewCategoryImage('');
        clearNewCategoryImage();
        setShowNewCategory(false);
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage('error', err.message || 'Ошибка создания');
      }
    } catch {
      showMessage('error', 'Ошибка создания');
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
      const res = await fetch(`${API_URL}/admin/service-catalog/categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showMessage('success', 'Категория удалена');
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
        <h1 className={styles.title}>Категории каталога услуг</h1>
        <div className={styles.headerActions}>
          <Link href="/admin/service-catalog/items" className={styles.viewLink}>
            Виды работ
          </Link>
          <Link href="/admin/service-catalog/settings" className={styles.viewLink}>
            Настройки
          </Link>
          <Link
            href="/catalog/services"
            target="_blank"
            rel="noreferrer"
            className={styles.viewLink}
          >
            Просмотр на сайте
          </Link>
        </div>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Категории</h2>
        <div className={styles.categoriesTree}>
          {categories.length > 0 ? (
            <ul className={styles.categoriesList}>
              {categories.map((cat) => (
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
                      <div className={styles.iconPickerWrapper}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                        >
                          {editCategoryData.icon && serviceCatalogIconMap[editCategoryData.icon] ? (
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
                    <div className={styles.categoryRow}>
                      <div className={styles.categoryInfo}>
                        <span className={styles.expandPlaceholder} />
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
                            setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })
                          }
                          title="Удалить категорию"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyList}>Категории не найдены</div>
          )}
        </div>
        <div className={styles.addCategoryRow}>
          {showNewCategory ? (
            <div className={styles.addForm}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setNewCategorySlug(slugify(e.target.value));
                }}
                placeholder="Название (напр. Малярные работы)"
                className={styles.input}
              />
              <input
                type="text"
                value={newCategorySlug}
                onChange={(e) => setNewCategorySlug(e.target.value)}
                placeholder="Slug"
                className={styles.input}
              />
              <div className={styles.iconPickerWrapper}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setShowNewIconPicker(!showNewIconPicker)}
                >
                  {newCategoryIcon && serviceCatalogIconMap[newCategoryIcon] ? (
                    React.createElement(serviceCatalogIconMap[newCategoryIcon], {
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
                            className={`${styles.iconOption} ${newCategoryIcon === opt.value ? styles.iconSelected : ''}`}
                            onClick={() => {
                              setNewCategoryIcon(opt.value);
                              setShowNewIconPicker(false);
                            }}
                            title={opt.label}
                          >
                            {IconC && <IconC className={styles.iconOptionSvg} />}
                          </button>
                        );
                      })}
                    </div>
                    {newCategoryIcon && (
                      <button
                        type="button"
                        className={styles.clearIconButton}
                        onClick={() => {
                          setNewCategoryIcon('');
                          setShowNewIconPicker(false);
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
                  ref={newCategoryFileInputRef}
                  accept="image/*"
                  onChange={handleNewCategoryImageSelect}
                  className={styles.fileInput}
                  id="new-category-image"
                />
                <label htmlFor="new-category-image" className={styles.uploadButton}>
                  📷 Загрузить картинку
                </label>
              </div>
              {(newCategoryIcon || newCategoryImage) && (
                <div className={styles.iconImagePreview}>
                  {newCategoryImage ? (
                    <div className={styles.imagePreviewWrapper}>
                      <img src={newCategoryImage} alt="" className={styles.imagePreview} />
                      <button
                        type="button"
                        className={styles.removeImageButton}
                        onClick={clearNewCategoryImage}
                      >
                        ✕
                      </button>
                    </div>
                  ) : newCategoryIcon && serviceCatalogIconMap[newCategoryIcon] ? (
                    <span className={styles.iconPreview}>
                      {React.createElement(serviceCatalogIconMap[newCategoryIcon], {
                        className: styles.iconPreviewSvg,
                      })}
                    </span>
                  ) : null}
                </div>
              )}
              <button type="button" className={styles.saveButton} onClick={handleAddCategory}>
                Создать
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategoryName('');
                  setNewCategorySlug('');
                  setNewCategoryIcon('');
                  setNewCategoryImage('');
                  setShowNewIconPicker(false);
                }}
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setShowNewCategory(true)}
            >
              + Добавить категорию
            </button>
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Подтверждение удаления"
        message={deleteTarget ? `Удалить категорию «${deleteTarget.name}»?` : ''}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
