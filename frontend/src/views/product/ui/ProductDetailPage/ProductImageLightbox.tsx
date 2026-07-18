'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './ProductDetailPage.module.css';

export type LightboxOriginRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ProductImageLightboxProps = {
  open: boolean;
  images: string[];
  index: number;
  productName: string;
  originRect: LightboxOriginRect | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

const ENTER_MS = 420;
const EXIT_MS = 320;
const SWAP_MS = 350;

function computeFlipTransform(
  origin: LightboxOriginRect,
  finalRect: DOMRect
): { dx: number; dy: number; scale: number } {
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  const fx = finalRect.left + finalRect.width / 2;
  const fy = finalRect.top + finalRect.height / 2;
  const sx = origin.width / Math.max(finalRect.width, 1);
  const sy = origin.height / Math.max(finalRect.height, 1);
  return {
    dx: ox - fx,
    dy: oy - fy,
    scale: Math.min(sx, sy),
  };
}

export function ProductImageLightbox({
  open,
  images,
  index,
  productName,
  originRect,
  onClose,
  onPrev,
  onNext,
}: ProductImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [shownIndex, setShownIndex] = useState(index);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [outgoingFading, setOutgoingFading] = useState(false);
  const [incomingVisible, setIncomingVisible] = useState(true);

  const imgRef = useRef<HTMLImageElement>(null);
  const closingRef = useRef(false);
  const didEnterFlipRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownIndexRef = useRef(index);

  const applyOriginTransform = useCallback(
    (instant: boolean) => {
      const img = imgRef.current;
      if (!img) return;
      if (!originRect) {
        img.style.transition = instant
          ? 'none'
          : `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        img.style.transform = 'scale(0.92)';
        return;
      }
      const finalRect = img.getBoundingClientRect();
      if (finalRect.width < 2 || finalRect.height < 2) return;
      const { dx, dy, scale } = computeFlipTransform(originRect, finalRect);
      img.style.transition = instant
        ? 'none'
        : `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      img.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    },
    [originRect]
  );

  const clearTransform = useCallback((animate: boolean) => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = animate
      ? `opacity ${ENTER_MS}ms ease, transform ${ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : 'none';
    img.style.transform = 'translate(0, 0) scale(1)';
  }, []);

  useEffect(() => {
    if (open) {
      closingRef.current = false;
      didEnterFlipRef.current = false;
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (swapTimerRef.current) {
        clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;
      }
      setMounted(true);
      setImageReady(false);
      setShownIndex(index);
      shownIndexRef.current = index;
      setOutgoingIndex(null);
      setOutgoingFading(false);
      setIncomingVisible(true);
      document.body.style.overflow = 'hidden';
      return;
    }

    if (!mounted) return;

    closingRef.current = true;
    setActive(false);
    applyOriginTransform(false);

    exitTimerRef.current = setTimeout(() => {
      setMounted(false);
      closingRef.current = false;
      didEnterFlipRef.current = false;
      setOutgoingIndex(null);
      setOutgoingFading(false);
      document.body.style.overflow = '';
      if (imgRef.current) {
        imgRef.current.style.transform = '';
        imgRef.current.style.transition = '';
      }
      exitTimerRef.current = null;
    }, EXIT_MS + 40);

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted, applyOriginTransform]);

  useEffect(() => {
    if (!mounted || !open) return;
    if (!didEnterFlipRef.current || !active) {
      setShownIndex(index);
      shownIndexRef.current = index;
      return;
    }
    if (index === shownIndexRef.current) return;

    const from = shownIndexRef.current;

    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }

    setOutgoingIndex(from);
    setOutgoingFading(false);
    setIncomingVisible(false);
    setShownIndex(index);
    shownIndexRef.current = index;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOutgoingFading(true);
        setIncomingVisible(true);
      });
    });

    swapTimerRef.current = setTimeout(() => {
      setOutgoingIndex(null);
      setOutgoingFading(false);
      swapTimerRef.current = null;
    }, SWAP_MS + 40);

    return () => {
      cancelAnimationFrame(frame);
      if (swapTimerRef.current) {
        clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;
      }
    };
  }, [index, mounted, open, active]);

  useEffect(() => {
    if (!mounted || !open) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImageReady(true);
    }
  }, [mounted, open, shownIndex, images]);

  useLayoutEffect(() => {
    if (!mounted || !open || !imageReady || didEnterFlipRef.current) return;

    applyOriginTransform(true);
    let clearInlineTimer: ReturnType<typeof setTimeout> | null = null;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (closingRef.current) return;
        didEnterFlipRef.current = true;
        clearTransform(true);
        setActive(true);
        clearInlineTimer = setTimeout(() => {
          if (imgRef.current && !closingRef.current) {
            imgRef.current.style.transition = '';
            imgRef.current.style.transform = '';
          }
        }, ENTER_MS + 40);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (clearInlineTimer) clearTimeout(clearInlineTimer);
    };
  }, [mounted, open, imageReady, applyOriginTransform, clearTransform]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onPrev, onNext]);

  if (!mounted || typeof document === 'undefined' || images.length === 0) {
    return null;
  }

  const shownSrc = images[shownIndex] ?? images[0];
  const outgoingSrc = outgoingIndex != null ? (images[outgoingIndex] ?? null) : null;

  return createPortal(
    <div
      className={`${styles.lightbox} ${active ? styles.lightboxActive : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображения"
    >
      <button
        type="button"
        className={styles.lightboxClose}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Закрыть"
      >
        ✕
      </button>

      {images.length > 1 ? (
        <button
          type="button"
          className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Предыдущее изображение"
        >
          ‹
        </button>
      ) : null}

      <div className={styles.lightboxContent}>
        <div className={styles.lightboxStage}>
          {outgoingSrc ? (
            <img
              src={outgoingSrc}
              alt=""
              aria-hidden
              className={`${styles.lightboxImage} ${styles.lightboxImageOutgoing} ${
                outgoingFading ? styles.lightboxImageHidden : styles.lightboxImageVisible
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
          <img
            ref={imgRef}
            src={shownSrc}
            alt={`${productName} - ${shownIndex + 1}`}
            className={`${styles.lightboxImage} ${
              incomingVisible ? styles.lightboxImageVisible : styles.lightboxImageHidden
            }`}
            onLoad={() => setImageReady(true)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {images.length > 1 ? (
        <button
          type="button"
          className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Следующее изображение"
        >
          ›
        </button>
      ) : null}

      {images.length > 1 ? (
        <div className={styles.lightboxCounter}>
          {shownIndex + 1} / {images.length}
        </div>
      ) : null}
    </div>,
    document.body
  );
}
