'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useFormContext } from '@/features/forms/context/FormContext';
import actionButtonStyles from '@/features/forms/ui/ActionButtons/ActionButton.module.css';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { Button } from '@/shared/ui/Button';

import styles from './HeroSection.module.css';
import { HERO_CONFIG, type HeroConfig, type HeroSlideShowMode } from './hero.config';

const SLIDE_INTERVAL_MS = 5000;

export type { HeroSlideShowMode };

interface HeroSectionProps {
  /** Данные с сервера (при первом рендере) — без мигания. Админка редактирует через API. */
  initialData?: HeroConfig | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ initialData }) => {
  const { quoteModal } = useFormContext();
  const slideshowRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Данные Hero приходят с сервера; HERO_CONFIG используется как fallback.
  const data = initialData ?? HERO_CONFIG;
  const mode: HeroSlideShowMode = data.block.slideShowMode ?? 'auto';
  const count = data.slides.length;
  const isStatic = mode === 'static';
  const isCarousel = count > 1 && !isStatic;
  const displaySlides = isCarousel ? [...data.slides, data.slides[0]] : data.slides;
  const displayCount = displaySlides.length;
  const showDots = count > 1 && (mode === 'auto' || mode === 'manual');

  useEffect(() => {
    if (data.slides.length === 0) return;
    const el = slideshowRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? { width: 0 };
      setViewportWidth(width);
    });
    ro.observe(el);
    setViewportWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [data.slides.length]);

  const goNext = useCallback(() => {
    if (count <= 1 || isStatic) return;
    setSlideIndex((i) => (i + 1) % displayCount);
  }, [count, displayCount, isStatic]);

  useEffect(() => {
    if (count <= 1 || mode !== 'auto' || isStatic) return;
    const timer = setInterval(goNext, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, mode, isStatic, goNext]);

  const handleTransitionEnd = useCallback(() => {
    if (slideIndex === count) {
      setNoTransition(true);
      setSlideIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setNoTransition(false));
      });
    }
  }, [slideIndex, count]);

  const imageUrl = (url: string) => publicUploadUrl(url);

  const SLIDE_GAP_PX = data.block.slideGap ?? 16;
  const SLIDE_WIDTH_RATIO = 0.75;
  const hasSize = viewportWidth > 0;
  const slideWidthPx = hasSize ? viewportWidth * SLIDE_WIDTH_RATIO : 300;
  const slideStep = slideWidthPx + SLIDE_GAP_PX;
  const trackWidth = isCarousel
    ? `${displayCount * slideWidthPx + (displayCount - 1) * SLIDE_GAP_PX}px`
    : '100%';
  const slideWidth = isCarousel ? `${slideWidthPx}px` : '100%';
  const centerOffset = hasSize ? viewportWidth * 0.5 - slideWidthPx * 0.5 : 0;
  const effectiveIndex = isStatic ? 0 : slideIndex;
  const translatePx = isCarousel ? centerOffset - effectiveIndex * slideStep : 0;
  const translateOffset = `translateX(${translatePx}px)`;

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.leftPart}>
          <h1 className={styles.title}>
            {data.block.titleMain}
            <span className={styles.titleAccent}> {data.block.titleAccent}</span>
          </h1>
          <p className={styles.subtitle}>{data.block.subtitle}</p>
          <div className={styles.buttons}>
            <Button
              variant="outline"
              onClick={quoteModal.open}
              className={`${actionButtonStyles.button} ${actionButtonStyles.measurement} ${styles.heroButton}`}
              data-action-button="measurement"
            >
              Рассчитать стоимость
            </Button>
          </div>
          <div className={styles.features}>
            {data.features.map((f) => {
              const icon = f.icon ?? '';
              const isImageIcon =
                icon.startsWith('http') ||
                (icon.startsWith('/') && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(icon));
              return (
                <div key={f.id} className={styles.feature}>
                  {isImageIcon ? (
                    <img src={imageUrl(icon)} alt="" className={styles.featureIconImg} />
                  ) : icon ? (
                    <span className={styles.featureIcon}>{icon}</span>
                  ) : null}
                  <span>{f.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.imageWrapper}>
          {data.slides.length > 0 ? (
            <div className={styles.slideshow} ref={slideshowRef}>
              <div
                className={`${styles.slideshowTrack} ${noTransition ? styles.slideshowTrackNoTransition : ''}`}
                style={{
                  gap: `${SLIDE_GAP_PX}px`,
                  transform: translateOffset,
                  width: trackWidth,
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {displaySlides.map((slide, i) => (
                  <div
                    key={isCarousel && i === count ? `${slide.id}-clone` : slide.id}
                    className={styles.slideshowSlide}
                    style={{
                      backgroundImage: `url(${imageUrl(slide.imageUrl)})`,
                      flex: `0 0 ${slideWidth}`,
                    }}
                  />
                ))}
              </div>
              {showDots && (
                <div className={styles.slideDots} aria-label="Выбор слайда">
                  {data.slides.map((_, i) => (
                    <button
                      key={data.slides[i].id}
                      type="button"
                      className={`${styles.slideDot} ${effectiveIndex % count === i ? styles.slideDotActive : ''}`}
                      aria-label={`Слайд ${i + 1}`}
                      aria-pressed={effectiveIndex % count === i}
                      onClick={() => mode === 'manual' && setSlideIndex(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.imagePlaceholder}>
              <div className={styles.imageText}>3D визуализация интерьера</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
