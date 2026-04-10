'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './CatalogFilterBlockSection.module.css';
import baseStyles from './SettingsPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type FilterKind = 'ATTRIBUTE' | 'STOCK' | 'MANUFACTURER';

type OptionsSort = 'NUMERIC_DESC' | 'TEXT_ASC' | 'MANUAL';

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
}

interface CategoryAttrRow {
  id: string;
  attribute: { id: string; name: string; slug: string };
}

interface BlockItemApi {
  id: string;
  kind: FilterKind;
  attributeId: string | null;
  labelOverride: string | null;
  sortOrder: number;
  optionsSort?: OptionsSort;
  manualOptionOrder?: unknown;
  attribute?: { id: string; name: string; slug: string } | null;
}

interface CatalogFilterBlockApi {
  id: string;
  name: string;
  categoryId: string;
  includeDescendants: boolean;
  sortOrder: number;
  isActive: boolean;
  category: { id: string; name: string; slug: string };
  items: BlockItemApi[];
}

interface FormItem {
  key: string;
  kind: FilterKind;
  attributeId: string;
  labelOverride: string;
  sortOrder: number;
  optionsSort: OptionsSort;
  manualOptionOrderText: string;
}

function newKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function emptyFormItem(sortOrder: number): FormItem {
  return {
    key: newKey(),
    kind: 'ATTRIBUTE',
    attributeId: '',
    labelOverride: '',
    sortOrder,
    optionsSort: 'NUMERIC_DESC',
    manualOptionOrderText: '',
  };
}

function manualOrderToText(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

function blockToFormItems(items: BlockItemApi[]): FormItem[] {
  return items.map((it, i) => ({
    key: it.id || newKey(),
    kind: it.kind,
    attributeId: it.attributeId ?? '',
    labelOverride: it.labelOverride ?? '',
    sortOrder: it.sortOrder ?? i,
    optionsSort: it.kind === 'ATTRIBUTE' ? (it.optionsSort ?? 'NUMERIC_DESC') : 'NUMERIC_DESC',
    manualOptionOrderText: it.kind === 'ATTRIBUTE' ? manualOrderToText(it.manualOptionOrder) : '',
  }));
}

const KIND_OPTIONS: { value: FilterKind; label: string }[] = [
  { value: 'ATTRIBUTE', label: 'Атрибут' },
  { value: 'STOCK', label: 'Наличие' },
  { value: 'MANUFACTURER', label: 'Производитель' },
];

const OPTIONS_SORT_OPTIONS: { value: OptionsSort; label: string }[] = [
  { value: 'NUMERIC_DESC', label: 'Числа: от большего к меньшему (по умолчанию)' },
  { value: 'TEXT_ASC', label: 'По алфавиту (А→Я)' },
  { value: 'MANUAL', label: 'Вручную (список ниже)' },
];

export function CatalogFilterBlockSection() {
  const { getAuthHeaders } = useAuth();
  const [blocks, setBlocks] = useState<CatalogFilterBlockApi[]>([]);
  const [flatCats, setFlatCats] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [blockSortOrder, setBlockSortOrder] = useState(0);
  const [formItems, setFormItems] = useState<FormItem[]>([emptyFormItem(0)]);

  const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttrRow[]>([]);

  const loadBlocks = useCallback(async () => {
    const res = await fetch(`${API_URL}/admin/catalog-filter-blocks`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Не удалось загрузить блоки');
    const data = await res.json();
    setBlocks(Array.isArray(data) ? data : []);
  }, [getAuthHeaders]);

  const loadFlatCats = useCallback(async () => {
    const res = await fetch(`${API_URL}/categories/flat`);
    if (!res.ok) return;
    const data = await res.json();
    setFlatCats(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadBlocks(), loadFlatCats()]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBlocks, loadFlatCats]);

  useEffect(() => {
    if (!categoryId) {
      setCategoryAttrs([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/categories/${encodeURIComponent(categoryId)}/attributes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: CategoryAttrRow[]) => {
        if (!cancelled) setCategoryAttrs(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setCategoryAttrs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const resetForm = () => {
    setEditingId(null);
    setCreating(false);
    setName('');
    setCategoryId('');
    setIncludeDescendants(true);
    setIsActive(true);
    setBlockSortOrder(0);
    setFormItems([emptyFormItem(0)]);
  };

  const startCreate = () => {
    resetForm();
    setCreating(true);
  };

  const startEdit = (b: CatalogFilterBlockApi) => {
    setCreating(false);
    setEditingId(b.id);
    setName(b.name ?? '');
    setCategoryId(b.categoryId);
    setIncludeDescendants(b.includeDescendants);
    setIsActive(b.isActive);
    setBlockSortOrder(b.sortOrder ?? 0);
    setFormItems(b.items?.length ? blockToFormItems(b.items) : [emptyFormItem(0)]);
  };

  const buildPayload = () => {
    const items = formItems.map((it, index) => {
      const manualLines = it.manualOptionOrderText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const base = {
        kind: it.kind,
        attributeId:
          it.kind === 'ATTRIBUTE' && it.attributeId.trim() ? it.attributeId.trim() : undefined,
        labelOverride: it.labelOverride.trim() || undefined,
        sortOrder: Number.isFinite(it.sortOrder) ? it.sortOrder : index,
      };
      if (it.kind !== 'ATTRIBUTE') return base;
      return {
        ...base,
        optionsSort: it.optionsSort,
        ...(it.optionsSort === 'MANUAL' ? { manualOptionOrder: manualLines } : {}),
      };
    });
    return {
      name: name.trim() || undefined,
      categoryId,
      includeDescendants,
      isActive,
      sortOrder: blockSortOrder,
      items,
    };
  };

  const validateForm = (): string | null => {
    if (!categoryId.trim()) return 'Выберите категорию';
    for (const it of formItems) {
      if (it.kind === 'ATTRIBUTE' && !it.attributeId.trim()) {
        return 'Для фильтра «Атрибут» выберите атрибут из списка';
      }
    }
    let stock = 0;
    let mfr = 0;
    for (const it of formItems) {
      if (it.kind === 'STOCK') stock++;
      if (it.kind === 'MANUFACTURER') mfr++;
    }
    if (stock > 1) return 'Не более одного фильтра «Наличие»';
    if (mfr > 1) return 'Не более одного фильтра «Производитель»';
    return null;
  };

  const handleSave = async () => {
    const v = validateForm();
    if (v) {
      alert(v);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const url =
        editingId != null
          ? `${API_URL}/admin/catalog-filter-blocks/${editingId}`
          : `${API_URL}/admin/catalog-filter-blocks`;
      const res = await fetch(url, {
        method: editingId != null ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Ошибка ${res.status}`);
      }
      await loadBlocks();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить блок фильтров для этой категории?')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/catalog-filter-blocks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Не удалось удалить');
      await loadBlocks();
      if (editingId === id) resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = (c: FlatCategory) => {
    const prefix = c.parent ? `${c.parent.name} → ` : '';
    return `${prefix}${c.name}`;
  };

  const updateItem = (key: string, patch: Partial<FormItem>) => {
    setFormItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.kind != null && patch.kind !== 'ATTRIBUTE') {
          next.attributeId = '';
          next.optionsSort = 'NUMERIC_DESC';
          next.manualOptionOrderText = '';
        }
        if (patch.optionsSort != null && patch.optionsSort !== 'MANUAL') {
          next.manualOptionOrderText = '';
        }
        return next;
      })
    );
  };

  if (loading) {
    return <div className={baseStyles.section}>Загрузка...</div>;
  }

  return (
    <section className={baseStyles.section}>
      <h2 className={baseStyles.sectionTitle}>Блоки фильтров каталога</h2>
      <p className={baseStyles.sectionDescription}>
        Для каждой категории можно задать один блок: выберите категорию-якорь, при необходимости
        включите распространение на дочерние категории и добавьте фильтры — атрибуты из карточки
        этой категории, «Наличие» и «Производитель». На витрине применяется ближайший к открытой
        категории активный блок (по дереву вверх).
      </p>

      {error ? (
        <p className={baseStyles.sectionDescription} style={{ color: '#b91c1c' }}>
          {error}
        </p>
      ) : null}

      <div className={styles.toolbar}>
        <button type="button" className={styles.primaryBtn} onClick={startCreate} disabled={saving}>
          Добавить блок
        </button>
        {(creating || editingId) && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={resetForm}
            disabled={saving}
          >
            Отмена
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <div className={styles.formCard}>
          <h3 className={baseStyles.sectionTitle} style={{ marginTop: 0 }}>
            {editingId ? 'Редактирование блока' : 'Новый блок'}
          </h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="cfb-name">Название (для списка в админке)</label>
              <input
                id="cfb-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Двери — витрина"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="cfb-cat">Категория-якорь *</label>
              <select
                id="cfb-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">— выберите —</option>
                {flatCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="cfb-sort">Порядок (между блоками)</label>
              <input
                id="cfb-sort"
                type="number"
                min={0}
                value={blockSortOrder}
                onChange={(e) => setBlockSortOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={includeDescendants}
                onChange={(e) => setIncludeDescendants(e.target.checked)}
              />
              Распространять на дочерние категории
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Блок активен
            </label>
          </div>

          <h4 className={styles.itemsTitle}>Фильтры (порядок секций = порядок на сайте)</h4>
          <p className={styles.muted} style={{ marginBottom: '0.75rem' }}>
            Для фильтров по атрибуту можно задать порядок значений внутри секции (например толщина:
            от большей к меньшей) или перечислить значения вручную — строки должны совпадать с
            данными в карточке товара.
          </p>
          {formItems.map((it) => (
            <div key={it.key} className={styles.itemBlock}>
              <div className={styles.itemRow}>
                <div className={styles.formField}>
                  <label>Тип</label>
                  <select
                    value={it.kind}
                    onChange={(e) => updateItem(it.key, { kind: e.target.value as FilterKind })}
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {it.kind === 'ATTRIBUTE' ? (
                  <div className={styles.formField}>
                    <label>Атрибут категории *</label>
                    <select
                      value={it.attributeId}
                      onChange={(e) => updateItem(it.key, { attributeId: e.target.value })}
                    >
                      <option value="">— выберите —</option>
                      {categoryAttrs.map((row) => (
                        <option key={row.attribute.id} value={row.attribute.id}>
                          {row.attribute.name} ({row.attribute.slug})
                        </option>
                      ))}
                    </select>
                    {!categoryId ? (
                      <span className={styles.muted}>Сначала выберите категорию выше.</span>
                    ) : categoryAttrs.length === 0 ? (
                      <span className={styles.muted}>
                        У категории нет атрибутов. Добавьте их в разделе категорий.
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.formField}>
                    <span className={styles.muted}>—</span>
                  </div>
                )}
                <div className={styles.formField}>
                  <label>Подпись на сайте (необяз.)</label>
                  <input
                    type="text"
                    value={it.labelOverride}
                    onChange={(e) => updateItem(it.key, { labelOverride: e.target.value })}
                    placeholder="По умолчанию — имя атрибута"
                  />
                </div>
                <div className={styles.formField}>
                  <label>Порядок секции</label>
                  <input
                    type="number"
                    min={0}
                    value={it.sortOrder}
                    onChange={(e) =>
                      updateItem(it.key, { sortOrder: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
                <button
                  type="button"
                  className={styles.dangerBtn}
                  title="Удалить строку"
                  onClick={() =>
                    setFormItems((prev) =>
                      prev.length <= 1 ? prev : prev.filter((x) => x.key !== it.key)
                    )
                  }
                >
                  ×
                </button>
              </div>
              {it.kind === 'ATTRIBUTE' ? (
                <div className={styles.itemOptionsRow}>
                  <div className={styles.formField}>
                    <label>Порядок значений внутри фильтра</label>
                    <select
                      value={it.optionsSort}
                      onChange={(e) =>
                        updateItem(it.key, { optionsSort: e.target.value as OptionsSort })
                      }
                    >
                      {OPTIONS_SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {it.optionsSort === 'MANUAL' ? (
                    <div className={styles.formField}>
                      <label>Одно значение на строку (как в товаре)</label>
                      <textarea
                        value={it.manualOptionOrderText}
                        onChange={(e) =>
                          updateItem(it.key, { manualOptionOrderText: e.target.value })
                        }
                        placeholder={'100 мм\n80 мм\n40 мм'}
                        spellCheck={false}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setFormItems((prev) => [...prev, emptyFormItem(prev.length)])}
            >
              + Добавить фильтр
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Категория</th>
              <th>Дочерние</th>
              <th>Активен</th>
              <th>Фильтров</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.muted}>
                  Блоков пока нет. Нажмите «Добавить блок».
                </td>
              </tr>
            ) : (
              blocks.map((b) => (
                <tr key={b.id}>
                  <td>{b.name?.trim() || '—'}</td>
                  <td>
                    {b.category?.name}
                    <div className={styles.muted}>{b.category?.slug}</div>
                  </td>
                  <td>{b.includeDescendants ? 'да' : 'нет'}</td>
                  <td>{b.isActive ? 'да' : 'нет'}</td>
                  <td>{b.items?.length ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => startEdit(b)}
                      disabled={saving}
                    >
                      Изменить
                    </button>{' '}
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={() => handleDelete(b.id)}
                      disabled={saving}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
