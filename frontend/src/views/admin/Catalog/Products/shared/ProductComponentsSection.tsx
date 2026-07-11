'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type AdminComponentCatalogGroup,
  type AdminComponentCatalogItem,
} from '@/shared/api/admin-component-catalog';
import {
  type ProductComponent,
  linkProductComponentGroupFromCatalog,
  linkProductComponentsBatchFromCatalog,
} from '@/shared/api/product-components';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getKitComponents } from '@/shared/lib/catalog/component-kit';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import { ComponentCatalogPickerModal } from './ComponentCatalogPickerModal';
import { ImageUrlModal } from './ImageUrlModal';
import styles from './ProductComponentsSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ProductComponentsSectionProps {
  productId: string;
  /** ID категории товара — для загрузки подсказок наименований из других товаров категории */
  categoryId?: string;
  /**
   * Если задано — подсказки грузятся по этой категории (например корень «Межкомнатные двери»),
   * а не по categoryId товара.
   */
  componentNamesHintCategoryId?: string;
  /** Вместе с componentNamesHintCategoryId: учитывать все дочерние категории */
  componentNamesIncludeSubtree?: boolean;
}

export const ProductComponentsSection: React.FC<ProductComponentsSectionProps> = ({
  productId,
  categoryId,
  componentNamesHintCategoryId,
  componentNamesIncludeSubtree = false,
}) => {
  const { getAuthHeaders } = useAuth();
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [linkingCatalog, setLinkingCatalog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductComponent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Состояние для inline редактирования
  const [editingData, setEditingData] = useState<
    Record<
      string,
      {
        name: string;
        type: string;
        price: string;
        image: string;
        stock: number;
        isActive: boolean;
        sortOrder: number;
      }
    >
  >({});

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    price: '',
    image: '',
    stock: 0,
    isActive: true,
    sortOrder: 0,
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);

  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  /** null — форма добавления; иначе id комплектующего для inline-редактирования */
  const [imageUrlModalInlineId, setImageUrlModalInlineId] = useState<string | null>(null);

  const fetchComponents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(
        `${API_URL}/product-components/admin/all?productId=${productId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a: ProductComponent, b: ProductComponent) => {
              const sortDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
              if (sortDiff !== 0) return sortDiff;
              const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              if (aTime !== bTime) return aTime - bTime;
              return a.id.localeCompare(b.id);
            })
          : [];
        setComponents(sorted);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, productId]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  useEffect(() => {
    const hintCategoryId = componentNamesHintCategoryId ?? categoryId;
    if (!hintCategoryId) {
      setSuggestedNames([]);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      categoryId: hintCategoryId,
    });
    if (componentNamesIncludeSubtree) {
      params.set('includeSubtree', '1');
    }
    apiFetch(`${API_URL}/product-components/admin/names-by-category?${params.toString()}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: string[]) => {
        if (!cancelled && Array.isArray(data)) setSuggestedNames(data);
      })
      .catch(() => {
        if (!cancelled) setSuggestedNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, componentNamesHintCategoryId, componentNamesIncludeSubtree, getAuthHeaders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.name || !formData.type || !formData.price) {
      return;
    }

    try {
      // Преобразуем цену в число (поддерживаем запятую и точку)
      const priceStr = String(formData.price).trim().replace(',', '.');
      const priceValue = parseFloat(priceStr);

      // Проверка валидности цены
      if (!priceStr || isNaN(priceValue) || priceValue < 0) {
        return;
      }

      // Подготавливаем данные для отправки с правильными типами
      const submitData: {
        name: string;
        type: string;
        price: number;
        image?: string;
        stock?: number;
        isActive?: boolean;
        sortOrder?: number;
      } = {
        name: String(formData.name).trim(),
        type: String(formData.type).trim(),
        price: priceValue,
      };

      // Опциональные поля добавляем только если они есть
      if (formData.image && formData.image.trim()) {
        submitData.image = formData.image.trim();
      }

      if (formData.stock !== undefined && formData.stock !== null) {
        submitData.stock = Number(formData.stock);
      }

      if (formData.isActive !== undefined) {
        submitData.isActive = Boolean(formData.isActive);
      }

      if (formData.sortOrder !== undefined && formData.sortOrder !== null) {
        submitData.sortOrder = Number(formData.sortOrder);
      }

      // Дополнительная проверка
      if (
        !submitData.name ||
        !submitData.type ||
        submitData.name.length === 0 ||
        submitData.type.length === 0
      ) {
        return;
      }

      if (editingId) {
        // Update
        const requestBody = JSON.stringify(submitData);

        const response = await apiFetch(`${API_URL}/product-components/${editingId}`, {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });

        const responseData = await response.json().catch(() => {
          return null;
        });

        if (!response.ok) {
          let errorMessage = 'Неизвестная ошибка';
          if (responseData) {
            if (typeof responseData.message === 'string') {
              errorMessage = responseData.message;
            } else if (Array.isArray(responseData.message)) {
              errorMessage = responseData.message.join(', ');
            } else if (responseData.message) {
              errorMessage = String(responseData.message);
            } else if (responseData.error) {
              errorMessage = responseData.error;
            }
          } else {
            errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        await fetchComponents();
        setShowAddForm(false);
        setEditingId(null);
        setEditingData({});
        resetForm();
      } else {
        // Create
        const requestBody = JSON.stringify(submitData);

        const response = await apiFetch(`${API_URL}/product-components/product/${productId}`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });

        const responseData = await response.json().catch(() => {
          return null;
        });

        if (!response.ok) {
          let errorMessage = 'Неизвестная ошибка';
          if (responseData) {
            if (typeof responseData.message === 'string') {
              errorMessage = responseData.message;
            } else if (Array.isArray(responseData.message)) {
              errorMessage = responseData.message.join(', ');
            } else if (responseData.message) {
              errorMessage = String(responseData.message);
            } else if (responseData.error) {
              errorMessage = responseData.error;
            }
          } else {
            errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        const addedName = formData.name.trim();
        await fetchComponents();
        setShowAddForm(false);
        setEditingId(null);
        setEditingData({});
        resetForm();
        if (categoryId && addedName && !suggestedNames.includes(addedName)) {
          setSuggestedNames((prev) => [...prev, addedName].sort());
        }
      }
    } catch {
      // Error handled silently
    }
  };

  const handleLinkFromCatalog = async (items: AdminComponentCatalogItem[]) => {
    setLinkingCatalog(true);
    try {
      await linkProductComponentsBatchFromCatalog(
        productId,
        items.map((i) => i.id),
        getAuthHeaders()
      );
      await fetchComponents();
      setCatalogPickerOpen(false);
    } catch {
      // Error handled silently
    } finally {
      setLinkingCatalog(false);
    }
  };

  const handleLinkGroupFromCatalog = async (group: AdminComponentCatalogGroup) => {
    setLinkingCatalog(true);
    try {
      await linkProductComponentGroupFromCatalog(productId, group.id, getAuthHeaders());
      await fetchComponents();
      setCatalogPickerOpen(false);
    } catch {
      // Error handled silently
    } finally {
      setLinkingCatalog(false);
    }
  };

  const handleEdit = (component: ProductComponent) => {
    if (component.isFromCatalog) return;
    // Преобразуем цену в строку
    const priceString = String(component.price || '');

    setEditingId(component.id);
    setEditingData({
      [component.id]: {
        name: component.name || '',
        type: component.type || '',
        price: priceString,
        image: component.image || '',
        stock: component.stock ?? 0,
        isActive: component.isActive ?? true,
        sortOrder: component.sortOrder ?? 0,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleSaveInline = async (componentId: string) => {
    const data = editingData[componentId];
    if (!data) return;

    // Валидация
    if (!data.name || !data.type || !data.price) {
      return;
    }

    try {
      // Преобразуем цену в число
      const priceStr = String(data.price).trim().replace(',', '.');
      const priceValue = parseFloat(priceStr);

      if (!priceStr || isNaN(priceValue) || priceValue < 0) {
        return;
      }

      const submitData: {
        name: string;
        type: string;
        price: number;
        image?: string;
        stock?: number;
        isActive?: boolean;
        sortOrder?: number;
      } = {
        name: String(data.name).trim(),
        type: String(data.type).trim(),
        price: priceValue,
      };

      if (data.image && data.image.trim()) {
        submitData.image = data.image.trim();
      }

      if (data.stock !== undefined && data.stock !== null) {
        submitData.stock = Number(data.stock);
      }

      if (data.isActive !== undefined) {
        submitData.isActive = Boolean(data.isActive);
      }

      if (data.sortOrder !== undefined && data.sortOrder !== null) {
        submitData.sortOrder = Number(data.sortOrder);
      }

      const requestBody = JSON.stringify(submitData);
      const response = await apiFetch(`${API_URL}/product-components/${componentId}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const responseData = await response.json().catch(() => {
        return null;
      });

      if (!response.ok) {
        let errorMessage = 'Неизвестная ошибка';
        if (responseData) {
          if (typeof responseData.message === 'string') {
            errorMessage = responseData.message;
          } else if (Array.isArray(responseData.message)) {
            errorMessage = responseData.message.join(', ');
          }
        }
        throw new Error(errorMessage);
      }

      const newName = data.name.trim();
      await fetchComponents();
      setEditingId(null);
      setEditingData({});
      if (categoryId && newName && !suggestedNames.includes(newName)) {
        setSuggestedNames((prev) => [...prev, newName].sort());
      }
    } catch {
      // Error handled silently
    }
  };

  const handleDelete = (component: ProductComponent) => {
    setDeleteTarget(component);
  };

  const deleteMessage = useMemo(() => {
    if (!deleteTarget) return '';
    const label = [deleteTarget.name, deleteTarget.type].filter(Boolean).join(', ');
    if (deleteTarget.isFromCatalog) {
      return `Удалить привязку «${label}»? Позиция останется в справочнике комплектующих.`;
    }
    return `Удалить комплектующее «${label}» из этого товара?`;
  }, [deleteTarget]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiFetch(`${API_URL}/product-components/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        await fetchComponents();
      }
    } catch {
      // Error handled silently
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      price: '',
      image: '',
      stock: 0,
      isActive: true,
      sortOrder: 0,
    });
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return;
    }

    // Ограничиваем размер до 1MB для иконок (меньше чем для основных изображений товаров)
    const MAX_ICON_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_ICON_SIZE) {
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      // Проверяем размер base64 строки (она примерно на 33% больше оригинала)
      if (base64.length > 1.5 * 1024 * 1024) {
        return;
      }
      setFormData((prev) => ({ ...prev, image: base64 }));
    } catch {
      // Error handled silently
    }
  };

  const handleImageUrlAdd = () => {
    setImageUrlModalInlineId(null);
    setImageUrlModalOpen(true);
  };

  const handleImageUrlAddInline = (componentId: string) => {
    setImageUrlModalInlineId(componentId);
    setImageUrlModalOpen(true);
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImageInline = (componentId: string) => {
    setEditingData((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], image: '' },
    }));
  };

  const handleImageUploadInline = async (componentId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return;
    }

    const MAX_ICON_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_ICON_SIZE) {
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      if (base64.length > 1.5 * 1024 * 1024) {
        return;
      }
      setEditingData((prev) => ({
        ...prev,
        [componentId]: { ...prev[componentId], image: base64 },
      }));
    } catch {
      // Error handled silently
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setEditingData({});
    resetForm();
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка комплектующих...</div>;
  }

  // Группируем по наименованию
  const groupedComponents = components.reduce(
    (acc, comp) => {
      if (!acc[comp.name]) {
        acc[comp.name] = [];
      }
      acc[comp.name].push(comp);
      return acc;
    },
    {} as Record<string, ProductComponent[]>
  );

  const kitComposition = getKitComponents(components);

  const linkedCatalogIds = components
    .map((c) => c.catalogItemId)
    .filter((id): id is string => Boolean(id));

  return (
    <div className={styles.section}>
      {deleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить комплектующее?"
          message={deleteMessage}
          confirmText={deleting ? 'Удаление…' : 'Удалить'}
          cancelText="Отмена"
          variant="danger"
          onConfirm={() => void confirmDelete()}
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      ) : null}

      <ComponentCatalogPickerModal
        open={catalogPickerOpen}
        onClose={() => setCatalogPickerOpen(false)}
        onSelect={handleLinkFromCatalog}
        onSelectGroup={handleLinkGroupFromCatalog}
        excludeCatalogIds={linkedCatalogIds}
        saving={linkingCatalog}
      />

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Комплектующие</h2>
        <div className={styles.sectionHeaderActions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.addButton}
            onClick={() => setCatalogPickerOpen(true)}
          >
            + Из справочника / группы
          </button>
          <button
            data-admin-mutation
            type="button"
            className={styles.addButton}
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
          >
            + Вручную
          </button>
          <Link href="/admin/catalog/components" className={styles.addButtonLink}>
            Справочник
          </Link>
        </div>
      </div>

      {kitComposition && (
        <div className={styles.kitCompositionInfo}>
          <strong>Состав комплекта на сайте:</strong> полотно 1 шт., стойка коробки 2,5 шт.,
          наличники 5 шт. Покупатель может выбрать «Полотно» или «Комплект» в карточке товара.
        </div>
      )}

      {showAddForm && !editingId && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Наименование *</label>
              {suggestedNames.length > 0 && (
                <div className={styles.namesHint}>
                  <span className={styles.namesHintLabel}>
                    Подсказка: наименования из других товаров категории —
                  </span>
                  <div className={styles.namesHintChips}>
                    {suggestedNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={styles.namesHintChip}
                        onClick={() => setFormData({ ...formData, name })}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                list="component-names-datalist"
                required
                className={styles.input}
                placeholder="Выберите или введите наименование"
              />
              <datalist id="component-names-datalist">
                {suggestedNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className={styles.formGroup}>
              <label>Тип *</label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                className={styles.input}
                placeholder="Например: Стойка коробки 2000x800"
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Цена за 1 шт. *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Количество на складе</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Порядок сортировки</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Изображение (иконка)</label>
              {formData.image && (
                <div className={styles.imagePreview}>
                  <img src={formData.image} alt="Preview" />
                  <button type="button" onClick={removeImage} className={styles.removeImageButton}>
                    ×
                  </button>
                </div>
              )}
              <div className={styles.imageUploadButtons}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className={styles.hiddenFileInput}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadButton}
                >
                  Загрузить файл
                </button>
                <button type="button" onClick={handleImageUrlAdd} className={styles.urlButton}>
                  Вставить URL
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Активен
              </label>
            </div>
          </div>
          <div className={styles.formActions}>
            <button data-admin-mutation type="submit" className={styles.saveButton}>
              {editingId ? 'Сохранить изменения' : 'Добавить'}
            </button>
            <button type="button" onClick={handleCancel} className={styles.cancelButton}>
              Отмена
            </button>
          </div>
        </form>
      )}

      {Object.entries(groupedComponents).map(([name, items]) => (
        <div key={name} className={styles.componentGroup}>
          <h3 className={styles.groupTitle}>{name}</h3>
          <div className={styles.componentsList}>
            {items.map((component) => {
              const isEditing = editingId === component.id;
              const editData = editingData[component.id] || {
                name: component.name || '',
                type: component.type || '',
                price: String(component.price || ''),
                image: component.image || '',
                stock: component.stock ?? 0,
                isActive: component.isActive ?? true,
                sortOrder: component.sortOrder ?? 0,
              };

              return (
                <div key={component.id} className={styles.componentItem}>
                  <div className={styles.componentImageSection}>
                    {editData.image && (
                      <div className={styles.componentImage}>
                        <img src={editData.image} alt={editData.type} />
                        {isEditing && (
                          <button
                            data-admin-mutation
                            type="button"
                            onClick={() => removeImageInline(component.id)}
                            className={styles.removeImageButton}
                            title="Удалить изображение"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                    {isEditing && (
                      <div className={styles.inlineImageControls}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUploadInline(component.id, e.target.files)}
                          className={styles.hiddenFileInput}
                          id={`image-input-${component.id}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(
                              `image-input-${component.id}`
                            ) as HTMLInputElement;
                            input?.click();
                          }}
                          className={styles.inlineImageButton}
                          title="Загрузить изображение"
                        >
                          📷
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImageUrlAddInline(component.id)}
                          className={styles.inlineImageButton}
                          title="Вставить URL"
                        >
                          🔗
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.componentInfo}>
                    <div className={styles.componentInfoRow}>
                      {isEditing ? (
                        <>
                          <div className={styles.inlineField}>
                            <label className={styles.inlineLabel}>Наименование</label>
                            <input
                              type="text"
                              value={editData.name}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  [component.id]: { ...editData, name: e.target.value },
                                })
                              }
                              list={`component-names-inline-${component.id}`}
                              className={styles.inlineInput}
                              placeholder="Наименование"
                            />
                            <datalist id={`component-names-inline-${component.id}`}>
                              {suggestedNames.map((n) => (
                                <option key={n} value={n} />
                              ))}
                            </datalist>
                          </div>
                          <div className={styles.inlineField}>
                            <label className={styles.inlineLabel}>Тип</label>
                            <input
                              type="text"
                              value={editData.type}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  [component.id]: { ...editData, type: e.target.value },
                                })
                              }
                              className={styles.inlineInput}
                              placeholder="Тип"
                            />
                          </div>
                          <div className={styles.inlineField}>
                            <label className={styles.inlineLabel}>Цена</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editData.price}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  [component.id]: { ...editData, price: e.target.value },
                                })
                              }
                              className={styles.inlineInput}
                              placeholder="Цена"
                            />
                          </div>
                          <div className={styles.inlineField}>
                            <label className={styles.inlineLabel}>Склад</label>
                            <input
                              type="number"
                              min="0"
                              value={editData.stock}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  [component.id]: {
                                    ...editData,
                                    stock: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className={styles.inlineInput}
                              placeholder="Склад"
                            />
                          </div>
                          <div className={styles.inlineField}>
                            <label className={styles.inlineLabel}>Сортировка</label>
                            <input
                              type="number"
                              value={editData.sortOrder}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  [component.id]: {
                                    ...editData,
                                    sortOrder: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className={styles.inlineInput}
                              placeholder="Сортировка"
                            />
                          </div>
                          <div className={styles.inlineField}>
                            <label className={styles.inlineCheckbox}>
                              <input
                                type="checkbox"
                                checked={editData.isActive}
                                onChange={(e) =>
                                  setEditingData({
                                    ...editingData,
                                    [component.id]: { ...editData, isActive: e.target.checked },
                                  })
                                }
                              />
                              Активен
                            </label>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className={styles.componentType}>{component.type}</span>
                          <span className={styles.componentPrice}>
                            {parseFloat(String(component.price)).toLocaleString('ru-RU')} ₽
                          </span>
                          <span className={styles.componentStock}>
                            Склад: {component.stock} шт.
                          </span>
                          <span className={styles.componentSortOrder}>
                            Сортировка: {component.sortOrder}
                          </span>
                          {!component.isActive && (
                            <span className={styles.inactiveBadge}>Неактивен</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.componentActions}>
                    {isEditing ? (
                      <>
                        <button
                          data-admin-mutation
                          type="button"
                          onClick={() => handleSaveInline(component.id)}
                          className={styles.saveButton}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={styles.cancelButton}
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEdit(component)}
                          className={styles.editButton}
                          title="Редактировать"
                          aria-label="Редактировать"
                        >
                          <EditIcon size={16} tone="inherit" />
                        </button>
                        <button
                          data-admin-mutation
                          type="button"
                          onClick={() => handleDelete(component)}
                          className={styles.deleteButton}
                          title="Удалить"
                          aria-label="Удалить"
                        >
                          <DeleteIcon size={16} tone="inherit" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {components.length === 0 && !showAddForm && (
        <div className={styles.emptyState}>
          Комплектующие не добавлены. Нажмите "Добавить комплектующее" для создания.
        </div>
      )}

      <ImageUrlModal
        isOpen={imageUrlModalOpen}
        onClose={() => {
          setImageUrlModalOpen(false);
          setImageUrlModalInlineId(null);
        }}
        onConfirm={(url) => {
          if (imageUrlModalInlineId != null) {
            setEditingData((prev) => ({
              ...prev,
              [imageUrlModalInlineId]: {
                ...prev[imageUrlModalInlineId],
                image: url,
              },
            }));
          } else {
            setFormData((prev) => ({ ...prev, image: url }));
          }
        }}
      />
    </div>
  );
};
