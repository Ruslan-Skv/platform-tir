'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseProductEditSaveButtonParams = {
  saving: boolean;
  loading: boolean;
  productNotFound: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
  pageHeaderRef: React.RefObject<HTMLDivElement | null>;
};

export function useProductEditSaveButton({
  saving,
  loading,
  productNotFound,
  formRef,
  pageHeaderRef,
}: UseProductEditSaveButtonParams) {
  const saveButtonAnchorRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const updateSaveButtonPinRef = useRef<(() => void) | null>(null);
  const saveButtonPinSnapshotRef = useRef({
    pinnedTopPx: 72,
    fixed: false,
    left: null as number | null,
    placeholderWidth: 0,
    placeholderHeight: 0,
  });

  const [saveButtonFixed, setSaveButtonFixed] = useState(false);
  const [saveButtonFixedLeft, setSaveButtonFixedLeft] = useState<number | null>(null);
  const [saveButtonPlaceholderSize, setSaveButtonPlaceholderSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [saveButtonPinnedTopPx, setSaveButtonPinnedTopPx] = useState(72);
  const [saveButtonPortalRoot, setSaveButtonPortalRoot] = useState<HTMLElement | null>(null);

  const submitProductForm = useCallback(() => {
    formRef.current?.requestSubmit();
  }, [formRef]);

  const getAdminHeaderBottomOffset = useCallback(() => {
    const mainEl = document.querySelector('main');
    const adminHeader =
      mainEl?.previousElementSibling instanceof HTMLElement &&
      mainEl.previousElementSibling.tagName === 'HEADER'
        ? mainEl.previousElementSibling
        : document.querySelector('header');

    if (!(adminHeader instanceof HTMLElement)) {
      return 8;
    }

    return Math.ceil(adminHeader.getBoundingClientRect().bottom) + 8;
  }, []);

  const getPageScrollTop = useCallback(() => {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, []);

  const scrollProductPageToTop = useCallback(() => {
    const pageHeader = pageHeaderRef.current;
    const isPinned = saveButtonPinSnapshotRef.current.fixed;

    if (getPageScrollTop() < 2 && !isPinned) {
      return;
    }

    const scrollWindowTo = (top: number, behavior: ScrollBehavior) => {
      const options: ScrollToOptions = { top, left: 0, behavior };
      window.scrollTo(options);
      document.documentElement.scrollTo(options);
      document.body.scrollTo(options);
    };

    let scrollFinishTimer: number | undefined;
    let didFinishScroll = false;
    const finishScroll = () => {
      if (didFinishScroll) return;

      if (getPageScrollTop() > 2) {
        scrollWindowTo(0, 'auto');
        pageHeader?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      didFinishScroll = true;
      if (scrollFinishTimer !== undefined) {
        window.clearTimeout(scrollFinishTimer);
      }
      updateSaveButtonPinRef.current?.();
    };

    if (pageHeader) {
      pageHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      scrollWindowTo(0, 'smooth');
    }

    scrollFinishTimer = window.setTimeout(finishScroll, 480);
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', finishScroll, { once: true });
    }
  }, [getPageScrollTop, pageHeaderRef]);

  const handleHeaderSaveClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      scrollProductPageToTop();
      window.setTimeout(() => {
        submitProductForm();
      }, 180);
    },
    [scrollProductPageToTop, submitProductForm]
  );

  useEffect(() => {
    setSaveButtonPortalRoot(document.querySelector('main')?.parentElement ?? null);
  }, []);

  const measureSaveButtonPinnedTop = useCallback(() => {
    return getAdminHeaderBottomOffset();
  }, [getAdminHeaderBottomOffset]);

  const applySaveButtonPinState = useCallback(
    (next: {
      pinnedTopPx: number;
      fixed: boolean;
      left: number | null;
      placeholder: { width: number; height: number } | null;
    }) => {
      const placeholderWidth = next.placeholder?.width ?? 0;
      const placeholderHeight = next.placeholder?.height ?? 0;
      const prev = saveButtonPinSnapshotRef.current;

      if (
        prev.pinnedTopPx === next.pinnedTopPx &&
        prev.fixed === next.fixed &&
        prev.left === next.left &&
        prev.placeholderWidth === placeholderWidth &&
        prev.placeholderHeight === placeholderHeight
      ) {
        return;
      }

      saveButtonPinSnapshotRef.current = {
        pinnedTopPx: next.pinnedTopPx,
        fixed: next.fixed,
        left: next.left,
        placeholderWidth,
        placeholderHeight,
      };

      setSaveButtonPinnedTopPx(next.pinnedTopPx);
      setSaveButtonFixed(next.fixed);
      setSaveButtonFixedLeft(next.left);
      setSaveButtonPlaceholderSize(next.placeholder);
    },
    []
  );

  useEffect(() => {
    if (loading || productNotFound) {
      setSaveButtonFixed(false);
      return;
    }

    let pinFrameId = 0;

    const updateSaveButtonPin = () => {
      if (pinFrameId) return;

      pinFrameId = window.requestAnimationFrame(() => {
        pinFrameId = 0;

        const pinnedTop = measureSaveButtonPinnedTop();
        const anchor = saveButtonAnchorRef.current;

        if (!anchor) {
          applySaveButtonPinState({
            pinnedTopPx: pinnedTop,
            fixed: false,
            left: null,
            placeholder: null,
          });
          return;
        }

        const anchorRect = anchor.getBoundingClientRect();
        const shouldFix = anchorRect.top < pinnedTop;

        if (shouldFix) {
          const button = saveButtonRef.current;
          if (!button) return;

          const buttonRect = button.getBoundingClientRect();
          const buttonWidth = buttonRect.width || button.offsetWidth;
          applySaveButtonPinState({
            pinnedTopPx: pinnedTop,
            fixed: true,
            left: anchorRect.right - buttonWidth,
            placeholder: {
              width: buttonWidth,
              height: buttonRect.height || button.offsetHeight,
            },
          });
          return;
        }

        applySaveButtonPinState({
          pinnedTopPx: pinnedTop,
          fixed: false,
          left: null,
          placeholder: null,
        });
      });
    };

    updateSaveButtonPinRef.current = updateSaveButtonPin;
    updateSaveButtonPin();
    window.addEventListener('scroll', updateSaveButtonPin, { passive: true });
    window.addEventListener('resize', updateSaveButtonPin);
    return () => {
      updateSaveButtonPinRef.current = null;
      if (pinFrameId) {
        window.cancelAnimationFrame(pinFrameId);
      }
      window.removeEventListener('scroll', updateSaveButtonPin);
      window.removeEventListener('resize', updateSaveButtonPin);
    };
  }, [loading, productNotFound, measureSaveButtonPinnedTop, applySaveButtonPinState]);

  return {
    saveButtonAnchorRef,
    saveButtonRef,
    saveButtonFixed,
    saveButtonFixedLeft,
    saveButtonPlaceholderSize,
    saveButtonPinnedTopPx,
    saveButtonPortalRoot,
    handleHeaderSaveClick,
    submitProductForm,
  };
}
