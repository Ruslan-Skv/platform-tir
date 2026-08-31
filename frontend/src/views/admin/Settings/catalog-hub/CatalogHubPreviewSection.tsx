'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

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
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

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
  onChange,
}: {
  title: string;
  mode: PickMode;
  categoryId: string;
  products: AdminHubPreviewProductRef[];
  onChange: (products: AdminHubPreviewProductRef[]) => void;
}) {
  const { getAuthHeaders } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminProductListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchRequestIdRef = useRef(0);

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setSearchError(null);
        setHasSearched(false);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      setSearching(true);
      setSearchError(null);
      setHasSearched(true);

      try {
        const response = await fetchAdminProductsList(
          {
            search: trimmed,
            limit: 20,
            page: 1,
          },
          getAuthHeaders()
        );

        if (requestId !== searchRequestIdRef.current) return;

        const pickedIds = new Set(products.map((p) => p.id));
        setResults(response.data.filter((item) => !pickedIds.has(item.id)));
      } catch (error) {
        if (requestId !== searchRequestIdRef.current) return;
        setResults([]);
        setSearchError(
          error instanceof Error ? error.message : 'Не удалось выполнить поиск товаров'
        );
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearching(false);
        }
      }
    },
    [getAuthHeaders, products]
  );

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(search);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, runSearch]);

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
              <AdminTableIconButton
                type="button"
                aria-label="Убрать товар"
                title="Убрать"
                onClick={() => removeProduct(product.id)}
              >
                <DeleteIcon />
              </AdminTableIconButton>
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
              void runSearch(search);
            }
          }}
        />
        <button
          type="button"
          className={sectionStyles.secondaryButton}
          onClick={() => void runSearch(search)}
          disabled={searching || !search.trim()}
        >
          {searching ? 'Поиск…' : 'Найти'}
        </button>
      </div>
      {categoryId ? (
        <p className={sectionStyles.hint}>
          Поиск по всему каталогу. Категория раздела задаёт заголовок блока на витрине.
        </p>
      ) : null}
      {searchError ? <p className={sectionStyles.searchError}>{searchError}</p> : null}
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
              <span className={sectionStyles.pickItemMeta}>
                {[item.sku, item.category.name].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      ) : hasSearched && !searching && !searchError ? (
        <p className={sectionStyles.searchEmpty}>Ничего не найдено. Попробуйте другой запрос.</p>
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
  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!message) return;
    if (message.type === 'success') {
      setSuccessText(message.text);
      setSuccessVisible(true);
      const timer = window.setTimeout(() => setSuccessVisible(false), 2800);
      setMessage(null);
      return () => window.clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
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
      showMessage('error', error instanceof Error ? error.message : 'Ошибка загрузки настроек');
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

  const busy = loading || saving;
  const activeCount = sections.filter((s) => s.isActive).length;
  const countTitle =
    sections.length === 0
      ? 'Автоподбор'
      : `${sections.length} разделов · ${activeCount} активных · ${productsPerGroup} в группе`;

  const usedCategoryIds = new Set(sections.map((section) => section.categoryId).filter(Boolean));

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={busy}
        busy={loading}
        title="Обновить настройки"
        aria-label={loading ? 'Обновление настроек' : 'Обновить настройки'}
        onClick={() => void load()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <Link className={cdChrome.backLink} href="/admin/settings">
        ← Настройки
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Превью каталога</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{sections.length}</span>
              </span>
              <AdminSaveNotice
                visible={successVisible}
                className={sectionStyles.headerSuccessNotice}
              >
                {successText}
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          {iconActions('desktop')}
        </div>
      </div>

      {message?.type === 'error' ? (
        <div className={`${sectionStyles.message} ${sectionStyles.messageerror}`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={`${cdHub.contractsListFiltersPanel} ${sectionStyles.helpPanel}`}>
        <p className={sectionStyles.helpText}>
          Блок превью каталога на главной: до 4 разделов с категориями и ручным подбором популярных
          товаров и новинок. Без настроек на сайте покажутся первые 4 корневые категории с
          автоподбором.
        </p>
      </div>

      {loading ? (
        <p className={sectionStyles.loading}>Загрузка…</p>
      ) : (
        <>
          <div className={cdHub.contractsListFiltersPanel}>
            <div className={sectionStyles.settingsRow}>
              <label className={sectionStyles.settingsField} htmlFor="productsPerGroup">
                Товаров в каждом разделе
                <input
                  id="productsPerGroup"
                  type="number"
                  min={1}
                  max={12}
                  className={sectionStyles.numberInput}
                  value={productsPerGroup}
                  onChange={(e) => setProductsPerGroup(Number(e.target.value) || 6)}
                />
              </label>
              <p className={sectionStyles.hint}>
                От 1 до 12 карточек в строке превью (по умолчанию 6).
              </p>
              <button
                data-admin-mutation
                type="button"
                className={sectionStyles.secondaryButton}
                onClick={addSection}
                disabled={busy || sections.length >= 4}
              >
                + Раздел
              </button>
            </div>
          </div>

          <div className={sectionStyles.sectionList}>
            {sections.length === 0 ? (
              <p className={sectionStyles.hint}>
                Разделы не настроены — на сайте покажутся первые 4 корневые категории с автоподбором
                товаров. Нажмите «+ Раздел», чтобы задать вручную.
              </p>
            ) : null}

            {sections.map((section, index) => {
              const categoryName =
                availableCategories.find((c) => c.id === section.categoryId)?.name ||
                `Раздел ${index + 1}`;

              return (
                <article key={section.localKey} className={sectionStyles.sectionCard}>
                  <div className={sectionStyles.sectionCardHeader}>
                    <div>
                      <h3 className={sectionStyles.sectionCardTitle}>{categoryName}</h3>
                      <span
                        className={`${sectionStyles.badge} ${
                          section.isActive ? sectionStyles.badgeActive : sectionStyles.badgeInactive
                        }`}
                      >
                        {section.isActive ? 'На витрине' : 'Скрыт'}
                      </span>
                    </div>
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
                      <AdminTableIconButton
                        data-admin-mutation
                        type="button"
                        aria-label="Удалить раздел"
                        title="Удалить раздел"
                        onClick={() => removeSection(section.localKey)}
                      >
                        <DeleteIcon />
                      </AdminTableIconButton>
                    </div>
                  </div>

                  <div className={sectionStyles.formRow}>
                    <label htmlFor={`hub-preview-category-${section.localKey}`}>
                      Категория раздела
                    </label>
                    <select
                      id={`hub-preview-category-${section.localKey}`}
                      className={sectionStyles.select}
                      value={section.categoryId}
                      onChange={(e) =>
                        updateSection(section.localKey, { categoryId: e.target.value })
                      }
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

                  <label className={sectionStyles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={section.isActive}
                      onChange={(e) =>
                        updateSection(section.localKey, { isActive: e.target.checked })
                      }
                    />
                    Показывать на витрине
                  </label>

                  <ProductPickEditor
                    title="Популярное — ручной подбор"
                    mode="featured"
                    categoryId={section.categoryId}
                    products={section.featuredProducts}
                    onChange={(featuredProducts) =>
                      updateSection(section.localKey, { featuredProducts })
                    }
                  />

                  <ProductPickEditor
                    title="Новинки — ручной подбор"
                    mode="new"
                    categoryId={section.categoryId}
                    products={section.newProducts}
                    onChange={(newProducts) => updateSection(section.localKey, { newProducts })}
                  />
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
