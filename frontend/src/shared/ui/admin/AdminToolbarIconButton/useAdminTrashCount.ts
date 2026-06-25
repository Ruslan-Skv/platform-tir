'use client';

import { useCallback, useEffect, useState } from 'react';

export function useAdminTrashCount(
  fetchTotal: () => Promise<{ total: number }>,
  /** Перезагрузка счётчика при изменении (например, listRefreshKey) */
  reloadKey: unknown = 0,
  enabled = true
) {
  const [trashCount, setTrashCount] = useState(0);

  const refreshTrashCount = useCallback(async () => {
    if (!enabled) {
      setTrashCount(0);
      return;
    }
    try {
      const res = await fetchTotal();
      setTrashCount(Math.max(0, res.total ?? 0));
    } catch {
      setTrashCount(0);
    }
  }, [enabled, fetchTotal]);

  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount, reloadKey]);

  return { trashCount, refreshTrashCount };
}
