'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './CategoryAttributesPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface AttributeValue {
  id: string;
  value: string;
  colorHex?: string;
  order?: number;
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

const LIST_ATTRIBUTE_TYPES: Attribute['type'][] = ['SELECT', 'MULTI_SELECT'];

function isListAttributeType(t: Attribute['type']): boolean {
  return LIST_ATTRIBUTE_TYPES.includes(t);
}

function AttributeOptionRowsEditor({
  rows,
  onChange,
  mod,
}: {
  rows: string[];
  onChange: (next: string[]) => void;
  mod: typeof styles;
}) {
  const moveRow = (index: number, direction: -1 | 1) => {
    const j = index + direction;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  return (
    <div className={mod.optionRowsEditor}>
      <div className={mod.optionRowsHeader}>
        <span className={mod.optionRowsTitle}>Варианты списка</span>
        <button
          type="button"
          className={mod.addOptionButton}
          onClick={() => onChange([...rows, ''])}
        >
          + Добавить вариант
        </button>
      </div>
      <p className={mod.optionRowsHint}>
        На карточке товара значение можно выбрать только из этого списка. Порядок строк совпадает с
        порядком в выпадающем списке.
      </p>
      {rows.length === 0 ? (
        <p className={mod.optionRowsEmpty}>Пока нет вариантов — нажмите «Добавить вариант».</p>
      ) : (
        <ul className={mod.optionRowsList}>
          {rows.map((row, index) => (
            <li key={index} className={mod.optionRow}>
              <input
                type="text"
                value={row}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = [...rows];
                  next[index] = v;
                  onChange(next);
                }}
                className={mod.input}
                placeholder={`Значение ${index + 1}`}
              />
              <div className={mod.optionRowActions}>
                <button
                  type="button"
                  className={mod.optionRowMoveBtn}
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                  title="Выше"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={mod.optionRowMoveBtn}
                  disabled={index >= rows.length - 1}
                  onClick={() => moveRow(index, 1)}
                  title="Ниже"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={mod.optionRowRemoveBtn}
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  parentId: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
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
  const [noticeModal, setNoticeModal] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const noticeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reordering, setReordering] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  /** Для массового добавления: сразу isRequired в связи категория–атрибут */
  const [bulkAddAsRequired, setBulkAddAsRequired] = useState(false);
  /** Для «Создать и добавить»: первая привязка к категории с обязательностью */
  const [createLinkAsRequired, setCreateLinkAsRequired] = useState(false);

  // New attribute form
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    slug: '',
    type: 'TEXT' as Attribute['type'],
    unit: '',
    isFilterable: true,
    optionRows: [] as string[],
  });

  // Edit attribute modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    type: 'TEXT' as Attribute['type'],
    unit: '',
    isFilterable: true,
    optionRows: [] as string[],
  });

  // Apply to products state
  const [applyingToProducts, setApplyingToProducts] = useState(false);
  const [selectedForApply, setSelectedForApply] = useState<string[]>([]);
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});

  // Inherit attributes state
  const [inheriting, setInheriting] = useState(false);

  /** Генерация slug из названия (транслитерация + допустимые символы). */
  const generateSlug = useCallback((name: string) => {
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
  }, []);

  const clearNoticeModal = useCallback(() => {
    if (noticeCloseTimerRef.current !== null) {
      clearTimeout(noticeCloseTimerRef.current);
      noticeCloseTimerRef.current = null;
    }
    setNoticeModal(null);
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (noticeCloseTimerRef.current !== null) {
      clearTimeout(noticeCloseTimerRef.current);
    }
    setNoticeModal({ type, text });
    noticeCloseTimerRef.current = setTimeout(() => {
      setNoticeModal(null);
      noticeCloseTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeCloseTimerRef.current !== null) {
        clearTimeout(noticeCloseTimerRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) {
        setLoading(true);
      }
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
          const data: CategoryAttribute[] = await attrsRes.json();
          // Бекенд уже отдаёт orderBy: { order: 'asc' }, но сортируем ещё раз для надёжности
          const sorted = [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCategoryAttributes(sorted);
        }

        if (allAttrsRes.ok) {
          const data = await allAttrsRes.json();
          setAllAttributes(data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showMessage('error', 'Ошибка загрузки данных');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [categoryId, showMessage]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const persistCategoryAttributesOrder = async (
    items: Array<{ attributeId: string; order: number }>
  ) => {
    if (items.length === 0) return;
    try {
      setReordering(true);
      await Promise.all(
        items.map(({ attributeId, order }) =>
          fetch(`${API_URL}/categories/${categoryId}/attributes/${attributeId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ order }),
          })
        )
      );
    } catch {
      showMessage('error', 'Не удалось сохранить порядок атрибутов');
      // Возвращаем актуальные данные с сервера (на случай расхождений)
      fetchData({ silent: true });
    } finally {
      setReordering(false);
    }
  };

  const moveCategoryAttribute = async (attributeId: string, direction: 'up' | 'down') => {
    if (reordering) return;
    const index = categoryAttributes.findIndex((ca) => ca.attributeId === attributeId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryAttributes.length) return;

    const next = [...categoryAttributes];
    const tmp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = tmp;

    // Нормализуем order под текущий порядок списка (0..n-1)
    const normalized = next.map((ca, i) => ({ ...ca, order: i }));
    setCategoryAttributes(normalized);

    // Сохраняем только два изменившихся элемента (swap)
    await persistCategoryAttributesOrder([
      { attributeId: normalized[index].attributeId, order: normalized[index].order },
      { attributeId: normalized[targetIndex].attributeId, order: normalized[targetIndex].order },
    ]);
  };

  const normalizeCategoryAttributesOrder = async () => {
    if (reordering) return;
    const normalized = [...categoryAttributes]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((ca, i) => ({ ...ca, order: i }));
    setCategoryAttributes(normalized);
    await persistCategoryAttributesOrder(
      normalized.map((ca) => ({ attributeId: ca.attributeId, order: ca.order }))
    );
    showMessage('success', 'Порядок атрибутов сохранён');
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
        body: JSON.stringify({
          attributeIds: selectedAttributeIds,
          isRequired: bulkAddAsRequired,
        }),
      });

      if (response.ok) {
        showMessage('success', 'Атрибуты добавлены');
        setShowAddModal(false);
        setSelectedAttributeIds([]);
        setBulkAddAsRequired(false);
        fetchData({ silent: true });
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
        fetchData({ silent: true });
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
        showMessage(
          'success',
          !currentValue
            ? 'Атрибут обязателен при сохранении карточки товара в этой категории'
            : 'Обязательность снята'
        );
        fetchData({ silent: true });
      } else {
        const data = await response.json().catch(() => ({}));
        showMessage(
          'error',
          typeof data.message === 'string' && data.message.trim()
            ? data.message
            : 'Не удалось обновить обязательность'
        );
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
      const valuesPayload = isListAttributeType(newAttribute.type)
        ? newAttribute.optionRows.map((v) => v.trim()).filter(Boolean)
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
          values: valuesPayload,
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
          optionRows: [],
        });

        // Add to category automatically
        await fetch(`${API_URL}/categories/${categoryId}/attributes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            attributeId: created.id,
            isRequired: createLinkAsRequired,
          }),
        });

        setCreateLinkAsRequired(false);
        fetchData({ silent: true });
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

  // Inherit attributes from parent category
  const handleInheritFromParent = async () => {
    if (!category?.parentId) return;

    setInheriting(true);
    try {
      const response = await fetch(`${API_URL}/categories/${categoryId}/attributes/inherit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (response.ok) {
        const result = await response.json();
        showMessage(
          'success',
          `Унаследовано: ${result.inherited} атрибут(ов), пропущено: ${result.skipped}`
        );
        fetchData({ silent: true });
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to inherit attributes');
      }
    } catch (error) {
      showMessage(
        'error',
        error instanceof Error ? error.message : 'Ошибка наследования атрибутов'
      );
    } finally {
      setInheriting(false);
    }
  };

  // Open edit modal
  const openEditModal = (attr: Attribute) => {
    setEditingAttribute(attr);
    const sortedValues = [...attr.values].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    );
    setEditForm({
      name: attr.name,
      slug: attr.slug,
      type: attr.type,
      unit: attr.unit || '',
      isFilterable: attr.isFilterable,
      optionRows: sortedValues.map((v) => v.value),
    });
    setShowEditModal(true);
  };

  // Handle edit attribute
  const handleEditAttribute = async () => {
    if (!editingAttribute || !editForm.name || !editForm.slug) {
      showMessage('error', 'Заполните название и slug');
      return;
    }

    setSaving(true);
    try {
      const listValues = isListAttributeType(editForm.type)
        ? editForm.optionRows.map((v) => v.trim()).filter(Boolean)
        : [];

      const response = await fetch(`${API_URL}/attributes/${editingAttribute.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          type: editForm.type,
          unit: editForm.unit || null,
          isFilterable: editForm.isFilterable,
          values: listValues,
        }),
      });

      if (response.ok) {
        showMessage('success', 'Атрибут обновлён');
        setShowEditModal(false);
        setEditingAttribute(null);
        fetchData({ silent: true });
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update attribute');
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Ошибка обновления атрибута');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete attribute completely
  const handleDeleteAttribute = async (attributeId: string, attributeName: string) => {
    if (
      !confirm(
        `Удалить атрибут "${attributeName}" полностью? Это удалит его из всех категорий и товаров.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/attributes/${attributeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        showMessage('success', 'Атрибут удалён');
        fetchData({ silent: true });
      } else {
        throw new Error('Failed to delete attribute');
      }
    } catch {
      showMessage('error', 'Ошибка удаления атрибута');
    }
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

      <div className={styles.content}>
        {/* Left: Category attributes */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Атрибуты категории ({categoryAttributes.length})</h2>
            <div className={styles.sectionActions}>
              {categoryAttributes.length > 1 && (
                <button
                  className={styles.normalizeOrderButton}
                  onClick={normalizeCategoryAttributesOrder}
                  disabled={reordering}
                  title="Пронумеровать атрибуты по текущему списку и сохранить. Полезно, если после добавления у нескольких атрибутов одинаковый order."
                >
                  {reordering ? '⏳ Сохранение порядка...' : '↕ Сохранить порядок'}
                </button>
              )}
              {category?.parentId && (
                <button
                  className={styles.inheritButton}
                  onClick={handleInheritFromParent}
                  disabled={inheriting}
                  title={`Скопировать атрибуты из родительской категории "${category.parent?.name || ''}"`}
                >
                  {inheriting
                    ? '⏳ Наследование...'
                    : `📥 Унаследовать от "${category.parent?.name || 'родителя'}"`}
                </button>
              )}
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
              {categoryAttributes.map((ca, idx) => (
                <div key={ca.id} className={styles.attributeCard}>
                  <div className={styles.attributeHeader}>
                    <input
                      type="checkbox"
                      checked={selectedForApply.includes(ca.attributeId)}
                      onChange={() => toggleSelectForApply(ca.attributeId)}
                      className={styles.applyCheckbox}
                      title="Выбрать для применения к товарам"
                    />
                    <div className={styles.orderControls} aria-label="Порядок атрибутов">
                      <button
                        type="button"
                        className={styles.orderButton}
                        onClick={() => moveCategoryAttribute(ca.attributeId, 'up')}
                        disabled={reordering || idx === 0}
                        title="Выше"
                        aria-label="Переместить выше"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.orderButton}
                        onClick={() => moveCategoryAttribute(ca.attributeId, 'down')}
                        disabled={reordering || idx === categoryAttributes.length - 1}
                        title="Ниже"
                        aria-label="Переместить ниже"
                      >
                        ↓
                      </button>
                    </div>
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
                    <label
                      className={styles.requiredToggle}
                      title="На карточке товара поле подсвечивается и сохранение без значения блокируется."
                    >
                      <input
                        type="checkbox"
                        checked={ca.isRequired}
                        onChange={() => handleToggleRequired(ca.attributeId, ca.isRequired)}
                      />
                      <span>Обязательный для товара</span>
                    </label>
                    <div className={styles.attributeActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => openEditModal(ca.attribute)}
                        title="Редактировать атрибут"
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveAttribute(ca.attributeId)}
                        title="Убрать из категории"
                      >
                        Убрать
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteAttribute(ca.attributeId, ca.attribute.name)}
                        title="Удалить атрибут полностью"
                      >
                        🗑️
                      </button>
                    </div>
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
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setShowAddModal(false);
            setBulkAddAsRequired(false);
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Добавить атрибуты</h3>
            <p className={styles.hint}>
              Отметьте «Обязательный для товара», чтобы на карточке товара поле подсвечивалось и не
              давало сохранить товар без значения (в категориях с этим атрибутом).
            </p>
            <label className={styles.checkboxLabel} style={{ marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={bulkAddAsRequired}
                onChange={(e) => setBulkAddAsRequired(e.target.checked)}
              />
              <span>Обязательный для товара (все выбранные ниже)</span>
            </label>

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
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowAddModal(false);
                      setBulkAddAsRequired(false);
                    }}
                  >
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
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowAddModal(false);
                    setBulkAddAsRequired(false);
                  }}
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create new attribute modal */}
      {showCreateModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setShowCreateModal(false);
            setCreateLinkAsRequired(false);
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Создать новый атрибут</h3>

            <div className={styles.formGroup}>
              <label>Название *</label>
              <input
                type="text"
                value={newAttribute.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setNewAttribute((prev) => ({
                    ...prev,
                    name,
                    slug: generateSlug(name),
                  }));
                }}
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
                  onChange={(e) => {
                    const type = e.target.value as Attribute['type'];
                    setNewAttribute((prev) => ({
                      ...prev,
                      type,
                      ...(!isListAttributeType(type) ? { optionRows: [] } : {}),
                    }));
                  }}
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

            {isListAttributeType(newAttribute.type) && (
              <div className={styles.formGroup}>
                <AttributeOptionRowsEditor
                  rows={newAttribute.optionRows}
                  onChange={(optionRows) => setNewAttribute((prev) => ({ ...prev, optionRows }))}
                  mod={styles}
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

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={createLinkAsRequired}
                onChange={(e) => setCreateLinkAsRequired(e.target.checked)}
              />
              <span>Обязательный при заполнении карточек товаров в этой категории</span>
            </label>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateLinkAsRequired(false);
                }}
              >
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

      {/* Edit attribute modal */}
      {showEditModal && editingAttribute && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Редактировать атрибут</h3>

            <div className={styles.formGroup}>
              <label>Название *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setEditForm((prev) => ({
                    ...prev,
                    name,
                    slug: generateSlug(name),
                  }));
                }}
                className={styles.input}
                placeholder="Например: Материал"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Slug (URL) *</label>
              <input
                type="text"
                value={editForm.slug}
                onChange={(e) =>
                  setEditForm((prev) => ({
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
                  value={editForm.type}
                  onChange={(e) => {
                    const type = e.target.value as Attribute['type'];
                    setEditForm((prev) => ({
                      ...prev,
                      type,
                      ...(!isListAttributeType(type) ? { optionRows: [] } : {}),
                    }));
                  }}
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
                  value={editForm.unit}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className={styles.input}
                  placeholder="мм, кг, шт"
                />
              </div>
            </div>

            {isListAttributeType(editForm.type) && (
              <div className={styles.formGroup}>
                <AttributeOptionRowsEditor
                  rows={editForm.optionRows}
                  onChange={(optionRows) => setEditForm((prev) => ({ ...prev, optionRows }))}
                  mod={styles}
                />
              </div>
            )}

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={editForm.isFilterable}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, isFilterable: e.target.checked }))
                }
              />
              <span>Использовать для фильтрации</span>
            </label>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowEditModal(false)}>
                Отмена
              </button>
              <button className={styles.saveButton} onClick={handleEditAttribute} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {noticeModal && (
        <div
          className={styles.noticeOverlay}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="category-attributes-notice-title"
          onClick={clearNoticeModal}
        >
          <div
            className={`${styles.noticeModal} ${
              noticeModal.type === 'success' ? styles.noticeModalSuccess : styles.noticeModalError
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="category-attributes-notice-title">
              {noticeModal.type === 'success' ? 'Готово' : 'Ошибка'}
            </h3>
            <p className={styles.noticeModalText}>{noticeModal.text}</p>
            <div className={styles.noticeModalActions}>
              <button type="button" className={styles.noticeModalButton} onClick={clearNoticeModal}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
