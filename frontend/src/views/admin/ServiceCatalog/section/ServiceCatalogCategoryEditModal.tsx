'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import { SERVICE_ICON_OPTIONS } from '../shared/SERVICE_ICON_OPTIONS';
import styles from './ServiceCatalogCategoryModal.module.css';
import { API_URL, INITIAL_EDIT_SERVICE_CATEGORY } from './service-catalog-section-page.constants';
import type {
  EditServiceCategoryForm,
  FlatCategoryOption,
  ServiceCatalogCategory,
} from './service-catalog-section-page.types';
import {
  collectDescendantIds,
  findCategoryById,
  slugify,
} from './service-catalog-section-page.utils';
import { useServiceCategoryModalSaveNotice } from './useServiceCategoryModalSaveNotice';

type ServiceCatalogCategoryEditModalProps = {
  open: boolean;
  categoryId: string | null;
  categories: ServiceCatalogCategory[];
  flatCategories: FlatCategoryOption[];
  onClose: () => void;
  onSaved: (category: ServiceCatalogCategory) => void;
};

function formFromCategory(data: ServiceCatalogCategory): EditServiceCategoryForm {
  return {
    name: data.name || '',
    slug: data.slug || '',
    description: data.description || '',
    parentId: data.parentId || '',
    icon: data.icon || '',
    image: data.image || '',
    cardBackgroundImage: data.cardBackgroundImage || '',
    cardBackgroundTransparent: Boolean(data.cardBackgroundTransparent),
    showPricesInPublic: data.showPricesInPublic ?? true,
    priceMarkupPercent: Number(data.priceMarkupPercent ?? 0),
    isActive: data.isActive ?? true,
  };
}

function normalizeEditForm(form: EditServiceCategoryForm): EditServiceCategoryForm {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim(),
    parentId: form.parentId.trim(),
    icon: form.icon.trim(),
    image: form.image.trim(),
    cardBackgroundImage: form.cardBackgroundImage.trim(),
    cardBackgroundTransparent: form.cardBackgroundTransparent,
    showPricesInPublic: form.showPricesInPublic,
    priceMarkupPercent: Number(form.priceMarkupPercent) || 0,
    isActive: form.isActive,
  };
}

function editFormsEqual(a: EditServiceCategoryForm, b: EditServiceCategoryForm): boolean {
  const left = normalizeEditForm(a);
  const right = normalizeEditForm(b);
  return (
    left.name === right.name &&
    left.slug === right.slug &&
    left.description === right.description &&
    left.parentId === right.parentId &&
    left.icon === right.icon &&
    left.image === right.image &&
    left.cardBackgroundImage === right.cardBackgroundImage &&
    left.cardBackgroundTransparent === right.cardBackgroundTransparent &&
    left.showPricesInPublic === right.showPricesInPublic &&
    left.priceMarkupPercent === right.priceMarkupPercent &&
    left.isActive === right.isActive
  );
}

export function ServiceCatalogCategoryEditModal({
  open,
  categoryId,
  categories,
  flatCategories,
  onClose,
  onSaved,
}: ServiceCatalogCategoryEditModalProps) {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<EditServiceCategoryForm>({ ...INITIAL_EDIT_SERVICE_CATEGORY });
  const [savedSnapshot, setSavedSnapshot] = useState<EditServiceCategoryForm>({
    ...INITIAL_EDIT_SERVICE_CATEGORY,
  });
  const [originalSlug, setOriginalSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardBgFileInputRef = useRef<HTMLInputElement>(null);
  const { saveSuccessVisible, showSaveSuccess, clearSaveSuccess } =
    useServiceCategoryModalSaveNotice();

  const applyCategoryToForm = useCallback((data: ServiceCatalogCategory) => {
    const nextForm = formFromCategory(data);
    setCategoryName(data.name);
    setOriginalSlug(data.slug || '');
    setForm(nextForm);
    setSavedSnapshot(nextForm);
  }, []);

  const hasChanges = !editFormsEqual(form, savedSnapshot);

  useEffect(() => {
    if (hasChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasChanges, saveSuccessVisible]);

  const parentOptions = useMemo(() => {
    if (!categoryId) return flatCategories;
    const node = findCategoryById(categories, categoryId);
    const excluded = node
      ? (() => {
          const s = collectDescendantIds(node);
          s.add(node.id);
          return s;
        })()
      : new Set([categoryId]);
    return flatCategories.filter((opt) => !excluded.has(opt.id));
  }, [categories, categoryId, flatCategories]);

  const loadCategory = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setLoadError(null);
    setError(null);

    try {
      const response = await apiFetch(`${API_URL}/admin/service-catalog/categories/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setLoadError(response.status === 404 ? 'Категория не найдена' : 'Ошибка загрузки');
        return;
      }

      const data: ServiceCatalogCategory = await response.json();
      applyCategoryToForm(data);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cardBgFileInputRef.current) cardBgFileInputRef.current.value = '';
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
      setForm((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCardBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, cardBackgroundImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const clearCardBg = () => {
    setForm((prev) => ({ ...prev, cardBackgroundImage: '' }));
    if (cardBgFileInputRef.current) cardBgFileInputRef.current.value = '';
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

    const nextSnapshot = normalizeEditForm(form);

    try {
      const updateData: Record<string, unknown> = {
        name: nextSnapshot.name,
        slug: nextSnapshot.slug,
        description: nextSnapshot.description ? nextSnapshot.description : null,
        parentId: nextSnapshot.parentId ? nextSnapshot.parentId : null,
        icon: nextSnapshot.icon ? nextSnapshot.icon : null,
        image: nextSnapshot.image ? nextSnapshot.image : null,
        cardBackgroundImage: nextSnapshot.cardBackgroundImage
          ? nextSnapshot.cardBackgroundImage
          : null,
        cardBackgroundTransparent: nextSnapshot.cardBackgroundTransparent,
        showPricesInPublic: nextSnapshot.showPricesInPublic,
        priceMarkupPercent: nextSnapshot.priceMarkupPercent,
        isActive: nextSnapshot.isActive,
      };

      const response = await apiFetch(`${API_URL}/admin/service-catalog/categories/${categoryId}`, {
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

      const saved: ServiceCatalogCategory = await response.json();
      setForm(nextSnapshot);
      setSavedSnapshot(nextSnapshot);
      setCategoryName(saved.name || nextSnapshot.name);
      setOriginalSlug(saved.slug || nextSnapshot.slug);
      showSaveSuccess();
      onSaved(saved);
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  const IconPreview =
    form.icon && serviceCatalogIconMap[form.icon] ? serviceCatalogIconMap[form.icon] : null;

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
            Изменения названия, slug и родителя отразятся в каталоге ремонта квартир и на публичных
            страницах.
          </p>

          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="service-cat-edit-name">Название *</label>
              <input
                id="service-cat-edit-name"
                type="text"
                value={form.name}
                disabled={saving}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: prev.slug === originalSlug ? slugify(name) : prev.slug,
                  }));
                }}
                placeholder="Название категории"
              />
            </div>

            <div data-modal-form-group>
              <label htmlFor="service-cat-edit-slug">Slug (URL) *</label>
              <input
                id="service-cat-edit-slug"
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
              <label htmlFor="service-cat-edit-parent">Родительская категория</label>
              <select
                id="service-cat-edit-parent"
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
              <label htmlFor="service-cat-edit-markup">Наценка на группу, %</label>
              <input
                id="service-cat-edit-markup"
                type="number"
                step="0.01"
                value={form.priceMarkupPercent}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priceMarkupPercent: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <span className={styles.fieldHint}>
                К базовой цене видов работ; может быть отрицательной
              </span>
            </div>

            <div data-modal-form-group data-modal-span>
              <label htmlFor="service-cat-edit-description">Описание</label>
              <textarea
                id="service-cat-edit-description"
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
                    {IconPreview ? (
                      <IconPreview className={styles.iconButtonSvg} />
                    ) : (
                      <span className={styles.iconButtonPlaceholder}>📁</span>
                    )}
                    Выбрать иконку
                  </button>
                  {showIconPicker ? (
                    <div className={styles.iconPicker}>
                      <div className={styles.iconGrid}>
                        {SERVICE_ICON_OPTIONS.map((opt) => {
                          const IconC = serviceCatalogIconMap[opt.value];
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`${styles.iconOption} ${form.icon === opt.value ? styles.iconSelected : ''}`}
                              title={opt.label}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, icon: opt.value }));
                                setShowIconPicker(false);
                              }}
                            >
                              {IconC ? <IconC className={styles.iconOptionSvg} /> : null}
                            </button>
                          );
                        })}
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

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className={styles.fileInput}
                    id="service-cat-edit-image"
                    disabled={saving}
                  />
                  <label htmlFor="service-cat-edit-image" className={styles.uploadButton}>
                    Загрузить картинку
                  </label>
                </div>
              </div>

              {form.icon || form.image ? (
                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>Предпросмотр:</span>
                  <div className={styles.preview}>
                    {form.image ? (
                      <div className={styles.imagePreviewWrapper}>
                        <img src={form.image} alt="" className={styles.imagePreview} />
                        <button
                          type="button"
                          className={styles.removeImageButton}
                          onClick={clearImage}
                          disabled={saving}
                        >
                          ✕
                        </button>
                      </div>
                    ) : IconPreview ? (
                      <span className={styles.iconPreview}>
                        <IconPreview className={styles.iconPreviewSvg} />
                      </span>
                    ) : null}
                    <span className={styles.previewName}>{form.name || 'Название категории'}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div data-modal-form-group data-modal-span>
              <label>Фон карточки на странице «Ремонт квартир»</label>
              <span className={styles.fieldHint}>
                Необязательно. Широкая фотография для фона плитки категории в общем списке.
              </span>
              <div className={styles.cardBgRow}>
                <input
                  type="file"
                  ref={cardBgFileInputRef}
                  accept="image/*"
                  onChange={handleCardBgSelect}
                  className={styles.fileInput}
                  id="service-cat-edit-card-bg"
                  disabled={saving}
                />
                <label htmlFor="service-cat-edit-card-bg" className={styles.uploadButton}>
                  Загрузить фон
                </label>
                {form.cardBackgroundImage ? (
                  <button type="button" className={styles.clearCardBgButton} onClick={clearCardBg}>
                    Сбросить фон
                  </button>
                ) : null}
              </div>
              {form.cardBackgroundImage ? (
                <img src={form.cardBackgroundImage} alt="" className={styles.cardBgPreviewImg} />
              ) : null}
            </div>

            <div data-modal-form-group data-modal-span>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.cardBackgroundTransparent}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cardBackgroundTransparent: e.target.checked,
                    }))
                  }
                />
                <span>Прозрачный фон карточки на «Ремонт квартир»</span>
              </label>
            </div>

            <div data-modal-form-group data-modal-span>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.showPricesInPublic}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, showPricesInPublic: e.target.checked }))
                  }
                />
                <span>Показывать цены на сайте</span>
              </label>
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
