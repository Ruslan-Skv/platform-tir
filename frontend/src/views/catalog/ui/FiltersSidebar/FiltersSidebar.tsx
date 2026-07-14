'use client';

import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { buildAttrParamKey } from '@/views/catalog/lib/applyCatalogFilters';
import {
  type CategoryFilterOption,
  buildCategoryFilterGroups,
} from '@/views/catalog/lib/buildCategoryFilterOptions';
import type { CatalogFilterFacet } from '@/views/catalog/lib/catalogFilters.types';
import { newURLSearchParamsLive } from '@/views/catalog/lib/newURLSearchParamsLive';

import { CatalogFilterSection } from './CatalogFilterSection';
import styles from './FiltersSidebar.module.css';
import {
  FILTERS_PRICE_STEP,
  clampCatalogPriceRange,
  clearCatalogFilterKeys,
  formatFilterOptionLabel,
  formatPriceInput,
  normalizePriceInput,
  parsePriceInput,
} from './filters-sidebar-utils';

export type { CategoryFilterOption };

export interface FiltersSidebarProps {
  /** На мобильных: открыта ли панель (оверлей) */
  mobileOpen?: boolean;
  /** Закрыть панель фильтров (для мобильных) */
  onClose?: () => void;
  filters: CatalogFilterFacet[];
  loading?: boolean;
  priceBounds?: { min: number; max: number } | null;
  /** Подкатегории по текущей выборке товаров (из сетки); пусто — блок не показываем */
  categoryOptions?: CategoryFilterOption[];
  /**
   * Страница «весь каталог» (/catalog/products): родительские категории — радио,
   * выбор задаёт ?branch=slug и подгружает фасеты категории; подкатегории остаются чекбоксами.
   */
  parentCategoryRadioMode?: boolean;
  /**
   * Страница категории (/catalog/products/[slug]): переключение раздела — переход на другой slug.
   */
  categoryPageBranchMode?: boolean;
  /** Корневые разделы каталога (с хаба) для categoryPageBranchMode */
  catalogBranchOptions?: CategoryFilterOption[];
  /** Текущий выбранный корневой раздел на странице категории */
  activeCatalogBranchSlug?: string | null;
  /**
   * Уникальный суффикс для name у радио (на странице два экземпляра сайдбара — десктоп и мобильный drawer).
   * Без него все радио с одним name образуют одну группу в документе и ломают отображение :checked.
   */
  catalogBranchRadioGroupSuffix?: string;
}

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  mobileOpen,
  onClose,
  filters,
  loading,
  priceBounds,
  categoryOptions = [],
  parentCategoryRadioMode = false,
  categoryPageBranchMode = false,
  catalogBranchOptions = [],
  activeCatalogBranchSlug = null,
  catalogBranchRadioGroupSuffix = 'main',
}) => {
  const branchRadioName = `catalog-parent-branch-${catalogBranchRadioGroupSuffix}`;
  const categoryPageBranchRadioName = `catalog-page-branch-${catalogBranchRadioGroupSuffix}`;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const branchFromUrl = searchParams.get('branch')?.trim() || null;
  /** Пока Next.js обновляет URL после router.replace, держим выбранную ветку здесь — иначе радио «заливается» только со 2-го клика */
  const [branchDisplayPending, setBranchDisplayPending] = useState<string | null | undefined>(
    undefined
  );
  const displayCatalogBranch: string | null =
    branchDisplayPending !== undefined ? branchDisplayPending : branchFromUrl;

  useEffect(() => {
    if (branchDisplayPending === undefined) return;
    if (branchFromUrl === branchDisplayPending) {
      setBranchDisplayPending(undefined);
    }
  }, [branchFromUrl, branchDisplayPending]);

  useEffect(() => {
    if (!parentCategoryRadioMode) {
      setBranchDisplayPending(undefined);
    }
  }, [parentCategoryRadioMode]);

  /** push — чтобы «Назад» в браузере возвращал к предыдущему состоянию фильтров. */
  const navigateParams = useCallback(
    (mutate: (p: URLSearchParams) => void, mode: 'push' | 'replace' = 'push') => {
      const next = newURLSearchParamsLive(pathname, searchParams.toString());
      mutate(next);
      const q = next.toString();
      const url = q ? `${pathname}?${q}` : pathname;
      if (mode === 'replace') {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  const navigateCategoryPageBranch = useCallback(
    (slug: string | null) => {
      const path = slug ? `/catalog/products/${slug}` : '/catalog/products';
      router.push(path);
    },
    [router]
  );

  /** Режим «весь каталог»: выбор родительской ветки + сброс прочих фильтров и пагинации */
  const selectCatalogBranch = useCallback(
    (slug: string | null) => {
      const slugNorm = slug?.trim() || null;
      if (parentCategoryRadioMode) {
        setBranchDisplayPending(slugNorm);
      }
      navigateParams((p) => {
        clearCatalogFilterKeys(p);
        if (slugNorm) {
          p.set('branch', slugNorm);
          p.append('cat', slugNorm);
        }
      });
    },
    [parentCategoryRadioMode, navigateParams]
  );

  /** После blur ждём, пока selected* из URL догонит clamp — иначе эффект перезапишет поле старым числом. */
  const pendingMinRef = useRef<number | null>(null);
  const pendingMaxRef = useRef<number | null>(null);

  const handleClear = useCallback(() => {
    pendingMinRef.current = null;
    pendingMaxRef.current = null;
    setBranchDisplayPending(undefined);
    navigateParams((p) => clearCatalogFilterKeys(p));
  }, [navigateParams]);

  const attrKey = useCallback((filterId: string) => buildAttrParamKey(filterId), []);

  const isAttrChecked = useCallback(
    (filterId: string, value: string) => {
      return searchParams.getAll(attrKey(filterId)).includes(value);
    },
    [attrKey, searchParams]
  );

  const toggleAttr = useCallback(
    (filterId: string, value: string, checked: boolean) => {
      const key = attrKey(filterId);
      navigateParams((p) => {
        const prev = p.getAll(key);
        p.delete(key);
        const merged = checked
          ? [...prev.filter((x) => x !== value), value]
          : prev.filter((x) => x !== value);
        merged.forEach((v) => p.append(key, v));
        p.delete('page');
      });
    },
    [attrKey, navigateParams]
  );

  const isMfrChecked = useCallback(
    (id: string) => searchParams.getAll('mfr').includes(id),
    [searchParams]
  );

  const toggleMfr = useCallback(
    (id: string, checked: boolean) => {
      navigateParams((p) => {
        const prev = p.getAll('mfr');
        p.delete('mfr');
        const merged = checked
          ? [...prev.filter((x) => x !== id), id]
          : prev.filter((x) => x !== id);
        merged.forEach((v) => p.append('mfr', v));
        p.delete('page');
      });
    },
    [navigateParams]
  );

  const isCatChecked = useCallback(
    (slug: string) => {
      const n = slug.trim();
      return searchParams.getAll('cat').some((x) => x.trim() === n);
    },
    [searchParams]
  );

  const selectAllCategories = useCallback(() => {
    navigateParams((p) => {
      p.delete('cat');
      for (const opt of categoryOptions) {
        p.append('cat', opt.slug);
      }
      p.delete('page');
    });
  }, [navigateParams, categoryOptions]);

  const clearAllCategories = useCallback(() => {
    navigateParams((p) => {
      p.delete('cat');
      p.delete('page');
    });
  }, [navigateParams]);

  const categoryBulkState = useMemo(() => {
    const selected = new Set(searchParams.getAll('cat'));
    if (categoryOptions.length === 0) {
      return { allSelected: false, noneSelected: true };
    }
    const allSelected =
      categoryOptions.every((o) => selected.has(o.slug)) &&
      selected.size === categoryOptions.length;
    const noneSelected = selected.size === 0;
    return { allSelected, noneSelected };
  }, [searchParams, categoryOptions]);

  const isAvailChecked = useCallback(
    (value: string) => searchParams.getAll('avail').includes(value),
    [searchParams]
  );

  const toggleAvail = useCallback(
    (value: string, checked: boolean) => {
      navigateParams((p) => {
        const prev = p.getAll('avail');
        p.delete('avail');
        const merged = checked
          ? [...prev.filter((x) => x !== value), value]
          : prev.filter((x) => x !== value);
        merged.forEach((v) => p.append('avail', v));
        p.delete('page');
      });
    },
    [navigateParams]
  );

  const hasActiveFilters = useMemo(() => {
    for (const k of searchParams.keys()) {
      if (
        k.startsWith('attr_') ||
        k === 'avail' ||
        k === 'mfr' ||
        k === 'price_min' ||
        k === 'price_max' ||
        k === 'cat' ||
        k === 'branch'
      )
        return true;
    }
    return false;
  }, [searchParams]);

  const rawPriceMin = searchParams.get('price_min');
  const rawPriceMax = searchParams.get('price_max');
  const parsedMin = rawPriceMin != null && rawPriceMin !== '' ? Number(rawPriceMin) : Number.NaN;
  const parsedMax = rawPriceMax != null && rawPriceMax !== '' ? Number(rawPriceMax) : Number.NaN;
  const defaultMin = priceBounds?.min ?? 0;
  const defaultMax = priceBounds?.max ?? 0;
  const selectedMin = Number.isFinite(parsedMin) ? parsedMin : defaultMin;
  const selectedMax = Number.isFinite(parsedMax) ? parsedMax : defaultMax;
  const priceSpread = Math.max(1, defaultMax - defaultMin);
  const minPct = ((selectedMin - defaultMin) / priceSpread) * 100;
  const maxPct = ((selectedMax - defaultMin) / priceSpread) * 100;
  const [priceMinInput, setPriceMinInput] = useState(() => formatPriceInput(selectedMin));
  const [priceMaxInput, setPriceMaxInput] = useState(() => formatPriceInput(selectedMax));
  const [priceMinFocused, setPriceMinFocused] = useState(false);
  const [priceMaxFocused, setPriceMaxFocused] = useState(false);

  /** Сворачивание секций: по умолчанию развёрнуто (ключ отсутствует или не false) */
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});

  /** Развёрнуты ли дочерние категории у родителя (по умолчанию все свёрнуты) */
  const [expandedCategoryParents, setExpandedCategoryParents] = useState<Record<string, boolean>>(
    {}
  );

  /** Порядок slug в списке может меняться при пересчёте — сортируем, чтобы не дёргать expanded без нужды */
  const categoryOptionsFingerprint = useMemo(
    () =>
      [...categoryOptions]
        .map((o) => o.slug)
        .sort()
        .join('\0'),
    [categoryOptions]
  );

  useEffect(() => {
    if (parentCategoryRadioMode) return;
    setExpandedCategoryParents({});
  }, [categoryOptionsFingerprint, parentCategoryRadioMode]);

  const categoryGroups = useMemo(
    () => buildCategoryFilterGroups(categoryOptions),
    [categoryOptions]
  );

  const toggleCat = useCallback(
    (slug: string, checked: boolean) => {
      const slugNorm = slug.trim();
      /** В режиме ветки в cat кладётся slug родителя — он матчит всех детей по parentCategorySlug, поэтому без снятия родителя чекбоксы подкатегорий на фильтр не влияют. */
      const branchForNarrow =
        parentCategoryRadioMode && displayCatalogBranch?.trim()
          ? displayCatalogBranch.trim()
          : null;

      navigateParams((p) => {
        const prev = p
          .getAll('cat')
          .map((x) => x.trim())
          .filter(Boolean);
        p.delete('cat');
        let merged: string[];

        if (checked) {
          merged = [...prev.filter((x) => x !== slugNorm), slugNorm];
          if (branchForNarrow && slugNorm !== branchForNarrow && merged.includes(branchForNarrow)) {
            merged = merged.filter((x) => x !== branchForNarrow);
          }
        } else {
          merged = prev.filter((x) => x !== slugNorm);
        }

        if (branchForNarrow && merged.length === 0) {
          merged = [branchForNarrow];
        }

        merged.forEach((v) => p.append('cat', v));
        for (const key of [...p.keys()]) {
          if (key.startsWith('attr_')) p.delete(key);
        }
        p.delete('avail');
        p.delete('mfr');
        p.delete('page');
      });
    },
    [navigateParams, parentCategoryRadioMode, displayCatalogBranch]
  );

  const toggleCategoryParentExpanded = useCallback((parentSlug: string) => {
    setExpandedCategoryParents((prev) => ({
      ...prev,
      [parentSlug]: !prev[parentSlug],
    }));
  }, []);

  const isSectionOpen = useCallback(
    (id: string) => sectionExpanded[id] !== false,
    [sectionExpanded]
  );

  const toggleSection = useCallback((id: string) => {
    setSectionExpanded((prev) => {
      const open = prev[id] !== false;
      return { ...prev, [id]: !open };
    });
  }, []);

  /** Сброс price_* из URL, если диапазон не пересекается с ценами текущей ветки (типично после смены категории). */
  useEffect(() => {
    if (!priceBounds) return;
    const rawMin = searchParams.get('price_min');
    const rawMax = searchParams.get('price_max');
    if (rawMin == null && rawMax == null) return;
    const parsedMin = rawMin != null && rawMin !== '' ? Number(rawMin) : null;
    const parsedMax = rawMax != null && rawMax !== '' ? Number(rawMax) : null;
    const min = parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null;
    const max = parsedMax != null && Number.isFinite(parsedMax) ? parsedMax : null;
    const disjoint =
      (min != null && min > priceBounds.max) ||
      (max != null && max < priceBounds.min) ||
      (min != null && max != null && min > max);
    if (!disjoint) return;
    navigateParams((p) => {
      p.delete('price_min');
      p.delete('price_max');
      p.delete('page');
    }, 'replace');
  }, [priceBounds, searchParams, navigateParams]);

  /** Пока поле в фокусе — не подставляем значение из URL/слайдера, иначе ввод ломается (цифры «дописываются»). */
  useEffect(() => {
    if (!priceMinFocused) {
      if (pendingMinRef.current != null && selectedMin !== pendingMinRef.current) {
        // URL ещё со старым price_min — не трогаем локальное значение из commit
      } else {
        if (pendingMinRef.current != null && selectedMin === pendingMinRef.current) {
          pendingMinRef.current = null;
        }
        setPriceMinInput(formatPriceInput(selectedMin));
      }
    }
    if (!priceMaxFocused) {
      if (pendingMaxRef.current != null && selectedMax !== pendingMaxRef.current) {
        //
      } else {
        if (pendingMaxRef.current != null && selectedMax === pendingMaxRef.current) {
          pendingMaxRef.current = null;
        }
        setPriceMaxInput(formatPriceInput(selectedMax));
      }
    }
  }, [selectedMin, selectedMax, priceMinFocused, priceMaxFocused]);

  const setPriceRange = useCallback(
    (nextMin: number, nextMax: number) => {
      navigateParams((p) => {
        p.delete('price_min');
        p.delete('price_max');
        if (!priceBounds) return;
        const { min: clampedMin, max: clampedMax } = clampCatalogPriceRange(
          priceBounds,
          nextMin,
          nextMax
        );
        if (clampedMin > priceBounds.min) p.set('price_min', String(clampedMin));
        if (clampedMax < priceBounds.max) p.set('price_max', String(clampedMax));
        p.delete('page');
      });
    },
    [priceBounds, navigateParams]
  );

  /** Мобильный оверлей: зафиксировать цену из полей ввода и закрыть панель */
  const applyMobileFilters = useCallback(() => {
    if (priceBounds) {
      const parsedMin = parsePriceInput(priceMinInput) ?? priceBounds.min;
      const parsedMax = parsePriceInput(priceMaxInput) ?? priceBounds.max;
      const { min, max } = clampCatalogPriceRange(priceBounds, parsedMin, parsedMax);
      pendingMinRef.current = min;
      pendingMaxRef.current = max;
      setPriceMinInput(formatPriceInput(min));
      setPriceMaxInput(formatPriceInput(max));
      setPriceRange(min, max);
    }
    onClose?.();
  }, [onClose, priceBounds, priceMaxInput, priceMinInput, setPriceRange]);

  const commitPriceMin = useCallback(() => {
    if (!priceBounds) return;
    const parsed = parsePriceInput(priceMinInput);
    const nextMin = parsed ?? priceBounds.min;
    const { min } = clampCatalogPriceRange(priceBounds, nextMin, selectedMax);
    pendingMinRef.current = min;
    setPriceMinInput(formatPriceInput(min));
    setPriceRange(nextMin, selectedMax);
  }, [priceBounds, priceMinInput, selectedMax, setPriceRange]);

  const commitPriceMax = useCallback(() => {
    if (!priceBounds) return;
    const parsed = parsePriceInput(priceMaxInput);
    const nextMax = parsed ?? priceBounds.max;
    const { max } = clampCatalogPriceRange(priceBounds, selectedMin, nextMax);
    pendingMaxRef.current = max;
    setPriceMaxInput(formatPriceInput(max));
    setPriceRange(selectedMin, nextMax);
  }, [priceBounds, priceMaxInput, selectedMin, setPriceRange]);

  const renderFacet = (facet: CatalogFilterFacet) => {
    if (facet.id === 'availability') {
      return (
        <CatalogFilterSection
          key={facet.id}
          sectionId={facet.id}
          title={facet.label}
          isOpen={isSectionOpen(facet.id)}
          onToggle={() => toggleSection(facet.id)}
        >
          <div className={styles.options}>
            {facet.options.map((opt) => (
              <label key={opt.value} className={styles.option}>
                <input
                  type="checkbox"
                  checked={isAvailChecked(opt.value)}
                  onChange={(e) => toggleAvail(opt.value, e.target.checked)}
                />
                <span className={styles.optionText}>
                  {formatFilterOptionLabel(opt.label, opt.count)}
                </span>
              </label>
            ))}
          </div>
        </CatalogFilterSection>
      );
    }

    // id «manufacturer» бывает и у блока MANUFACTURER (mfr=id), и у атрибута со slug manufacturer (attr_*).
    if (facet.id === 'manufacturer' && !facet.attributeSlug && facet.type === 'checkbox') {
      if (facet.options.length === 0) return null;
      return (
        <CatalogFilterSection
          key={facet.id}
          sectionId={facet.id}
          title={facet.label}
          isOpen={isSectionOpen(facet.id)}
          onToggle={() => toggleSection(facet.id)}
        >
          <div className={styles.options}>
            {facet.options.map((opt) => (
              <label key={opt.value} className={styles.option}>
                <input
                  type="checkbox"
                  checked={isMfrChecked(opt.value)}
                  onChange={(e) => toggleMfr(opt.value, e.target.checked)}
                />
                <span className={styles.optionText}>
                  {formatFilterOptionLabel(opt.label, opt.count)}
                </span>
              </label>
            ))}
          </div>
        </CatalogFilterSection>
      );
    }

    if (facet.type === 'checkbox' && facet.options.length > 0) {
      return (
        <CatalogFilterSection
          key={facet.id}
          sectionId={facet.id}
          title={facet.label}
          isOpen={isSectionOpen(facet.id)}
          onToggle={() => toggleSection(facet.id)}
        >
          <div className={styles.options}>
            {facet.options.map((opt) => (
              <label key={opt.value} className={styles.option}>
                <input
                  type="checkbox"
                  checked={isAttrChecked(facet.id, opt.value)}
                  onChange={(e) => toggleAttr(facet.id, opt.value, e.target.checked)}
                />
                <span className={styles.optionText}>
                  {formatFilterOptionLabel(opt.label, opt.count)}
                </span>
              </label>
            ))}
          </div>
        </CatalogFilterSection>
      );
    }

    if (facet.type === 'checkbox' && facet.options.length === 0) {
      return (
        <CatalogFilterSection
          key={facet.id}
          sectionId={facet.id}
          title={facet.label}
          isOpen={isSectionOpen(facet.id)}
          onToggle={() => toggleSection(facet.id)}
        >
          <p className={styles.emptyFacet}>Нет значений в этой категории</p>
        </CatalogFilterSection>
      );
    }

    return null;
  };

  /** На хабе фасеты и цена — только у выбранного раздела, не в «Все категории». */
  const showBranchFacetFilters = !parentCategoryRadioMode || displayCatalogBranch !== null;
  const effectivePriceBounds = showBranchFacetFilters ? priceBounds : null;
  const effectiveFilters = showBranchFacetFilters ? filters : [];

  /** Не схлопывать панель в «Загрузка…» при смене ветки: иначе колонка дергается, пока грузятся фасеты. */
  const showCompactLoadingOnly =
    loading &&
    effectiveFilters.length === 0 &&
    !effectivePriceBounds &&
    categoryOptions.length === 0;

  if (showCompactLoadingOnly) {
    return (
      <div
        className={`${styles.filtersSidebar} ${mobileOpen ? styles.filtersSidebarMobileOpen : ''}`}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Фильтры</h2>
        </div>
        <p className={styles.loadingHint}>Загрузка…</p>
      </div>
    );
  }

  if (
    !effectivePriceBounds &&
    effectiveFilters.length === 0 &&
    categoryOptions.length === 0 &&
    !(categoryPageBranchMode && catalogBranchOptions.length > 0)
  ) {
    return null;
  }

  return (
    <div
      className={`${styles.filtersSidebar} ${mobileOpen ? styles.filtersSidebarMobileOpen : ''}`}
      aria-busy={loading}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Фильтры</h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            disabled={!hasActiveFilters}
          >
            Сбросить
          </button>
          {onClose && (
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Закрыть фильтры"
            >
              <XMarkIcon className={styles.closeIcon} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.sections}>
        {effectivePriceBounds && effectivePriceBounds.max >= effectivePriceBounds.min ? (
          <CatalogFilterSection
            sectionId="price"
            title="Цена"
            isOpen={isSectionOpen('price')}
            onToggle={() => toggleSection('price')}
          >
            <div className={styles.priceInputs}>
              <label className={styles.priceInputLabel}>
                От
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceMinInput}
                  onChange={(e) => setPriceMinInput(normalizePriceInput(e.target.value))}
                  onFocus={() => setPriceMinFocused(true)}
                  onBlur={() => {
                    setPriceMinFocused(false);
                    commitPriceMin();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </label>
              <label className={styles.priceInputLabel}>
                До
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceMaxInput}
                  onChange={(e) => setPriceMaxInput(normalizePriceInput(e.target.value))}
                  onFocus={() => setPriceMaxFocused(true)}
                  onBlur={() => {
                    setPriceMaxFocused(false);
                    commitPriceMax();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </label>
            </div>
            <div className={styles.priceSliderWrap}>
              <div
                className={styles.priceSliderTrack}
                style={{
                  background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${minPct}%, #d90652 ${minPct}%, #d90652 ${maxPct}%, #e5e7eb ${maxPct}%, #e5e7eb 100%)`,
                }}
              />
              <input
                type="range"
                className={`${styles.priceRange} ${styles.priceRangeMin}`}
                min={effectivePriceBounds.min}
                max={effectivePriceBounds.max}
                step={FILTERS_PRICE_STEP}
                value={selectedMin}
                onChange={(e) => {
                  pendingMinRef.current = null;
                  pendingMaxRef.current = null;
                  setPriceRange(Number(e.target.value), selectedMax);
                }}
              />
              <input
                type="range"
                className={`${styles.priceRange} ${styles.priceRangeMax}`}
                min={effectivePriceBounds.min}
                max={effectivePriceBounds.max}
                step={FILTERS_PRICE_STEP}
                value={selectedMax}
                onChange={(e) => {
                  pendingMinRef.current = null;
                  pendingMaxRef.current = null;
                  setPriceRange(selectedMin, Number(e.target.value));
                }}
              />
            </div>
            <div className={styles.rangeValues}>
              <span>{selectedMin.toLocaleString('ru-RU')} ₽</span>
              <span>{selectedMax.toLocaleString('ru-RU')} ₽</span>
            </div>
          </CatalogFilterSection>
        ) : null}
        {categoryPageBranchMode && catalogBranchOptions.length > 0 ? (
          <CatalogFilterSection
            sectionId="catalog-branch"
            title="Раздел каталога"
            isOpen={isSectionOpen('catalog-branch')}
            onToggle={() => toggleSection('catalog-branch')}
          >
            <p className={styles.categoryRadioHint}>
              Перейдите в другой раздел каталога или вернитесь к обзору всех категорий.
            </p>
            <div className={styles.options}>
              <label className={`${styles.option} ${styles.categoryOptionParentLabel}`}>
                <input
                  type="radio"
                  name={categoryPageBranchRadioName}
                  checked={false}
                  onChange={() => navigateCategoryPageBranch(null)}
                />
                <span className={styles.optionText}>Все категории</span>
              </label>
              {catalogBranchOptions.map((opt) => (
                <label
                  key={opt.slug}
                  className={`${styles.option} ${styles.categoryOptionParentLabel}`}
                >
                  <input
                    type="radio"
                    name={categoryPageBranchRadioName}
                    checked={activeCatalogBranchSlug === opt.slug}
                    onChange={() => navigateCategoryPageBranch(opt.slug)}
                  />
                  <span className={styles.optionText}>
                    {formatFilterOptionLabel(opt.label, opt.count)}
                  </span>
                </label>
              ))}
            </div>
          </CatalogFilterSection>
        ) : null}
        {categoryOptions.length > 0 ? (
          <CatalogFilterSection
            sectionId="category"
            title={categoryPageBranchMode ? 'Подкатегории' : 'Категории'}
            isOpen={isSectionOpen('category')}
            onToggle={() => toggleSection('category')}
          >
            {parentCategoryRadioMode ? (
              <p className={styles.categoryRadioHint}>
                Выберите раздел каталога — появятся все фильтры этой категории. Подкатегории можно
                уточнить чекбоксами только у выбранного раздела; при смене раздела сбрасывается
                выбор подкатегорий у предыдущего.
              </p>
            ) : null}
            {!parentCategoryRadioMode ? (
              <div className={styles.categoryBulkRow}>
                <button
                  type="button"
                  className={styles.categoryBulkBtn}
                  onClick={selectAllCategories}
                  disabled={categoryBulkState.allSelected}
                >
                  Выделить все
                </button>
                <span className={styles.categoryBulkSep} aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  className={styles.categoryBulkBtn}
                  onClick={clearAllCategories}
                  disabled={categoryBulkState.noneSelected}
                >
                  Сбросить все
                </button>
              </div>
            ) : null}
            <div className={styles.options}>
              {parentCategoryRadioMode ? (
                <label className={`${styles.option} ${styles.categoryOptionParentLabel}`}>
                  <input
                    type="radio"
                    name={branchRadioName}
                    checked={displayCatalogBranch === null}
                    onChange={() => selectCatalogBranch(null)}
                  />
                  <span className={styles.optionText}>Все категории</span>
                </label>
              ) : null}
              {categoryGroups.map((group) => {
                if (group.type === 'single') {
                  const opt = group.opt;
                  if (parentCategoryRadioMode && opt.depth !== 1) {
                    return (
                      <label
                        key={opt.slug}
                        className={`${styles.option} ${opt.depth === 0 ? styles.categoryOptionParentLabel : ''}`}
                      >
                        <input
                          type="radio"
                          name={branchRadioName}
                          checked={displayCatalogBranch === opt.slug}
                          onChange={() => selectCatalogBranch(opt.slug)}
                        />
                        <span
                          className={`${styles.optionText} ${opt.depth === 0 ? styles.categoryOptionParentLabel : ''}`}
                        >
                          {formatFilterOptionLabel(opt.label, opt.count)}
                        </span>
                      </label>
                    );
                  }
                  return (
                    <label
                      key={opt.slug}
                      className={`${styles.option} ${opt.depth === 1 ? styles.categoryOptionNested : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isCatChecked(opt.slug)}
                        onChange={(e) => toggleCat(opt.slug, e.target.checked)}
                      />
                      <span
                        className={`${styles.optionText} ${
                          opt.depth === 1
                            ? styles.categoryOptionNestedLabel
                            : opt.depth === 0 && !categoryPageBranchMode
                              ? styles.categoryOptionParentLabel
                              : ''
                        }`}
                      >
                        {formatFilterOptionLabel(opt.label, opt.count)}
                      </span>
                    </label>
                  );
                }
                const { parent, children } = group;
                const childrenExpanded = expandedCategoryParents[parent.slug] === true;
                const branchShowsChildren =
                  parentCategoryRadioMode && displayCatalogBranch === parent.slug;
                const showChildCheckboxes =
                  children.length > 0 &&
                  (branchShowsChildren || (!parentCategoryRadioMode && childrenExpanded));
                return (
                  <div key={parent.slug} className={styles.categoryParentGroup}>
                    <div className={styles.categoryParentRow}>
                      <label className={`${styles.option} ${styles.categoryParentLabelRow}`}>
                        {parentCategoryRadioMode ? (
                          <input
                            type="radio"
                            name={branchRadioName}
                            checked={displayCatalogBranch === parent.slug}
                            onChange={() => selectCatalogBranch(parent.slug)}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isCatChecked(parent.slug)}
                            onChange={(e) => toggleCat(parent.slug, e.target.checked)}
                          />
                        )}
                        <span
                          className={`${styles.optionText} ${styles.categoryOptionParentLabel}`}
                        >
                          {formatFilterOptionLabel(parent.label, parent.count)}
                        </span>
                      </label>
                      {!parentCategoryRadioMode && children.length > 0 ? (
                        <button
                          type="button"
                          className={styles.categoryExpandBtn}
                          aria-expanded={childrenExpanded}
                          aria-label={
                            childrenExpanded ? 'Свернуть подкатегории' : 'Развернуть подкатегории'
                          }
                          onClick={() => toggleCategoryParentExpanded(parent.slug)}
                        >
                          <ChevronDownIcon
                            className={`${styles.categoryExpandChevron} ${childrenExpanded ? styles.categoryExpandChevronOpen : ''}`}
                            aria-hidden
                          />
                        </button>
                      ) : null}
                    </div>
                    {showChildCheckboxes ? (
                      <div className={styles.categoryChildrenWrap}>
                        {children.map((opt) => {
                          const subCatInputId = `catalog-subcat-${catalogBranchRadioGroupSuffix}--${encodeURIComponent(parent.slug)}--${encodeURIComponent(opt.slug)}`;
                          return parentCategoryRadioMode ? (
                            <div
                              key={opt.slug}
                              className={`${styles.option} ${styles.categoryOptionNested}`}
                            >
                              <input
                                id={subCatInputId}
                                type="checkbox"
                                checked={isCatChecked(opt.slug)}
                                onChange={(e) => toggleCat(opt.slug, e.target.checked)}
                              />
                              <label
                                htmlFor={subCatInputId}
                                className={`${styles.optionText} ${styles.categoryOptionNestedLabel}`}
                              >
                                {formatFilterOptionLabel(opt.label, opt.count)}
                              </label>
                            </div>
                          ) : (
                            <label
                              key={opt.slug}
                              className={`${styles.option} ${styles.categoryOptionNested}`}
                            >
                              <input
                                type="checkbox"
                                checked={isCatChecked(opt.slug)}
                                onChange={(e) => toggleCat(opt.slug, e.target.checked)}
                              />
                              <span
                                className={`${styles.optionText} ${styles.categoryOptionNestedLabel}`}
                              >
                                {formatFilterOptionLabel(opt.label, opt.count)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CatalogFilterSection>
        ) : null}
        {effectiveFilters.map((f) => renderFacet(f))}
      </div>

      {onClose ? (
        <div className={styles.mobileApplyBar}>
          <button type="button" className={styles.mobileApplyButton} onClick={applyMobileFilters}>
            Применить
          </button>
        </div>
      ) : null}
    </div>
  );
};
