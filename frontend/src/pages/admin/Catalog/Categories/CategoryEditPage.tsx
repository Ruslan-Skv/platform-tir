'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './CategoryEditPage.module.css';

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
}

interface CategoryEditPageProps {
  categoryId: string;
}

export function CategoryEditPage({ categoryId }: CategoryEditPageProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    icon: '',
    image: '',
    isActive: true,
    order: 0,
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch category data
  const fetchCategory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Категория не найдена');
        } else {
          setError('Ошибка загрузки категории');
        }
        return;
      }

      const data = await response.json();
      setCategory(data);
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        parentId: data.parentId || '',
        icon: data.icon || '',
        image: data.image || '',
        isActive: data.isActive ?? true,
        order: data.order || 0,
      });

      if (data.image) {
        setImagePreview(data.image);
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [categoryId, getAuthHeaders]);

  // Fetch all categories for parent selector
  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/categories/flat`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current category and its children to prevent circular reference
        setAllCategories(data.filter((cat: Category) => cat.id !== categoryId));
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategory();
    fetchAllCategories();
  }, [fetchCategory, fetchAllCategories]);

  // Flatten categories for select dropdown
  const flatCategories = useMemo(() => {
    // Since we're using /categories/flat, they're already flat
    return allCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
    }));
  }, [allCategories]);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear image
  const clearImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      setMessage({ type: 'error', text: 'Заполните название и slug' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        slug: formData.slug,
        isActive: formData.isActive,
        order: formData.order,
      };

      if (formData.description && formData.description.trim()) {
        updateData.description = formData.description.trim();
      } else {
        updateData.description = null;
      }

      if (formData.parentId && formData.parentId.trim()) {
        updateData.parentId = formData.parentId;
      } else {
        updateData.parentId = null;
      }

      if (formData.icon && formData.icon.trim()) {
        updateData.icon = formData.icon.trim();
      } else {
        updateData.icon = null;
      }

      if (formData.image && formData.image.trim()) {
        updateData.image = formData.image.trim();
      } else {
        updateData.image = null;
      }

      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Категория сохранена' });
        setTimeout(() => {
          router.push('/admin/catalog/categories');
        }, 1000);
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.message || 'Ошибка сохранения' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка категории...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p>{error}</p>
          <button
            className={styles.backButton}
            onClick={() => router.push('/admin/catalog/categories')}
          >
            ← Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/admin/catalog/categories')}
        >
          ← Назад
        </button>
        <h1 className={styles.title}>Редактирование категории</h1>
      </div>

      <div className={styles.card}>
        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>
        )}

        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Название *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name,
                    slug: category?.slug === prev.slug ? generateSlug(name) : prev.slug,
                  }));
                }}
                placeholder="Название категории"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Slug (URL) *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                }
                placeholder="category-slug"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Родительская категория</label>
              <select
                value={formData.parentId}
                onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
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
              <label className={styles.label}>Порядок сортировки</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))
                }
                min="0"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Описание категории"
              className={styles.textarea}
              rows={4}
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
                  {formData.icon || '📁'} Выбрать иконку
                </button>
                {showIconPicker && (
                  <div className={styles.iconPicker}>
                    <div className={styles.iconGrid}>
                      {CATEGORY_ICONS.map((icon, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`${styles.iconOption} ${formData.icon === icon ? styles.iconSelected : ''}`}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, icon }));
                            setShowIconPicker(false);
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    {formData.icon && (
                      <button
                        type="button"
                        className={styles.clearIconButton}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, icon: '' }));
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
                  id="category-image-edit"
                />
                <label htmlFor="category-image-edit" className={styles.uploadButton}>
                  📷 Загрузить картинку
                </label>
              </div>
            </div>

            {/* Preview */}
            {(formData.icon || imagePreview) && (
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
                  ) : formData.icon ? (
                    <span className={styles.iconPreview}>{formData.icon}</span>
                  ) : null}
                  <span className={styles.previewName}>
                    {formData.name || 'Название категории'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className={styles.checkbox}
              />
              <span>Категория активна (отображается на сайте)</span>
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={() => router.push('/admin/catalog/categories')}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.slug}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
