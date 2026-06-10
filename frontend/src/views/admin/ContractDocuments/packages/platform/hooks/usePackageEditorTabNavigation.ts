'use client';

import { useCallback } from 'react';

import { usePackageEditorTabOrder } from '../tabs';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';

export function usePackageEditorTabNavigation(setActiveTab: (tab: PackageDocumentTabId) => void) {
  const {
    tabOrder: editorTabOrder,
    handleTabDragStart,
    handleTabDragOver,
    handleTabDrop,
    handleTabActivate: handleTabActivateInner,
  } = usePackageEditorTabOrder();

  const handleTabActivate = useCallback(
    (id: PackageDocumentTabId) => handleTabActivateInner(id, setActiveTab),
    [handleTabActivateInner, setActiveTab]
  );

  return {
    editorTabOrder,
    handleTabActivate,
    handleTabDragStart,
    handleTabDragOver,
    handleTabDrop,
  };
}
