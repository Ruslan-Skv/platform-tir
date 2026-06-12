'use client';

import { useLayoutEffect, useState } from 'react';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { getCatalogSettings } from '@/shared/api/catalog-settings';
import { getUserNotificationSettings } from '@/shared/api/user-notifications';
import {
  type MobileCatalogColumns,
  applyMobileCatalogColumnsToDocument,
  readMobileCatalogColumnsFromDocument,
  writeStoredMobileCatalogColumns,
} from '@/shared/lib/mobile-catalog-columns';

export type { MobileCatalogColumns };

function commitMobileCatalogColumns(columns: MobileCatalogColumns): void {
  writeStoredMobileCatalogColumns(columns);
  applyMobileCatalogColumnsToDocument(columns);
}

/**
 * Только для UI, где нужно знать число колонок после гидратации.
 * Разметку сетки каталога задавайте через data-mobile-catalog-columns на <html>, не через className.
 */
export function useMobileCatalogColumns(): MobileCatalogColumns {
  const [columns, setColumns] = useState<MobileCatalogColumns>(1);
  const { isAuthenticated } = useUserAuth();

  useLayoutEffect(() => {
    const fromDom = readMobileCatalogColumnsFromDocument();
    if (fromDom != null) {
      setColumns(fromDom);
    }
  }, []);

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
        setColumns(effective);
        commitMobileCatalogColumns(effective);
      } catch {
        /* ignore */
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return columns;
}
