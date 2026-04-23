'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import styles from './CategoriesPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Популярные иконки для категорий
const CATEGORY_ICONS = [
  '🚪',
  '🏠',
  '🔐',
  '🔑',
  '🛡️',
  '🏗️',
  '🔧',
  '⚙️',
  '🪛',
  '🔩',
  '📦',
  '🪵',
  '🧱',
  '🏢',
  '🏘️',
  '🚿',
  '🛁',
  '🪞',
  '💡',
  '🔌',
  '🪟',
  '🚪',
  '🛋️',
  '🪑',
  '🛏️',
  '🧰',
  '🗄️',
  '📁',
  '🎯',
  '⭐',
];

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  order: number;
  parentId: string | null;
  children?: Category[];
  _count?: {
    products: number;
    totalProducts?: number; // Сумма товаров включая подкатегории
  };
}

export function CategoriesPage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Состояние для модального окна удаления
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    category: Category | null;
  }>({ isOpen: false, category: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Состояние для модального окна создания категории
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    icon: '',
    image: '',
  });
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      // Загружаем все категории включая неактивные для админки
      const response = await apiFetch(`${API_URL}/categories?includeInactive=true`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Expand all by default
        const ids = new Set<string>();
        const collectIds = (cats: Category[]) => {
          cats.forEach((cat) => {
            if (cat.children && cat.children.length > 0) {
              ids.add(cat.id);
              collectIds(cat.children);
            }
          });
        };
        collectIds(data);
        setExpandedCategories(ids);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Flatten categories for select dropdown
  const flatCategories = useMemo(() => {
    const flatten = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
      const result: { id: string; name: string }[] = [];
      for (const cat of cats) {
        result.push({ id: cat.id, name: prefix + cat.name });
        if (cat.children && cat.children.length > 0) {
          result.push(...flatten(cat.children, prefix + '— '));
        }
      }
      return result;
    };
    return flatten(categories);
  }, [categories]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .replace(/а/g, 'a')
      .replace(/б/g, 'b')
      .replace(/в/g, 'v')
      .replace(/г/g, 'g')
      .replace(/д/g, 'd')
      .replace(/е/g, 'e')
      .replace(/ё/g, 'yo')
      .replace(/ж/g, 'zh')
      .replace(/з/g, 'z')
      .replace(/и/g, 'i')
      .replace(/й/g, 'y')
      .replace(/к/g, 'k')
      .replace(/л/g, 'l')
      .replace(/м/g, 'm')
      .replace(/н/g, 'n')
      .replace(/о/g, 'o')
      .replace(/п/g, 'p')
      .replace(/р/g, 'r')
      .replace(/с/g, 's')
      .replace(/т/g, 't')
      .replace(/у/g, 'u')
      .replace(/ф/g, 'f')
      .replace(/х/g, 'h')
      .replace(/ц/g, 'ts')
      .replace(/ч/g, 'ch')
      .replace(/ш/g, 'sh')
      .replace(/щ/g, 'sch')
      .replace(/ъ/g, '')
      .replace(/ы/g, 'y')
      .replace(/ь/g, '')
      .replace(/э/g, 'e')
      .replace(/ю/g, 'yu')
      .replace(/я/g, 'ya')
      .substring(0, 100);
  };

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        // For now, we store the base64 data URL as the image
        // In production, you'd upload to a server and get back a URL
        setNewCategory((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear image
  const clearImage = () => {
    setImagePreview(null);
    setNewCategory((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle create category
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
        setNewCategory({ name: '', slug: '', description: '', parentId: '', icon: '', image: '' });
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
    } catch (err) {
      setCreateMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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
        fetchCategories(); // Обновляем список
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message || 'Ошибка при удалении категории');
      }
    } catch (error) {
      setDeleteError('Ошибка сети при удалении категории');
    } finally {
      setDeleting(false);
    }
  };

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className={styles.categoryItem}>
        <div className={styles.categoryRow} style={{ paddingLeft: `${level * 24 + 16}px` }}>
          <div className={styles.categoryInfo}>
            {hasChildren ? (
              <button className={styles.expandButton} onClick={() => toggleExpand(category.id)}>
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className={styles.expandPlaceholder} />
            )}
            {/* Иконка или изображение категории */}
            {category.image ? (
              <img src={category.image} alt="" className={styles.categoryImage} />
            ) : category.icon ? (
              <span className={styles.categoryIcon}>{category.icon}</span>
            ) : null}
            <span className={styles.categoryName}>{category.name}</span>
            <span className={styles.categorySlug}>{category.slug}</span>
            {!category.isActive && <span className={styles.inactiveBadge}>Скрыта</span>}
            {category._count && (
              <span className={styles.productCount}>
                {category._count.totalProducts ?? category._count.products} товаров
                {category._count.totalProducts !== undefined &&
                  category._count.totalProducts !== category._count.products && (
                    <span className={styles.ownProductCount}>
                      (своих: {category._count.products})
                    </span>
                  )}
              </span>
            )}
          </div>
          <div className={styles.categoryActions}>
            <button
              className={styles.attributesButton}
              onClick={() => handleManageAttributes(category.id)}
              title="Управление атрибутами"
            >
              ⚙️ Атрибуты
            </button>
            <button
              className={styles.editButton}
              onClick={() => router.push(`/admin/catalog/categories/${category.id}/edit`)}
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => openDeleteModal(category)}
              title="Удалить категорию"
            >
              🗑️
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className={styles.children}>
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Категории</h1>
        <button className={styles.addButton} onClick={() => setShowCreateModal(true)}>
          + Добавить категорию
        </button>
      </div>

      <div className={styles.categoriesTree}>
        {categories.length > 0 ? (
          categories.map((category) => renderCategory(category))
        ) : (
          <div className={styles.empty}>
            <p>Категории не найдены</p>
          </div>
        )}
      </div>

      {/* Модальное окно подтверждения удаления */}
      {deleteModal.isOpen && deleteModal.category && (
        <div className={styles.modalOverlay} onClick={closeDeleteModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>⚠️ Удаление категории</h2>
              <button className={styles.modalClose} onClick={closeDeleteModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.warningBox}>
                <p className={styles.warningText}>
                  <strong>Внимание!</strong> Вы собираетесь удалить категорию:
                </p>
                <p className={styles.categoryToDelete}>&quot;{deleteModal.category.name}&quot;</p>

                {deleteModal.category.children && deleteModal.category.children.length > 0 && (
                  <p className={styles.warningSubtext}>
                    ⚠️ Эта категория содержит {deleteModal.category.children.length} подкатегорий,
                    которые также будут удалены!
                  </p>
                )}

                {deleteModal.category._count && deleteModal.category._count.products > 0 && (
                  <p className={styles.warningSubtext}>
                    ⚠️ В этой категории {deleteModal.category._count.products} товаров. Товары
                    станут без категории!
                  </p>
                )}

                <p className={styles.dangerText}>🚫 Это действие невозможно отменить!</p>
              </div>

              {deleteError && <div className={styles.errorMessage}>{deleteError}</div>}
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.dangerButton}
                onClick={handleDeleteCategory}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить безвозвратно'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания категории */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Создать категорию</h2>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {createMessage && (
                <div className={`${styles.messageBox} ${styles[createMessage.type]}`}>
                  {createMessage.text}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Название *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCategory((prev) => ({
                      ...prev,
                      name,
                      slug: generateSlug(name),
                    }));
                  }}
                  placeholder="Например: Входные двери Гардиан"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Slug (URL) *</label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                  }
                  placeholder="entrance-doors-guardian"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Родительская категория</label>
                <select
                  value={newCategory.parentId}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, parentId: e.target.value }))
                  }
                  className={styles.select}
                >
                  <option value="">Без родителя (корневая)</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Описание</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Краткое описание категории"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              {/* Иконка / Изображение */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Иконка или изображение</label>
                <div className={styles.iconImageSection}>
                  {/* Icon picker */}
                  <div className={styles.iconPickerWrapper}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => setShowIconPicker(!showIconPicker)}
                    >
                      {newCategory.icon || '📁'} Выбрать иконку
                    </button>
                    {showIconPicker && (
                      <div className={styles.iconPicker}>
                        <div className={styles.iconGrid}>
                          {CATEGORY_ICONS.map((icon, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`${styles.iconOption} ${newCategory.icon === icon ? styles.iconSelected : ''}`}
                              onClick={() => {
                                setNewCategory((prev) => ({ ...prev, icon }));
                                setShowIconPicker(false);
                              }}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                        {newCategory.icon && (
                          <button
                            type="button"
                            className={styles.clearIconButton}
                            onClick={() => {
                              setNewCategory((prev) => ({ ...prev, icon: '' }));
                              setShowIconPicker(false);
                            }}
                          >
                            Очистить иконку
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <span className={styles.orDivider}>или</span>

                  {/* Image upload */}
                  <div className={styles.imageUploadWrapper}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      className={styles.fileInput}
                      id="category-image"
                    />
                    <label htmlFor="category-image" className={styles.uploadButton}>
                      📷 Загрузить картинку
                    </label>
                  </div>
                </div>

                {/* Preview */}
                {(newCategory.icon || imagePreview) && (
                  <div className={styles.previewSection}>
                    <span className={styles.previewLabel}>Предпросмотр:</span>
                    <div className={styles.preview}>
                      {imagePreview ? (
                        <div className={styles.imagePreviewWrapper}>
                          <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                          <button
                            type="button"
                            className={styles.removeImageButton}
                            onClick={clearImage}
                          >
                            ✕
                          </button>
                        </div>
                      ) : newCategory.icon ? (
                        <span className={styles.iconPreview}>{newCategory.icon}</span>
                      ) : null}
                      <span className={styles.previewName}>
                        {newCategory.name || 'Название категории'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Отмена
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleCreateCategory}
                disabled={creating || !newCategory.name || !newCategory.slug}
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
