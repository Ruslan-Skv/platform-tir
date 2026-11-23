'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BlindsCategory, BlindsSectionData } from '@/shared/api/blinds';
import { getBlindsSection } from '@/shared/api/blinds';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { DEFAULT_BLINDS_SECTION } from '../blinds-defaults';

export function useBlindsPage(initialData: BlindsSectionData | null) {
  const [data, setData] = useState<BlindsSectionData>(initialData ?? DEFAULT_BLINDS_SECTION);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>(
    initialData?.categories[0]?.slug ?? DEFAULT_BLINDS_SECTION.categories[0]!.slug
  );
  const [activeProductSlug, setActiveProductSlug] = useState<string | null>(null);
  const hashApplied = useRef(false);

  // Обновление данных на клиенте после SSR (свежесть после правок в админке)
  useEffect(() => {
    let cancelled = false;
    getBlindsSection()
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

  // Deep-link: /blinds#rulonnye-shtory открывает вкладку категории
  useEffect(() => {
    if (hashApplied.current || categories.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (hash && categories.some((c) => c.slug === hash)) {
      setActiveCategorySlug(hash);
      hashApplied.current = true;
    }
  }, [categories]);

  const activeCategory: BlindsCategory | undefined = useMemo(
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

export type BlindsPageModel = ReturnType<typeof useBlindsPage>;
