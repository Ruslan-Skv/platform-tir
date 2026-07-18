'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import { API_URL, CATEGORY_ICONS } from '../shared/categories-page.constants';
import type { Category, FlatCategoryOption } from '../shared/categories-page.types';
import { generateSlug } from '../shared/categories-page.utils';
import styles from './CategoryCreateModal.module.css';
import { useCategoryModalSaveNotice } from './useCategoryModalSaveNotice';

type CategoryCreateModalProps = {
  open: boolean;
  flatCategories: FlatCategoryOption[];
  onClose: () => void;
  onCreated: (category: Category) => void;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: string;
  image: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  icon: '',
  image: '',
};

export function CategoryCreateModal({
  open,
  flatCategories,
  onClose,
  onCreated,
}: CategoryCreateModalProps) {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saveSuccessText, setSaveSuccessText] = useState('Сохранено');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveSuccessVisible, showSaveSuccess, clearSaveSuccess } = useCategoryModalSaveNotice();

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setAutoSlug(true);
    setError(null);
    setShowIconPicker(false);
    setImagePreview(null);
    setSaveSuccessText('Сохранено');
    clearSaveSuccess();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name || !slug) {
      setError('Заполните название и slug');
      return;
    }

    setSaving(true);
    setError(null);
    clearSaveSuccess();

    try {
      const categoryData: {
        name: string;
        slug: string;
        description?: string;
        parentId?: string;
        icon?: string;
        image?: string;
      } = { name, slug };

      if (form.description.trim()) {
        categoryData.description = form.description.trim();
      }
      if (form.parentId.trim()) {
        categoryData.parentId = form.parentId;
      }
      if (form.icon.trim()) {
        categoryData.icon = form.icon.trim();
      }
      if (form.image.trim()) {
        categoryData.image = form.image.trim();
      }

      const response = await apiFetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data.message === 'string' ? data.message : 'Ошибка создания категории');
        return;
      }

      const created: Category = await response.json();
      setForm(EMPTY_FORM);
      setAutoSlug(true);
      setShowIconPicker(false);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSaveSuccessText(`Категория «${created.name}» создана`);
      showSaveSuccess();
      onCreated(created);
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
      title="Новая категория"
      titleAside={<AdminSaveNotice visible={saveSuccessVisible}>{saveSuccessText}</AdminSaveNotice>}
      size="lg"
      className={`${crmFormStyles.modalPanel} ${styles.modalPanel}`}
      showCloseButton
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Категория задаёт раздел каталога товаров. Можно создать корневую категорию или вложить её
          в существующую родительскую. Атрибуты и фильтры настраиваются отдельно после создания.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="category-create-name">Название *</label>
            <input
              id="category-create-name"
              type="text"
              value={form.name}
              disabled={saving}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: autoSlug ? generateSlug(name) : prev.slug,
                }));
              }}
              placeholder="Например: Входные двери Гардиан"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="category-create-slug">Slug (URL) *</label>
            <input
              id="category-create-slug"
              type="text"
              value={form.slug}
              disabled={saving}
              onChange={(e) => {
                setAutoSlug(false);
                setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
              }}
              placeholder="entrance-doors-guardian"
            />
            {autoSlug ? (
              <span className={styles.slugHint}>Формируется автоматически из названия</span>
            ) : null}
          </div>

          <div data-modal-form-group>
            <label htmlFor="category-create-parent">Родительская категория</label>
            <select
              id="category-create-parent"
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

          <div data-modal-form-group data-modal-span>
            <label htmlFor="category-create-description">Описание</label>
            <textarea
              id="category-create-description"
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
                  id="category-create-image"
                  disabled={saving}
                />
                <label htmlFor="category-create-image" className={styles.uploadButton}>
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
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        {saveSuccessVisible ? (
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>{saveSuccessText}</span>
          </div>
        ) : null}

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
