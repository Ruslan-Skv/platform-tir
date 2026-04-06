'use client';

import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { buildAttrParamKey } from '@/views/catalog/lib/applyCatalogFilters';
import type { CatalogFilterFacet } from '@/views/catalog/lib/catalogFilters.types';

import styles from './FiltersSidebar.module.css';

export interface CategoryFilterOption {
  slug: string;
  label: string;
  count?: number;
}

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
}

const PRICE_STEP = 100;

function formatFilterOptionLabel(label: string, count: number | undefined): string {
  if (count === undefined || !Number.isFinite(count)) return label;
  return `${label} (${count.toLocaleString('ru-RU')})`;
}

function formatPriceInput(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('ru-RU');
}

function normalizePriceInput(raw: string): string {
  return raw
    .replace(/[^\d\s]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart();
}

function parsePriceInput(raw: string): number | null {
  const digits = raw.replace(/\s+/g, '');
  if (!digits) return null;
  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

function clampCatalogPriceRange(
  bounds: { min: number; max: number },
  nextMin: number,
  nextMax: number
): { min: number; max: number } {
  const snap = (v: number) => Math.round(v / PRICE_STEP) * PRICE_STEP;
  const snappedMin = snap(nextMin);
  const snappedMax = snap(nextMax);
  const clampedMin = Math.max(bounds.min, Math.min(snappedMin, bounds.max));
  const clampedMax = Math.max(clampedMin, Math.min(snappedMax, bounds.max));
  return { min: clampedMin, max: clampedMax };
}

type FilterSectionProps = {
  sectionId: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function CatalogFilterSection({
  sectionId,
  title,
  isOpen,
  onToggle,
  children,
}: FilterSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <h3 className={styles.sectionTitle} id={`filter-heading-${sectionId}`}>
          {title}
        </h3>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`filter-body-${sectionId}`}
          title={isOpen ? 'Свернуть' : 'Развернуть'}
        >
          <ChevronDownIcon
            className={`${styles.sectionChevron} ${!isOpen ? styles.sectionChevronCollapsed : ''}`}
            aria-hidden
          />
        </button>
      </div>
      {isOpen ? (
        <div
          className={styles.sectionBody}
          id={`filter-body-${sectionId}`}
          role="region"
          aria-labelledby={`filter-heading-${sectionId}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function clearCatalogFilterKeys(params: URLSearchParams): void {
  const toRemove = new Set<string>();
  for (const k of params.keys()) {
    if (
      k.startsWith('attr_') ||
      k === 'avail' ||
      k === 'mfr' ||
      k === 'price_min' ||
      k === 'price_max' ||
      k === 'cat'
    ) {
      toRemove.add(k);
    }
  }
  toRemove.forEach((k) => params.delete(k));
  params.delete('page');
}

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  mobileOpen,
  onClose,
  filters,
  loading,
  priceBounds,
  categoryOptions = [],
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const replaceParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /** После blur ждём, пока selected* из URL догонит clamp — иначе эффект перезапишет поле старым числом. */
  const pendingMinRef = useRef<number | null>(null);
  const pendingMaxRef = useRef<number | null>(null);

  const handleClear = useCallback(() => {
    pendingMinRef.current = null;
    pendingMaxRef.current = null;
    replaceParams((p) => clearCatalogFilterKeys(p));
  }, [replaceParams]);

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
      replaceParams((p) => {
        const prev = p.getAll(key);
        p.delete(key);
        const merged = checked
          ? [...prev.filter((x) => x !== value), value]
          : prev.filter((x) => x !== value);
        merged.forEach((v) => p.append(key, v));
      });
    },
    [attrKey, replaceParams]
  );

  const isMfrChecked = useCallback(
    (id: string) => searchParams.getAll('mfr').includes(id),
    [searchParams]
  );

  const toggleMfr = useCallback(
    (id: string, checked: boolean) => {
      replaceParams((p) => {
        const prev = p.getAll('mfr');
        p.delete('mfr');
        const merged = checked
          ? [...prev.filter((x) => x !== id), id]
          : prev.filter((x) => x !== id);
        merged.forEach((v) => p.append('mfr', v));
      });
    },
    [replaceParams]
  );

  const isCatChecked = useCallback(
    (slug: string) => searchParams.getAll('cat').includes(slug),
    [searchParams]
  );

  const toggleCat = useCallback(
    (slug: string, checked: boolean) => {
      replaceParams((p) => {
        const prev = p.getAll('cat');
        p.delete('cat');
        const merged = checked
          ? [...prev.filter((x) => x !== slug), slug]
          : prev.filter((x) => x !== slug);
        merged.forEach((v) => p.append('cat', v));
        p.delete('page');
      });
    },
    [replaceParams]
  );

  const selectAllCategories = useCallback(() => {
    replaceParams((p) => {
      p.delete('cat');
      for (const opt of categoryOptions) {
        p.append('cat', opt.slug);
      }
      p.delete('page');
    });
  }, [replaceParams, categoryOptions]);

  const clearAllCategories = useCallback(() => {
    replaceParams((p) => {
      p.delete('cat');
      p.delete('page');
    });
  }, [replaceParams]);

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

  const availValue = searchParams.get('avail');

  const setAvail = useCallback(
    (value: string | null) => {
      replaceParams((p) => {
        p.delete('avail');
        if (value) p.set('avail', value);
      });
    },
    [replaceParams]
  );

  const hasActiveFilters = useMemo(() => {
    for (const k of searchParams.keys()) {
      if (
        k.startsWith('attr_') ||
        k === 'avail' ||
        k === 'mfr' ||
        k === 'price_min' ||
        k === 'price_max' ||
        k === 'cat'
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
      replaceParams((p) => {
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
      });
    },
    [priceBounds, replaceParams]
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
    if (facet.id === 'availability' && facet.type === 'radio') {
      return (
        <CatalogFilterSection
          key={facet.id}
          sectionId={facet.id}
          title={facet.label}
          isOpen={isSectionOpen(facet.id)}
          onToggle={() => toggleSection(facet.id)}
        >
          <div className={styles.options}>
            <label className={styles.option}>
              <input
                type="radio"
                name="catalog-avail"
                checked={availValue == null || availValue === ''}
                onChange={() => setAvail(null)}
              />
              <span className={styles.optionText}>Все</span>
            </label>
            {facet.options.map((opt) => (
              <label key={opt.value} className={styles.option}>
                <input
                  type="radio"
                  name="catalog-avail"
                  checked={availValue === opt.value}
                  onChange={() => setAvail(opt.value)}
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

    if (facet.id === 'manufacturer' && facet.type === 'checkbox') {
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

  if (loading) {
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

  if (!priceBounds && filters.length === 0 && categoryOptions.length === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.filtersSidebar} ${mobileOpen ? styles.filtersSidebarMobileOpen : ''}`}
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
        {priceBounds && priceBounds.max >= priceBounds.min ? (
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
                min={priceBounds.min}
                max={priceBounds.max}
                step={PRICE_STEP}
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
                min={priceBounds.min}
                max={priceBounds.max}
                step={PRICE_STEP}
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
        {categoryOptions.length > 0 ? (
          <CatalogFilterSection
            sectionId="category"
            title="Категория"
            isOpen={isSectionOpen('category')}
            onToggle={() => toggleSection('category')}
          >
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
            <div className={styles.options}>
              {categoryOptions.map((opt) => (
                <label key={opt.slug} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={isCatChecked(opt.slug)}
                    onChange={(e) => toggleCat(opt.slug, e.target.checked)}
                  />
                  <span className={styles.optionText}>
                    {formatFilterOptionLabel(opt.label, opt.count)}
                  </span>
                </label>
              ))}
            </div>
          </CatalogFilterSection>
        ) : null}
        {filters.map((f) => renderFacet(f))}
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
