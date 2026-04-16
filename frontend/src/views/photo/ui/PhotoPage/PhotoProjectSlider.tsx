'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { Photo, PhotoProject } from '@/shared/api/photo';

import styles from './PhotoPage.module.css';

type ImgAttrs = (localIndex: number) => {
  loading: 'eager' | 'lazy';
  fetchPriority?: 'high';
};

export interface PhotoProjectSliderProps {
  project: PhotoProject;
  photos: Photo[];
  layoutKey: string;
  globalPhotoOffset: number;
  getImageUrl: (url: string) => string;
  imgAttrs: ImgAttrs;
  onOpenLightbox: (index: number) => void;
}

function getSlideScrollLeft(vp: HTMLDivElement, index: number): number {
  const child = vp.children[index] as HTMLElement | undefined;
  return child != null ? Math.round(child.offsetLeft) : 0;
}

function getActiveIndexFromScroll(vp: HTMLDivElement): number {
  const scrollLeft = vp.scrollLeft;
  const children = Array.from(vp.children) as HTMLElement[];
  if (children.length === 0) return 0;
  let best = 0;
  for (let i = 0; i < children.length; i++) {
    if (children[i].offsetLeft <= scrollLeft + 2) best = i;
  }
  return best;
}

export function PhotoProjectSlider({
  project,
  photos,
  layoutKey,
  globalPhotoOffset,
  getImageUrl,
  imgAttrs,
  onOpenLightbox,
}: PhotoProjectSliderProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const pointerMoved = useRef(false);

  const syncActiveFromScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el || photos.length === 0) return;
    const idx = getActiveIndexFromScroll(el);
    setActive(Math.min(idx, photos.length - 1));
  }, [photos.length]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = viewportRef.current;
      if (!el || photos.length === 0) return;
      const n = photos.length;
      const target = ((index % n) + n) % n;
      el.scrollTo({ left: getSlideScrollLeft(el, target), behavior });
      setActive(target);
    },
    [photos.length]
  );

  useEffect(() => {
    setActive(0);
    const el = viewportRef.current;
    if (el) el.scrollLeft = 0;
  }, [layoutKey, project.id]);

  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth <= 0 || photos.length === 0) return;
      const idx = Math.min(activeRef.current, photos.length - 1);
      el.scrollLeft = getSlideScrollLeft(el, idx);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [photos.length, layoutKey, project.id]);

  const onSlidePointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
    pointerMoved.current = false;
  };

  const onSlidePointerMove = (e: React.PointerEvent) => {
    if (pointerStartX.current == null) return;
    if (Math.abs(e.clientX - pointerStartX.current) > 14) pointerMoved.current = true;
  };

  const onSlideClick = (index: number) => {
    if (pointerMoved.current) return;
    onOpenLightbox(index);
  };

  if (photos.length === 0) return null;

  return (
    <div className={styles.sliderWrapper}>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.sliderNavBtn} ${styles.sliderNavPrev}`}
            aria-label="Предыдущее фото"
            onClick={() => scrollToIndex(active - 1, active === 0 ? 'auto' : 'smooth')}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.sliderNavBtn} ${styles.sliderNavNext}`}
            aria-label="Следующее фото"
            onClick={() =>
              scrollToIndex(active + 1, active === photos.length - 1 ? 'auto' : 'smooth')
            }
          >
            ›
          </button>
        </>
      )}
      <div
        ref={viewportRef}
        className={styles.sliderViewport}
        onScroll={syncActiveFromScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Фото: ${project.title}`}
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            className={styles.sliderPhoto}
            onPointerDown={onSlidePointerDown}
            onPointerMove={onSlidePointerMove}
            onClick={() => onSlideClick(i)}
          >
            <img
              src={getImageUrl(photo.imageUrl)}
              alt=""
              {...imgAttrs(globalPhotoOffset + i)}
              decoding="async"
              draggable={false}
            />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className={styles.sliderDots} role="tablist" aria-label="Номер слайда">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Слайд ${i + 1} из ${photos.length}`}
              className={`${styles.sliderDot} ${i === active ? styles.sliderDotActive : ''}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
