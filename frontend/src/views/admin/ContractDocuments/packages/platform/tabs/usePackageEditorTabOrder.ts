'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isPackageEditorTabBarTab } from './isPackageEditorTabBarTab';
import {
  PACKAGE_DOCUMENT_TAB_IDS,
  PACKAGE_DOCUMENT_TAB_ORDER_STORAGE_KEY,
  type PackageDocumentTabId,
  normalizeLegacyPackageTabId,
  normalizePackageDocumentTabOrder,
} from './packageDocumentTabs';

export function usePackageEditorTabOrder() {
  const [tabOrder, setTabOrder] = useState<PackageDocumentTabId[]>(() =>
    PACKAGE_DOCUMENT_TAB_IDS.filter((id) => isPackageEditorTabBarTab(id))
  );
  const skipPersistRef = useRef(true);
  const suppressClickAfterReorderRef = useRef(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(
        window.localStorage.getItem(PACKAGE_DOCUMENT_TAB_ORDER_STORAGE_KEY) ?? 'null'
      );
      setTabOrder(
        normalizePackageDocumentTabOrder(raw).filter((id) => isPackageEditorTabBarTab(id))
      );
    } catch {
      /* keep default */
    }
    queueMicrotask(() => {
      skipPersistRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (skipPersistRef.current) return;
    try {
      window.localStorage.setItem(PACKAGE_DOCUMENT_TAB_ORDER_STORAGE_KEY, JSON.stringify(tabOrder));
    } catch {
      /* ignore */
    }
  }, [tabOrder]);

  const handleTabDragStart = useCallback(
    (id: PackageDocumentTabId, e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-repair-tab', id);
      e.dataTransfer.setData('text/plain', id);
    },
    []
  );

  const handleTabDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleTabDrop = useCallback((targetId: PackageDocumentTabId) => {
    return (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const raw =
        e.dataTransfer.getData('application/x-repair-tab') || e.dataTransfer.getData('text/plain');
      const normalized = raw ? normalizeLegacyPackageTabId(raw) : '';
      const fromId =
        normalized && (PACKAGE_DOCUMENT_TAB_IDS as readonly string[]).includes(normalized)
          ? (normalized as PackageDocumentTabId)
          : null;
      if (!fromId || fromId === targetId) return;
      suppressClickAfterReorderRef.current = true;
      setTabOrder((order) => {
        const next = order.filter((tid) => tid !== fromId);
        const insertAt = next.indexOf(targetId);
        if (insertAt < 0) return order;
        next.splice(insertAt, 0, fromId);
        return next;
      });
    };
  }, []);

  const handleTabActivate = useCallback(
    (id: PackageDocumentTabId, onActivate: (id: PackageDocumentTabId) => void) => {
      if (suppressClickAfterReorderRef.current) {
        suppressClickAfterReorderRef.current = false;
        return;
      }
      onActivate(id);
    },
    []
  );

  return {
    tabOrder,
    setTabOrder,
    handleTabDragStart,
    handleTabDragOver,
    handleTabDrop,
    handleTabActivate,
  };
}
