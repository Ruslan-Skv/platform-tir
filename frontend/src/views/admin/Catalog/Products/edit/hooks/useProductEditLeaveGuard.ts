'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

type ProductEditSnapshotSource = {
  formData: unknown;
  customAttributes: unknown;
};

/** Fingerprint images so huge base64 payloads are not re-stringified fully on every keystroke. */
function fingerprintImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((img, index) => {
    if (typeof img !== 'string') return `${index}:`;
    if (img.length <= 96) return `${index}:${img}`;
    return `${index}:${img.length}:${img.slice(0, 48)}:${img.slice(-24)}`;
  });
}

export function serializeProductEditSnapshot({
  formData,
  customAttributes,
}: ProductEditSnapshotSource): string {
  const data =
    formData && typeof formData === 'object'
      ? { ...(formData as Record<string, unknown>) }
      : { value: formData };
  if ('images' in data) {
    data.images = fingerprintImages(data.images);
  }
  return JSON.stringify({ formData: data, customAttributes });
}

type UseProductEditLeaveGuardParams = {
  enabled: boolean;
  isDirty: boolean;
  saving: boolean;
  /** Returns true when save succeeded. */
  saveProduct: () => Promise<boolean>;
};

export function useProductEditLeaveGuard({
  enabled,
  isDirty,
  saving,
  saveProduct,
}: UseProductEditLeaveGuardParams) {
  const router = useRouter();
  const pathname = usePathname();
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const bypassRef = useRef(false);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const navigateTo = useCallback(
    (href: string) => {
      bypassRef.current = true;
      setLeaveConfirmOpen(false);
      pendingHrefRef.current = null;
      router.push(href);
      window.setTimeout(() => {
        bypassRef.current = false;
      }, 0);
    },
    [router]
  );

  const requestLeave = useCallback(
    (href: string) => {
      if (!enabled || bypassRef.current || !isDirtyRef.current) {
        navigateTo(href);
        return;
      }
      pendingHrefRef.current = href;
      setLeaveConfirmOpen(true);
    },
    [enabled, navigateTo]
  );

  const cancelLeave = useCallback(() => {
    if (leaveSaving) return;
    pendingHrefRef.current = null;
    setLeaveConfirmOpen(false);
  }, [leaveSaving]);

  const confirmLeaveWithoutSave = useCallback(() => {
    if (leaveSaving) return;
    const href = pendingHrefRef.current;
    if (!href) {
      setLeaveConfirmOpen(false);
      return;
    }
    navigateTo(href);
  }, [leaveSaving, navigateTo]);

  const confirmLeaveWithSave = useCallback(async () => {
    if (leaveSaving || saving) return;
    const href = pendingHrefRef.current;
    if (!href) {
      setLeaveConfirmOpen(false);
      return;
    }
    setLeaveSaving(true);
    try {
      const ok = await saveProduct();
      if (!ok) return;
      navigateTo(href);
    } finally {
      setLeaveSaving(false);
    }
  }, [leaveSaving, saving, saveProduct, navigateTo]);

  useEffect(() => {
    if (!enabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypassRef.current || !isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!isDirtyRef.current || bypassRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const hrefAttr = anchor.getAttribute('href');
      if (
        !hrefAttr ||
        hrefAttr.startsWith('#') ||
        hrefAttr.toLowerCase().startsWith('javascript:')
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const nextPath = `${url.pathname}${url.search}`;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (nextPath === currentPath) return;

      // Stay on the same product edit route (query-only noise) — still leave if path changes.
      if (url.pathname === pathname && url.pathname.includes('/edit')) {
        // Allow only hash changes on the same edit URL.
        if (url.search === window.location.search) return;
      }

      event.preventDefault();
      event.stopPropagation();
      pendingHrefRef.current = `${nextPath}${url.hash}`;
      setLeaveConfirmOpen(true);
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [enabled, pathname]);

  return {
    leaveConfirmOpen,
    leaveSaving,
    requestLeave,
    cancelLeave,
    confirmLeaveWithoutSave,
    confirmLeaveWithSave,
  };
}

export function useProductEditDirtyState(
  loading: boolean,
  formData: unknown,
  customAttributes: unknown
) {
  const [baseline, setBaseline] = useState<string | null>(null);

  const snapshot = useMemo(
    () => serializeProductEditSnapshot({ formData, customAttributes }),
    [formData, customAttributes]
  );

  const isDirty = Boolean(!loading && baseline != null && snapshot !== baseline);

  const captureBaseline = useCallback((nextFormData: unknown, nextCustomAttributes: unknown) => {
    setBaseline(
      serializeProductEditSnapshot({
        formData: nextFormData,
        customAttributes: nextCustomAttributes,
      })
    );
  }, []);

  const captureBaselineFromCurrent = useCallback(() => {
    setBaseline(snapshot);
  }, [snapshot]);

  const resetBaseline = useCallback(() => {
    setBaseline(null);
  }, []);

  return {
    isDirty,
    captureBaseline,
    captureBaselineFromCurrent,
    resetBaseline,
  };
}
