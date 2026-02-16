'use client';

import { useEffect, useState } from 'react';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { getCatalogSettings } from '@/shared/api/catalog-settings';
import { getUserNotificationSettings } from '@/shared/api/user-notifications';

/** Результат: 1 или 2 карточки в строке на мобильном */
export type MobileCatalogColumns = 1 | 2;

export function useMobileCatalogColumns(): MobileCatalogColumns {
  const [columns, setColumns] = useState<MobileCatalogColumns>(1);
  const { isAuthenticated } = useUserAuth();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const [catalogSettings, userSettings] = await Promise.all([
          getCatalogSettings(),
          isAuthenticated ? getUserNotificationSettings().catch(() => null) : null,
        ]);

        if (cancelled) return;

        const defaultCols = (catalogSettings?.defaultMobileCatalogColumns ??
          1) as MobileCatalogColumns;
        const userCols = userSettings?.mobileCatalogColumns;
        const effective: MobileCatalogColumns = userCols != null ? userCols : defaultCols;
        setColumns(effective);
      } catch {
        if (!cancelled) setColumns(1);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return columns;
}
