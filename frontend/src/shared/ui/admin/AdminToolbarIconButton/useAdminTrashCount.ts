'use client';

import { useCallback, useEffect, useState } from 'react';

export function useAdminTrashCount(
  fetchTotal: () => Promise<{ total: number }>,
  /** Перезагрузка счётчика при изменении (например, listRefreshKey) */
  reloadKey: unknown = 0
) {
  const [trashCount, setTrashCount] = useState(0);

  const refreshTrashCount = useCallback(async () => {
    try {
      const res = await fetchTotal();
      setTrashCount(Math.max(0, res.total ?? 0));
    } catch {
      setTrashCount(0);
    }
  }, [fetchTotal]);

  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount, reloadKey]);

  return { trashCount, refreshTrashCount };
}
