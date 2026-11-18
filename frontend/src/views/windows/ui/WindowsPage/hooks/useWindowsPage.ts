'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WindowBrand, WindowsSectionData } from '@/shared/api/windows';
import { getWindowsSection } from '@/shared/api/windows';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { DEFAULT_WINDOWS_SECTION } from '../windows-defaults';

export function useWindowsPage(initialData: WindowsSectionData | null) {
  const [data, setData] = useState<WindowsSectionData>(initialData ?? DEFAULT_WINDOWS_SECTION);
  const [activeBrandSlug, setActiveBrandSlug] = useState<string>(
    initialData?.brands[0]?.slug ?? DEFAULT_WINDOWS_SECTION.brands[0]!.slug
  );
  const [activeSystemSlug, setActiveSystemSlug] = useState<string | null>(null);
  const hashApplied = useRef(false);

  // Обновление данных на клиенте после SSR (свежесть после правок в админке)
  useEffect(() => {
    let cancelled = false;
    getWindowsSection()
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

  const brands = data.brands;

  // Deep-link: /windows#rehau открывает вкладку бренда
  useEffect(() => {
    if (hashApplied.current || brands.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (hash && brands.some((b) => b.slug === hash)) {
      setActiveBrandSlug(hash);
      hashApplied.current = true;
    }
  }, [brands]);

  const activeBrand: WindowBrand | undefined = useMemo(
    () => brands.find((b) => b.slug === activeBrandSlug) ?? brands[0],
    [brands, activeBrandSlug]
  );

  const activeSystem = useMemo(() => {
    if (!activeBrand || activeBrand.systems.length === 0) return undefined;
    return activeBrand.systems.find((s) => s.slug === activeSystemSlug) ?? activeBrand.systems[0];
  }, [activeBrand, activeSystemSlug]);

  const selectBrand = useCallback((slug: string) => {
    setActiveBrandSlug(slug);
    setActiveSystemSlug(null);
    // Обновляем hash без скролла и без записи в историю
    window.history.replaceState(null, '', `#${slug}`);
  }, []);

  const selectSystem = useCallback((slug: string) => {
    setActiveSystemSlug(slug);
  }, []);

  const getImageUrl = useCallback((url: string | null | undefined) => publicUploadUrl(url), []);

  return {
    settings: data.settings,
    brands,
    activeBrand,
    activeSystem,
    selectBrand,
    selectSystem,
    getImageUrl,
  };
}

export type WindowsPageModel = ReturnType<typeof useWindowsPage>;
