'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  CeilingManufacturer,
  StretchCeilingsSectionData,
} from '@/shared/api/stretch-ceilings';
import { getStretchCeilingsSection } from '@/shared/api/stretch-ceilings';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import { DEFAULT_STRETCH_CEILINGS_SECTION } from '../stretch-ceilings-defaults';

export function useStretchCeilingsPage(initialData: StretchCeilingsSectionData | null) {
  const [data, setData] = useState<StretchCeilingsSectionData>(
    initialData ?? DEFAULT_STRETCH_CEILINGS_SECTION
  );
  const [activeManufacturerSlug, setActiveManufacturerSlug] = useState<string>(
    initialData?.manufacturers[0]?.slug ?? DEFAULT_STRETCH_CEILINGS_SECTION.manufacturers[0]!.slug
  );
  const [activeFabricSlug, setActiveFabricSlug] = useState<string | null>(null);
  const hashApplied = useRef(false);

  // Обновление данных на клиенте после SSR (свежесть после правок в админке)
  useEffect(() => {
    let cancelled = false;
    getStretchCeilingsSection()
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

  const manufacturers = data.manufacturers;

  // Deep-link: /stretch-ceilings#msd открывает вкладку производителя
  useEffect(() => {
    if (hashApplied.current || manufacturers.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (hash && manufacturers.some((m) => m.slug === hash)) {
      setActiveManufacturerSlug(hash);
      hashApplied.current = true;
    }
  }, [manufacturers]);

  const activeManufacturer: CeilingManufacturer | undefined = useMemo(
    () => manufacturers.find((m) => m.slug === activeManufacturerSlug) ?? manufacturers[0],
    [manufacturers, activeManufacturerSlug]
  );

  const activeFabric = useMemo(() => {
    if (!activeManufacturer || activeManufacturer.fabrics.length === 0) return undefined;
    return (
      activeManufacturer.fabrics.find((f) => f.slug === activeFabricSlug) ??
      activeManufacturer.fabrics[0]
    );
  }, [activeManufacturer, activeFabricSlug]);

  const selectManufacturer = useCallback((slug: string) => {
    setActiveManufacturerSlug(slug);
    setActiveFabricSlug(null);
    // Обновляем hash без скролла и без записи в историю
    window.history.replaceState(null, '', `#${slug}`);
  }, []);

  const selectFabric = useCallback((slug: string) => {
    setActiveFabricSlug(slug);
  }, []);

  const getImageUrl = useCallback((url: string | null | undefined) => publicUploadUrl(url), []);

  return {
    settings: data.settings,
    manufacturers,
    activeManufacturer,
    activeFabric,
    selectManufacturer,
    selectFabric,
    getImageUrl,
  };
}

export type StretchCeilingsPageModel = ReturnType<typeof useStretchCeilingsPage>;
