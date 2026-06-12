'use client';

import { type RefObject, useEffect } from 'react';

export function useTemplatesLibraryTitleRenameFocus(
  titleRenameMode: boolean,
  titleRenameInputRef: RefObject<HTMLInputElement | null>
) {
  useEffect(() => {
    if (!titleRenameMode) return;
    const id = window.setTimeout(() => {
      titleRenameInputRef.current?.focus();
      titleRenameInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [titleRenameInputRef, titleRenameMode]);
}
