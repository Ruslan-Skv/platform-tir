'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';

import { SERVICE_ICON_OPTIONS } from '../shared/SERVICE_ICON_OPTIONS';
import styles from './ServiceCatalogCategoryModal.module.css';
import { API_URL, INITIAL_NEW_SERVICE_CATEGORY } from './service-catalog-section-page.constants';
import type {
  FlatCategoryOption,
  NewServiceCategoryForm,
  ServiceCatalogCategory,
} from './service-catalog-section-page.types';
import { slugify } from './service-catalog-section-page.utils';
import { useServiceCategoryModalSaveNotice } from './useServiceCategoryModalSaveNotice';

type ServiceCatalogCategoryCreateModalProps = {
  open: boolean;
  flatCategories: FlatCategoryOption[];
  onClose: () => void;
  onCreated: (category: ServiceCatalogCategory) => void;
};

export function ServiceCatalogCategoryCreateModal({
  open,
  flatCategories,
  onClose,
  onCreated,
}: ServiceCatalogCategoryCreateModalProps) {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState<NewServiceCategoryForm>({ ...INITIAL_NEW_SERVICE_CATEGORY });
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardBgFileInputRef = useRef<HTMLInputElement>(null);
  const { saveSuccessVisible, showSaveSuccess, clearSaveSuccess } =
    useServiceCategoryModalSaveNotice();

  useEffect(() => {
    if (!open) return;
    setForm({ ...INITIAL_NEW_SERVICE_CATEGORY });
    setAutoSlug(true);
    setError(null);
    setShowIconPicker(false);
    clearSaveSuccess();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cardBgFileInputRef.current) cardBgFileInputRef.current.value = '';
  }, [open, clearSaveSuccess]);

  const handleClose = () => {
    if (saving) return;
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

  const resetFormForNextCreate = () => {
    setForm({ ...INITIAL_NEW_SERVICE_CATEGORY });
    setAutoSlug(true);
    setShowIconPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cardBgFileInputRef.current) cardBgFileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name || !slug) {
      setError('Заполните название и slug');
      return;
    }

    setSaving(true);
    setError(null);
    clearSaveSuccess();

    const body: Record<string, unknown> = {
      name,
      slug,
      showPricesInPublic: form.showPricesInPublic,
      cardBackgroundTransparent: form.cardBackgroundTransparent,
      priceMarkupPercent: Number(form.priceMarkupPercent) || 0,
      isActive: form.isActive,
    };

    if (form.description.trim()) body.description = form.description.trim();
    if (form.parentId.trim()) body.parentId = form.parentId.trim();
    if (form.icon.trim()) body.icon = form.icon.trim();
    if (form.image.trim()) body.image = form.image.trim();
    if (form.cardBackgroundImage.trim()) {
      body.cardBackgroundImage = form.cardBackgroundImage.trim();
    }

    try {
      const response = await apiFetch(`${API_URL}/admin/service-catalog/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data.message === 'string' ? data.message : 'Ошибка создания категории');
        return;
      }

      const created: ServiceCatalogCategory = await response.json();
      showSaveSuccess();
      onCreated(created);
      requestAnimationFrame(() => {
        resetFormForNextCreate();
      });
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
      title="Новая категория"
      titleAside={<AdminSaveNotice visible={saveSuccessVisible}>Создано</AdminSaveNotice>}
      size="lg"
      showCloseButton
    >
      <form data-modal-form data-modal-density="compact" onSubmit={(e) => void handleSubmit(e)}>
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Категория задаёт раздел каталога ремонта квартир. Можно создать корневую категорию или
          вложить её в существующую родительскую.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="service-cat-create-name">Название *</label>
            <input
              id="service-cat-create-name"
              type="text"
              value={form.name}
              disabled={saving}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: autoSlug ? slugify(name) : prev.slug,
                }));
              }}
              placeholder="Например: Малярные работы"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="service-cat-create-slug">Slug (URL) *</label>
            <input
              id="service-cat-create-slug"
              type="text"
              value={form.slug}
              disabled={saving}
              onChange={(e) => {
                setAutoSlug(false);
                setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
              }}
              placeholder="malyarnye-raboty"
            />
            {autoSlug ? (
              <span className={styles.slugHint}>Формируется автоматически из названия</span>
            ) : null}
          </div>

          <div data-modal-form-group>
            <label htmlFor="service-cat-create-parent">Родительская категория</label>
            <select
              id="service-cat-create-parent"
              value={form.parentId}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
            >
              <option value="">Без родителя (корневая)</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="service-cat-create-markup">Наценка на группу, %</label>
            <input
              id="service-cat-create-markup"
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
            <label htmlFor="service-cat-create-description">Описание</label>
            <textarea
              id="service-cat-create-description"
              value={form.description}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Краткое описание категории"
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
                  id="service-cat-create-image"
                  disabled={saving}
                />
                <label htmlFor="service-cat-create-image" className={styles.uploadButton}>
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
                id="service-cat-create-card-bg"
                disabled={saving}
              />
              <label htmlFor="service-cat-create-card-bg" className={styles.uploadButton}>
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
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={saving}>
            {saveSuccessVisible ? 'Закрыть' : 'Отмена'}
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={saving || !form.name.trim() || !form.slug.trim()}
          >
            {saving ? 'Создание…' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
