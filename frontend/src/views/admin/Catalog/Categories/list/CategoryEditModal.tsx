'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import { INITIAL_CATEGORY_EDIT_FORM } from '../edit/category-edit-page.constants';
import type { CategoryEditFormData } from '../edit/category-edit-page.types';
import { API_URL, CATEGORY_ICONS } from '../shared/categories-page.constants';
import type { Category, FlatCategoryOption } from '../shared/categories-page.types';
import { generateSlug } from '../shared/categories-page.utils';
import styles from './CategoryCreateModal.module.css';
import { useCategoryModalSaveNotice } from './useCategoryModalSaveNotice';

type CategoryEditModalProps = {
  open: boolean;
  categoryId: string | null;
  onClose: () => void;
  onSaved: (category: Category) => void;
};

function formFromCategory(data: Category): CategoryEditFormData {
  return {
    name: data.name || '',
    slug: data.slug || '',
    description: data.description || '',
    parentId: data.parentId || '',
    icon: data.icon || '',
    image: data.image || '',
    isActive: data.isActive ?? true,
    sizesRequired: data.sizesRequired ?? true,
    showChildCategoryFilters: data.showChildCategoryFilters ?? true,
    order: data.order || 0,
  };
}

function normalizeEditForm(form: CategoryEditFormData): CategoryEditFormData {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim(),
    parentId: form.parentId.trim(),
    icon: form.icon.trim(),
    image: form.image.trim(),
    isActive: form.isActive,
    sizesRequired: form.sizesRequired,
    showChildCategoryFilters: form.showChildCategoryFilters,
    order: form.order,
  };
}

function editFormsEqual(a: CategoryEditFormData, b: CategoryEditFormData): boolean {
  const left = normalizeEditForm(a);
  const right = normalizeEditForm(b);
  return (
    left.name === right.name &&
    left.slug === right.slug &&
    left.description === right.description &&
    left.parentId === right.parentId &&
    left.icon === right.icon &&
    left.image === right.image &&
    left.isActive === right.isActive &&
    left.sizesRequired === right.sizesRequired &&
    left.showChildCategoryFilters === right.showChildCategoryFilters &&
    left.order === right.order
  );
}

export function CategoryEditModal({ open, categoryId, onClose, onSaved }: CategoryEditModalProps) {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryEditFormData>({ ...INITIAL_CATEGORY_EDIT_FORM });
  const [savedSnapshot, setSavedSnapshot] = useState<CategoryEditFormData>({
    ...INITIAL_CATEGORY_EDIT_FORM,
  });
  const [originalSlug, setOriginalSlug] = useState('');
  const [parentOptions, setParentOptions] = useState<FlatCategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveSuccessVisible, showSaveSuccess, clearSaveSuccess } = useCategoryModalSaveNotice();

  const applyCategoryToForm = useCallback((data: Category) => {
    const nextForm = formFromCategory(data);
    setCategoryName(data.name);
    setOriginalSlug(data.slug || '');
    setForm(nextForm);
    setSavedSnapshot(nextForm);
    setImagePreview(data.image || null);
  }, []);

  const hasChanges = !editFormsEqual(form, savedSnapshot);

  useEffect(() => {
    if (hasChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasChanges, saveSuccessVisible]);

  const loadCategory = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setLoadError(null);
    setError(null);

    try {
      const [categoryRes, flatRes] = await Promise.all([
        apiFetch(`${API_URL}/categories/${categoryId}`, { headers: getAuthHeaders() }),
        apiFetch(`${API_URL}/categories/flat`, { headers: getAuthHeaders() }),
      ]);

      if (!categoryRes.ok) {
        setLoadError(categoryRes.status === 404 ? 'Категория не найдена' : 'Ошибка загрузки');
        return;
      }

      const data: Category = await categoryRes.json();
      applyCategoryToForm(data);

      if (flatRes.ok) {
        const flat: Category[] = await flatRes.json();
        setParentOptions(
          flat.filter((cat) => cat.id !== categoryId).map((cat) => ({ id: cat.id, name: cat.name }))
        );
      } else {
        setParentOptions([]);
      }
    } catch {
      setLoadError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [categoryId, getAuthHeaders, applyCategoryToForm]);

  useEffect(() => {
    if (!open || !categoryId) return;
    setShowIconPicker(false);
    clearSaveSuccess();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    void loadCategory();
  }, [open, categoryId, loadCategory, clearSaveSuccess]);

  const title = useMemo(() => {
    const name = form.name.trim() || categoryName;
    return name ? `Редактировать · ${name}` : 'Редактировать категорию';
  }, [form.name, categoryName]);

  const handleClose = () => {
    if (saving || loading) return;
    clearSaveSuccess();
    setError(null);
    onClose();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setForm((prev) => ({ ...prev, image: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setForm((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || saving || !hasChanges) return;

    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name || !slug) {
      setError('Заполните название и slug');
      return;
    }

    setSaving(true);
    setError(null);
    clearSaveSuccess();

    const nextSnapshot: CategoryEditFormData = {
      name,
      slug,
      description: form.description.trim(),
      parentId: form.parentId.trim(),
      icon: form.icon.trim(),
      image: form.image.trim(),
      isActive: form.isActive,
      sizesRequired: form.sizesRequired,
      showChildCategoryFilters: form.showChildCategoryFilters,
      order: form.order,
    };

    try {
      const updateData: Record<string, unknown> = {
        name: nextSnapshot.name,
        slug: nextSnapshot.slug,
        isActive: nextSnapshot.isActive,
        sizesRequired: nextSnapshot.sizesRequired,
        showChildCategoryFilters: nextSnapshot.showChildCategoryFilters,
        order: nextSnapshot.order,
        description: nextSnapshot.description ? nextSnapshot.description : null,
        parentId: nextSnapshot.parentId ? nextSnapshot.parentId : null,
        icon: nextSnapshot.icon ? nextSnapshot.icon : null,
        image: nextSnapshot.image ? nextSnapshot.image : null,
      };

      const response = await apiFetch(`${API_URL}/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data.message === 'string' ? data.message : 'Ошибка сохранения');
        return;
      }

      const saved: Category = await response.json();
      // Снимок из отправленных данных — без рассинхрона null/'' с ответом API (иначе hasChanges снова true и notice сразу сбрасывается).
      setForm(nextSnapshot);
      setSavedSnapshot(nextSnapshot);
      setCategoryName(saved.name || nextSnapshot.name);
      setOriginalSlug(saved.slug || nextSnapshot.slug);
      setImagePreview(nextSnapshot.image || null);
      showSaveSuccess();
      onSaved(saved);
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      titleAside={<AdminSaveNotice visible={saveSuccessVisible}>Сохранено</AdminSaveNotice>}
      size="lg"
      className={`${crmFormStyles.modalPanel} ${styles.modalPanel}`}
      showCloseButton
    >
      {loading ? (
        <p data-modal-form-hint>Загрузка категории…</p>
      ) : loadError ? (
        <>
          <p data-modal-form-error>{loadError}</p>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={handleClose}>
              Закрыть
            </button>
          </div>
        </>
      ) : (
        <form
          className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
          data-modal-form
          data-modal-density="compact"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Изменения названия, slug и родителя отразятся в каталоге. Атрибуты настраиваются
            отдельно через кнопку «Атрибуты» в списке категорий.
          </p>

          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="category-edit-name">Название *</label>
              <input
                id="category-edit-name"
                type="text"
                value={form.name}
                disabled={saving}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: prev.slug === originalSlug ? generateSlug(name) : prev.slug,
                  }));
                }}
                placeholder="Название категории"
              />
            </div>

            <div data-modal-form-group>
              <label htmlFor="category-edit-slug">Slug (URL) *</label>
              <input
                id="category-edit-slug"
                type="text"
                value={form.slug}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                }
                placeholder="category-slug"
              />
            </div>

            <div data-modal-form-group>
              <label htmlFor="category-edit-parent">Родительская категория</label>
              <select
                id="category-edit-parent"
                value={form.parentId}
                disabled={saving}
                onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
              >
                <option value="">Без родителя (корневая)</option>
                {parentOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div data-modal-form-group>
              <label htmlFor="category-edit-order">Порядок сортировки</label>
              <input
                id="category-edit-order"
                type="number"
                value={form.order}
                disabled={saving}
                min={0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>

            <div data-modal-form-group data-modal-span>
              <label htmlFor="category-edit-description">Описание</label>
              <textarea
                id="category-edit-description"
                value={form.description}
                disabled={saving}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Описание категории"
                rows={3}
              />
            </div>

            <div data-modal-form-group data-modal-span>
              <label>Иконка или изображение</label>
              <div className={styles.iconImageSection}>
                <div className={styles.iconPickerWrapper}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={saving}
                    onClick={() => setShowIconPicker((prev) => !prev)}
                  >
                    {form.icon || '📁'} Выбрать иконку
                  </button>
                  {showIconPicker ? (
                    <div className={styles.iconPicker}>
                      <div className={styles.iconGrid}>
                        {CATEGORY_ICONS.map((icon, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`${styles.iconOption} ${form.icon === icon ? styles.iconSelected : ''}`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, icon }));
                              setShowIconPicker(false);
                            }}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      {form.icon ? (
                        <button
                          type="button"
                          className={styles.clearIconButton}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, icon: '' }));
                            setShowIconPicker(false);
                          }}
                        >
                          Очистить иконку
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <span className={styles.orDivider}>или</span>

                <div className={styles.imageUploadWrapper}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className={styles.fileInput}
                    id="category-edit-image"
                    disabled={saving}
                  />
                  <label htmlFor="category-edit-image" className={styles.uploadButton}>
                    Загрузить картинку
                  </label>
                </div>
              </div>

              {form.icon || imagePreview ? (
                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>Предпросмотр:</span>
                  <div className={styles.preview}>
                    {imagePreview ? (
                      <div className={styles.imagePreviewWrapper}>
                        <img src={imagePreview} alt="" className={styles.imagePreview} />
                        <button
                          type="button"
                          className={styles.removeImageButton}
                          onClick={clearImage}
                          disabled={saving}
                        >
                          ✕
                        </button>
                      </div>
                    ) : form.icon ? (
                      <span className={styles.iconPreview}>{form.icon}</span>
                    ) : null}
                    <span className={styles.previewName}>{form.name || 'Название категории'}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div data-modal-form-group data-modal-span>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  disabled={saving}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span>Категория активна (отображается на сайте)</span>
              </label>
            </div>

            <div data-modal-form-group data-modal-span>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.sizesRequired}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sizesRequired: e.target.checked }))
                  }
                />
                <span>Размеры обязательны для товаров этой категории</span>
              </label>
            </div>

            <div data-modal-form-group data-modal-span>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.showChildCategoryFilters}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      showChildCategoryFilters: e.target.checked,
                    }))
                  }
                />
                <span>Показывать дочерние категории в блоке фильтров на сайте</span>
              </label>
            </div>
          </div>

          {error ? <p data-modal-form-error>{error}</p> : null}

          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={handleClose}
              disabled={saving}
            >
              {hasChanges ? 'Отмена' : 'Закрыть'}
            </button>
            <button
              data-admin-mutation
              type="submit"
              data-modal-btn="primary"
              disabled={saving || !hasChanges || !form.name.trim() || !form.slug.trim()}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
