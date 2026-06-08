'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type AdminHubPreviewProductRef,
  type AdminHubPreviewSectionInput,
  getAdminCatalogHubPreview,
  updateAdminCatalogHubPreview,
} from '@/shared/api/admin-catalog-hub-preview';
import {
  type AdminProductListItem,
  fetchAdminProductsList,
} from '@/shared/api/admin-products-list';

import sectionStyles from './CatalogHubPreviewSection.module.css';

type PickMode = 'featured' | 'new';

interface EditableSection {
  localKey: string;
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
  featuredProducts: AdminHubPreviewProductRef[];
  newProducts: AdminHubPreviewProductRef[];
}

function createEmptySection(sortOrder: number): EditableSection {
  return {
    localKey: `new-${Date.now()}-${sortOrder}`,
    categoryId: '',
    sortOrder,
    isActive: true,
    featuredProducts: [],
    newProducts: [],
  };
}

function ProductPickEditor({
  title,
  mode,
  categoryId,
  products,
  getAuthHeaders,
  onChange,
}: {
  title: string;
  mode: PickMode;
  categoryId: string;
  products: AdminHubPreviewProductRef[];
  getAuthHeaders: () => Record<string, string>;
  onChange: (products: AdminHubPreviewProductRef[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminProductListItem[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetchAdminProductsList(
        {
          search: search.trim(),
          categoryId: categoryId || undefined,
          isActive: true,
          limit: 15,
          page: 1,
        },
        getAuthHeaders()
      );
      setResults(response.data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [categoryId, getAuthHeaders, search]);

  const addProduct = (item: AdminProductListItem) => {
    if (products.some((p) => p.id === item.id)) return;
    onChange([
      ...products,
      { id: item.id, name: item.name, sku: item.sku, isActive: item.isActive },
    ]);
    setResults([]);
    setSearch('');
  };

  const removeProduct = (productId: string) => {
    onChange(products.filter((p) => p.id !== productId));
  };

  return (
    <div className={sectionStyles.pickBlock}>
      <h4 className={sectionStyles.pickBlockTitle}>{title}</h4>
      {products.length === 0 ? (
        <p className={sectionStyles.emptyPick}>
          Товары не выбраны — на витрине подберутся автоматически (
          {mode === 'featured' ? 'популярные' : 'новинки'}).
        </p>
      ) : (
        <div className={sectionStyles.pickList}>
          {products.map((product, index) => (
            <div key={product.id} className={sectionStyles.pickItem}>
              <div>
                <div className={sectionStyles.pickItemName}>
                  {index + 1}. {product.name}
                </div>
                {product.sku ? (
                  <div className={sectionStyles.pickItemMeta}>Артикул: {product.sku}</div>
                ) : null}
              </div>
              <button
                type="button"
                className={sectionStyles.secondaryButton}
                onClick={() => removeProduct(product.id)}
              >
                Убрать
              </button>
            </div>
          ))}
        </div>
      )}
      <div className={sectionStyles.searchRow}>
        <input
          type="search"
          className={`${sectionStyles.input} ${sectionStyles.searchInput}`}
          placeholder="Поиск товара по названию или артикулу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void runSearch();
            }
          }}
        />
        <button
          type="button"
          className={sectionStyles.secondaryButton}
          onClick={() => void runSearch()}
          disabled={searching || !search.trim()}
        >
          {searching ? 'Поиск…' : 'Найти'}
        </button>
      </div>
      {results.length > 0 ? (
        <div className={sectionStyles.searchResults}>
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className={sectionStyles.searchResultItem}
              onClick={() => addProduct(item)}
            >
              <span>{item.name}</span>
              <span className={sectionStyles.pickItemMeta}>{item.sku || item.category.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CatalogHubPreviewSection() {
  const { getAuthHeaders } = useAuth();
  const [productsPerGroup, setProductsPerGroup] = useState(6);
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminCatalogHubPreview(getAuthHeaders());
      setProductsPerGroup(data.productsPerGroup);
      setAvailableCategories(data.availableCategories);
      setSections(
        data.sections.map((section, index) => ({
          localKey: section.id,
          categoryId: section.categoryId,
          sortOrder: section.sortOrder ?? index,
          isActive: section.isActive,
          featuredProducts: section.featuredProducts,
          newProducts: section.newProducts,
        }))
      );
    } catch (error) {
      console.error(error);
      showMessage('error', 'Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const addSection = () => {
    if (sections.length >= 4) {
      showMessage('error', 'Максимум 4 раздела в превью');
      return;
    }
    setSections((prev) => [...prev, createEmptySection(prev.length)]);
  };

  const removeSection = (localKey: string) => {
    setSections((prev) =>
      prev
        .filter((section) => section.localKey !== localKey)
        .map((section, index) => ({ ...section, sortOrder: index }))
    );
  };

  const moveSection = (localKey: string, direction: -1 | 1) => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.localKey === localKey);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next.map((section, sortOrder) => ({ ...section, sortOrder }));
    });
  };

  const updateSection = (localKey: string, patch: Partial<EditableSection>) => {
    setSections((prev) =>
      prev.map((section) => (section.localKey === localKey ? { ...section, ...patch } : section))
    );
  };

  const handleSave = async () => {
    const payloadSections: AdminHubPreviewSectionInput[] = sections
      .filter((section) => section.categoryId)
      .map((section, index) => ({
        categoryId: section.categoryId,
        sortOrder: index,
        isActive: section.isActive,
        featuredProductIds: section.featuredProducts.map((p) => p.id),
        newProductIds: section.newProducts.map((p) => p.id),
      }));

    if (payloadSections.length === 0) {
      showMessage('error', 'Добавьте хотя бы один раздел с выбранной категорией');
      return;
    }

    setSaving(true);
    try {
      const data = await updateAdminCatalogHubPreview(getAuthHeaders(), {
        productsPerGroup,
        sections: payloadSections,
      });
      setProductsPerGroup(data.productsPerGroup);
      setAvailableCategories(data.availableCategories);
      setSections(
        data.sections.map((section, index) => ({
          localKey: section.id,
          categoryId: section.categoryId,
          sortOrder: section.sortOrder ?? index,
          isActive: section.isActive,
          featuredProducts: section.featuredProducts,
          newProducts: section.newProducts,
        }))
      );
      showMessage('success', 'Настройки сохранены');
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Загрузка…</p>;
  }

  const usedCategoryIds = new Set(sections.map((section) => section.categoryId).filter(Boolean));

  return (
    <div>
      {message ? (
        <div
          className={`${sectionStyles.toast} ${
            message.type === 'success' ? sectionStyles.toastSuccess : sectionStyles.toastError
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className={sectionStyles.formRow}>
        <label htmlFor="productsPerGroup">Товаров в каждом разделе</label>
        <input
          id="productsPerGroup"
          type="number"
          min={1}
          max={12}
          className={sectionStyles.numberInput}
          value={productsPerGroup}
          onChange={(e) => setProductsPerGroup(Number(e.target.value) || 6)}
        />
        <p className={sectionStyles.hint}>От 1 до 12 карточек в строке превью (по умолчанию 6).</p>
      </div>

      <div className={sectionStyles.toolbar}>
        <button
          type="button"
          className={sectionStyles.secondaryButton}
          onClick={addSection}
          disabled={sections.length >= 4}
        >
          Добавить раздел
        </button>
      </div>

      <div className={sectionStyles.sectionList}>
        {sections.length === 0 ? (
          <p className={sectionStyles.hint}>
            Разделы не настроены — на сайте покажутся первые 4 корневые категории с автоподбором
            товаров.
          </p>
        ) : null}

        {sections.map((section, index) => {
          const categoryName =
            availableCategories.find((c) => c.id === section.categoryId)?.name ||
            `Раздел ${index + 1}`;

          return (
            <article key={section.localKey} className={sectionStyles.sectionCard}>
              <div className={sectionStyles.sectionCardHeader}>
                <h3 className={sectionStyles.sectionCardTitle}>{categoryName}</h3>
                <div className={sectionStyles.sectionControls}>
                  <button
                    type="button"
                    className={sectionStyles.secondaryButton}
                    onClick={() => moveSection(section.localKey, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={sectionStyles.secondaryButton}
                    onClick={() => moveSection(section.localKey, 1)}
                    disabled={index === sections.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={sectionStyles.secondaryButton}
                    onClick={() => removeSection(section.localKey)}
                  >
                    Удалить
                  </button>
                </div>
              </div>

              <div className={sectionStyles.formRow}>
                <label>Категория раздела</label>
                <select
                  className={sectionStyles.select}
                  value={section.categoryId}
                  onChange={(e) => updateSection(section.localKey, { categoryId: e.target.value })}
                >
                  <option value="">— Выберите категорию —</option>
                  {availableCategories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      disabled={
                        category.id !== section.categoryId && usedCategoryIds.has(category.id)
                      }
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={section.isActive}
                  onChange={(e) => updateSection(section.localKey, { isActive: e.target.checked })}
                />
                Показывать на витрине
              </label>

              <ProductPickEditor
                title="Популярное — ручной подбор"
                mode="featured"
                categoryId={section.categoryId}
                products={section.featuredProducts}
                getAuthHeaders={getAuthHeaders}
                onChange={(featuredProducts) =>
                  updateSection(section.localKey, { featuredProducts })
                }
              />

              <ProductPickEditor
                title="Новинки — ручной подбор"
                mode="new"
                categoryId={section.categoryId}
                products={section.newProducts}
                getAuthHeaders={getAuthHeaders}
                onChange={(newProducts) => updateSection(section.localKey, { newProducts })}
              />
            </article>
          );
        })}
      </div>

      <div className={sectionStyles.toolbar}>
        <button
          type="button"
          className={sectionStyles.saveButton}
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
