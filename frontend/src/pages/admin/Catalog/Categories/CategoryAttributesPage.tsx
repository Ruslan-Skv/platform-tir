'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './CategoryAttributesPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface AttributeValue {
  id: string;
  value: string;
  colorHex?: string;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';
  unit?: string;
  isFilterable: boolean;
  values: AttributeValue[];
}

interface CategoryAttribute {
  id: string;
  attributeId: string;
  isRequired: boolean;
  order: number;
  attribute: Attribute;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryAttributesPageProps {
  categoryId: string;
}

export function CategoryAttributesPage({ categoryId }: CategoryAttributesPageProps) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);

  // New attribute form
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    slug: '',
    type: 'TEXT' as Attribute['type'],
    unit: '',
    isFilterable: true,
    values: '',
  });

  // Apply to products state
  const [applyingToProducts, setApplyingToProducts] = useState(false);
  const [selectedForApply, setSelectedForApply] = useState<string[]>([]);
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryRes, attrsRes, allAttrsRes] = await Promise.all([
        fetch(`${API_URL}/categories/${categoryId}`),
        fetch(`${API_URL}/categories/${categoryId}/attributes`),
        fetch(`${API_URL}/categories/attributes/all`),
      ]);

      if (categoryRes.ok) {
        const data = await categoryRes.json();
        setCategory(data);
      }

      if (attrsRes.ok) {
        const data = await attrsRes.json();
        setCategoryAttributes(data);
      }

      if (allAttrsRes.ok) {
        const data = await allAttrsRes.json();
        setAllAttributes(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки данных' });
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Get attributes not yet added to category
  const availableAttributes = allAttributes.filter(
    (attr) => !categoryAttributes.some((ca) => ca.attributeId === attr.id)
  );

  const handleAddAttributes = async () => {
    if (selectedAttributeIds.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/categories/${categoryId}/attributes/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ attributeIds: selectedAttributeIds }),
      });

      if (response.ok) {
        showMessage('success', 'Атрибуты добавлены');
        setShowAddModal(false);
        setSelectedAttributeIds([]);
        fetchData();
      } else {
        throw new Error('Failed to add attributes');
      }
    } catch {
      showMessage('error', 'Ошибка добавления атрибутов');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAttribute = async (attributeId: string) => {
    if (!confirm('Удалить атрибут из категории?')) return;

    try {
      const response = await fetch(
        `${API_URL}/categories/${categoryId}/attributes/${attributeId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        showMessage('success', 'Атрибут удалён');
        fetchData();
      } else {
        throw new Error('Failed to remove attribute');
      }
    } catch {
      showMessage('error', 'Ошибка удаления атрибута');
    }
  };

  const handleToggleRequired = async (attributeId: string, currentValue: boolean) => {
    try {
      const response = await fetch(
        `${API_URL}/categories/${categoryId}/attributes/${attributeId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ isRequired: !currentValue }),
        }
      );

      if (response.ok) {
        fetchData();
      }
    } catch {
      showMessage('error', 'Ошибка обновления');
    }
  };

  const handleCreateAttribute = async () => {
    if (!newAttribute.name || !newAttribute.slug) {
      showMessage('error', 'Заполните название и slug');
      return;
    }

    setSaving(true);
    try {
      const values =
        newAttribute.type === 'SELECT' || newAttribute.type === 'MULTI_SELECT'
          ? newAttribute.values
              .split('\n')
              .map((v) => v.trim())
              .filter(Boolean)
          : undefined;

      const response = await fetch(`${API_URL}/categories/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: newAttribute.name,
          slug: newAttribute.slug,
          type: newAttribute.type,
          unit: newAttribute.unit || undefined,
          isFilterable: newAttribute.isFilterable,
          values,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        showMessage('success', 'Атрибут создан');
        setShowCreateModal(false);
        setNewAttribute({
          name: '',
          slug: '',
          type: 'TEXT',
          unit: '',
          isFilterable: true,
          values: '',
        });

        // Add to category automatically
        await fetch(`${API_URL}/categories/${categoryId}/attributes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ attributeId: created.id }),
        });

        fetchData();
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create attribute');
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Ошибка создания атрибута');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToProducts = async () => {
    if (selectedForApply.length === 0) {
      showMessage('error', 'Выберите атрибуты для применения');
      return;
    }

    setApplyingToProducts(true);
    try {
      const attributes = selectedForApply.map((attrId) => ({
        attributeId: attrId,
        defaultValue: defaultValues[attrId] || '',
      }));

      const response = await fetch(`${API_URL}/categories/${categoryId}/attributes/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ attributes }),
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('success', `Обновлено ${result.updated} из ${result.totalProducts} товаров`);
        setSelectedForApply([]);
        setDefaultValues({});
      } else {
        throw new Error('Failed to apply attributes');
      }
    } catch {
      showMessage('error', 'Ошибка применения атрибутов');
    } finally {
      setApplyingToProducts(false);
    }
  };

  const toggleSelectForApply = (attrId: string) => {
    setSelectedForApply((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
    );
  };

  const getTypeLabel = (type: Attribute['type']) => {
    const labels: Record<Attribute['type'], string> = {
      TEXT: 'Текст',
      NUMBER: 'Число',
      BOOLEAN: 'Да/Нет',
      SELECT: 'Выбор',
      MULTI_SELECT: 'Множ. выбор',
      COLOR: 'Цвет',
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка...</p>
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
          ← Назад к категориям
        </button>
        <h1 className={styles.title}>Атрибуты категории: {category?.name}</h1>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.content}>
        {/* Left: Category attributes */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Атрибуты категории ({categoryAttributes.length})</h2>
            <div className={styles.sectionActions}>
              <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
                + Добавить существующий
              </button>
              <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
                + Создать новый
              </button>
            </div>
          </div>

          {categoryAttributes.length > 0 ? (
            <div className={styles.attributesList}>
              {categoryAttributes.map((ca) => (
                <div key={ca.id} className={styles.attributeCard}>
                  <div className={styles.attributeHeader}>
                    <input
                      type="checkbox"
                      checked={selectedForApply.includes(ca.attributeId)}
                      onChange={() => toggleSelectForApply(ca.attributeId)}
                      className={styles.applyCheckbox}
                      title="Выбрать для применения к товарам"
                    />
                    <div className={styles.attributeInfo}>
                      <span className={styles.attributeName}>{ca.attribute.name}</span>
                      <span className={styles.attributeSlug}>{ca.attribute.slug}</span>
                    </div>
                    <span className={styles.attributeType}>
                      {getTypeLabel(ca.attribute.type)}
                      {ca.attribute.unit && ` (${ca.attribute.unit})`}
                    </span>
                  </div>

                  {ca.attribute.values.length > 0 && (
                    <div className={styles.attributeValues}>
                      {ca.attribute.values.slice(0, 5).map((v) => (
                        <span key={v.id} className={styles.valueTag}>
                          {v.colorHex && (
                            <span className={styles.colorDot} style={{ background: v.colorHex }} />
                          )}
                          {v.value}
                        </span>
                      ))}
                      {ca.attribute.values.length > 5 && (
                        <span className={styles.moreValues}>+{ca.attribute.values.length - 5}</span>
                      )}
                    </div>
                  )}

                  {selectedForApply.includes(ca.attributeId) && (
                    <div className={styles.defaultValueInput}>
                      <label>Значение по умолчанию:</label>
                      <input
                        type="text"
                        value={defaultValues[ca.attributeId] || ''}
                        onChange={(e) =>
                          setDefaultValues((prev) => ({
                            ...prev,
                            [ca.attributeId]: e.target.value,
                          }))
                        }
                        placeholder="Оставьте пустым, если не нужно"
                        className={styles.input}
                      />
                    </div>
                  )}

                  <div className={styles.attributeFooter}>
                    <label className={styles.requiredToggle}>
                      <input
                        type="checkbox"
                        checked={ca.isRequired}
                        onChange={() => handleToggleRequired(ca.attributeId, ca.isRequired)}
                      />
                      <span>Обязательный</span>
                    </label>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveAttribute(ca.attributeId)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>Атрибуты не добавлены</p>
              <p className={styles.hint}>
                Добавьте атрибуты, чтобы задать характеристики товарам этой категории
              </p>
            </div>
          )}

          {selectedForApply.length > 0 && (
            <div className={styles.applySection}>
              <button
                className={styles.applyButton}
                onClick={handleApplyToProducts}
                disabled={applyingToProducts}
              >
                {applyingToProducts
                  ? 'Применение...'
                  : `Применить ${selectedForApply.length} атрибут(ов) ко всем товарам категории`}
              </button>
              <p className={styles.applyHint}>
                Атрибуты будут добавлены к товарам, которые их ещё не имеют
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add existing attribute modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Добавить атрибуты</h3>

            {availableAttributes.length > 0 ? (
              <>
                <div className={styles.attributeSelectList}>
                  {availableAttributes.map((attr) => (
                    <label key={attr.id} className={styles.attributeSelectItem}>
                      <input
                        type="checkbox"
                        checked={selectedAttributeIds.includes(attr.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAttributeIds((prev) => [...prev, attr.id]);
                          } else {
                            setSelectedAttributeIds((prev) => prev.filter((id) => id !== attr.id));
                          }
                        }}
                      />
                      <span className={styles.attrName}>{attr.name}</span>
                      <span className={styles.attrType}>{getTypeLabel(attr.type)}</span>
                    </label>
                  ))}
                </div>

                <div className={styles.modalActions}>
                  <button className={styles.cancelButton} onClick={() => setShowAddModal(false)}>
                    Отмена
                  </button>
                  <button
                    className={styles.saveButton}
                    onClick={handleAddAttributes}
                    disabled={saving || selectedAttributeIds.length === 0}
                  >
                    {saving ? 'Добавление...' : `Добавить (${selectedAttributeIds.length})`}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyModal}>
                <p>Все атрибуты уже добавлены к категории</p>
                <button className={styles.cancelButton} onClick={() => setShowAddModal(false)}>
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create new attribute modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Создать новый атрибут</h3>

            <div className={styles.formGroup}>
              <label>Название *</label>
              <input
                type="text"
                value={newAttribute.name}
                onChange={(e) => setNewAttribute((prev) => ({ ...prev, name: e.target.value }))}
                className={styles.input}
                placeholder="Например: Материал"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Slug (URL) *</label>
              <input
                type="text"
                value={newAttribute.slug}
                onChange={(e) =>
                  setNewAttribute((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                className={styles.input}
                placeholder="material"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Тип</label>
                <select
                  value={newAttribute.type}
                  onChange={(e) =>
                    setNewAttribute((prev) => ({
                      ...prev,
                      type: e.target.value as Attribute['type'],
                    }))
                  }
                  className={styles.select}
                >
                  <option value="TEXT">Текст</option>
                  <option value="NUMBER">Число</option>
                  <option value="BOOLEAN">Да/Нет</option>
                  <option value="SELECT">Выбор из списка</option>
                  <option value="MULTI_SELECT">Множественный выбор</option>
                  <option value="COLOR">Цвет</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Единица измерения</label>
                <input
                  type="text"
                  value={newAttribute.unit}
                  onChange={(e) => setNewAttribute((prev) => ({ ...prev, unit: e.target.value }))}
                  className={styles.input}
                  placeholder="мм, кг, шт"
                />
              </div>
            </div>

            {(newAttribute.type === 'SELECT' || newAttribute.type === 'MULTI_SELECT') && (
              <div className={styles.formGroup}>
                <label>Значения (по одному на строку)</label>
                <textarea
                  value={newAttribute.values}
                  onChange={(e) => setNewAttribute((prev) => ({ ...prev, values: e.target.value }))}
                  className={styles.textarea}
                  rows={5}
                  placeholder="Сталь&#10;Дерево&#10;Пластик"
                />
              </div>
            )}

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newAttribute.isFilterable}
                onChange={(e) =>
                  setNewAttribute((prev) => ({ ...prev, isFilterable: e.target.checked }))
                }
              />
              <span>Использовать для фильтрации</span>
            </label>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowCreateModal(false)}>
                Отмена
              </button>
              <button
                className={styles.saveButton}
                onClick={handleCreateAttribute}
                disabled={saving}
              >
                {saving ? 'Создание...' : 'Создать и добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
