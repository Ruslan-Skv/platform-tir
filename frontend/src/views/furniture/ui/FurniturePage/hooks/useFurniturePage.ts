'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FurnitureCategory, FurnitureSectionData } from '@/shared/api/furniture';
import { getFurnitureSection } from '@/shared/api/furniture';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { DEFAULT_FURNITURE_SECTION } from '../furniture-defaults';

export function useFurniturePage(initialData: FurnitureSectionData | null) {
  const [data, setData] = useState<FurnitureSectionData>(initialData ?? DEFAULT_FURNITURE_SECTION);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>(
    initialData?.categories[0]?.slug ?? DEFAULT_FURNITURE_SECTION.categories[0]!.slug
  );
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(null);
  const hashApplied = useRef(false);

  // Обновление данных на клиенте после SSR (свежесть после правок в админке)
  useEffect(() => {
    let cancelled = false;
    getFurnitureSection()
      .then((fresh) => {
        if (!cancelled) setData(fresh);
      })
      .catch(() => {
        // Бэкенд недоступен — остаёмся на SSR-данных или фолбэке
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = data.categories;

  // Deep-link: /furniture#kuhni открывает вкладку категории
  useEffect(() => {
    if (hashApplied.current || categories.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (hash && categories.some((c) => c.slug === hash)) {
      setActiveCategorySlug(hash);
      hashApplied.current = true;
    }
  }, [categories]);

  const activeCategory: FurnitureCategory | undefined = useMemo(
    () => categories.find((c) => c.slug === activeCategorySlug) ?? categories[0],
    [categories, activeCategorySlug]
  );

  const activeProduct = useMemo(() => {
    if (!activeCategory || activeCategory.products.length === 0) return undefined;
    return (
      activeCategory.products.find((p) => p.slug === activeProductSlug) ??
      activeCategory.products[0]
    );
  }, [activeCategory, activeProductSlug]);

  const selectCategory = useCallback((slug: string) => {
    setActiveCategorySlug(slug);
    setActiveProductSlug(null);
    // Обновляем hash без скролла и без записи в историю
    window.history.replaceState(null, '', `#${slug}`);
  }, []);

  const selectProduct = useCallback((slug: string) => {
    setActiveProductSlug(slug);
  }, []);

  const getImageUrl = useCallback((url: string | null | undefined) => publicUploadUrl(url), []);

  return {
    settings: data.settings,
    categories,
    activeCategory,
    activeProduct,
    selectCategory,
    selectProduct,
    getImageUrl,
  };
}

export type FurniturePageModel = ReturnType<typeof useFurniturePage>;
