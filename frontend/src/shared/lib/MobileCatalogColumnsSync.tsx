'use client';

import { useLayoutEffect } from 'react';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { getCatalogSettings } from '@/shared/api/catalog-settings';
import { getUserNotificationSettings } from '@/shared/api/user-notifications';
import {
  type MobileCatalogColumns,
  applyMobileCatalogColumnsToDocument,
  writeStoredMobileCatalogColumns,
} from '@/shared/lib/mobile-catalog-columns';

function commitMobileCatalogColumns(columns: MobileCatalogColumns): void {
  writeStoredMobileCatalogColumns(columns);
  applyMobileCatalogColumnsToDocument(columns);
}

/** Синхронизирует data-mobile-catalog-columns с API; не влияет на className в React-дереве (без hydration mismatch). */
export function MobileCatalogColumnsSync() {
  const { isAuthenticated } = useUserAuth();

  useLayoutEffect(() => {
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
        commitMobileCatalogColumns(effective);
      } catch {
        /* bootstrap-скрипт и SSR-атрибут на <html> уже задали разумное значение */
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return null;
}
