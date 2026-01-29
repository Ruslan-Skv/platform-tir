'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import styles from './HeroSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface HeroData {
  block: { titleMain: string; titleAccent: string; subtitle: string };
  slides: { id: string; imageUrl: string; sortOrder: number }[];
  features: { id: string; icon: string; title: string; sortOrder: number }[];
}

const DEFAULT_DATA: HeroData = {
  block: {
    titleMain: 'Создаем интерьеры мечты',
    titleAccent: 'в Мурманске',
    subtitle:
      'Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки, жалюзи, мягкая мебель, кровати, матрасы .....',
  },
  slides: [],
  features: [
    { id: '1', icon: '🏭', title: 'Собственное производство', sortOrder: 0 },
    { id: '2', icon: '📐', title: 'Бесплатный замер', sortOrder: 1 },
    { id: '3', icon: '🛡️', title: 'Гарантия 3 года', sortOrder: 2 },
    { id: '4', icon: '⚡', title: 'Сроки от 1 дня', sortOrder: 3 },
  ],
};

const SLIDE_INTERVAL_MS = 5000;

export const HeroSection: React.FC = () => {
  const router = useRouter();
  const slideshowRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeroData>(DEFAULT_DATA);
  const [slideIndex, setSlideIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const count = data.slides.length;
  const displaySlides = count > 1 ? [...data.slides, data.slides[0]] : data.slides;
  const displayCount = displaySlides.length;

  useEffect(() => {
    fetch(`${API_URL}/home/hero`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d: HeroData | null) => {
        if (d?.block) setData(d);
      })
      .catch(() => {});
  }, []);

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
    if (count <= 1) return;
    setSlideIndex((i) => (i + 1) % displayCount);
  }, [count, displayCount]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(goNext, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, goNext]);

  const handleTransitionEnd = useCallback(() => {
    if (slideIndex === count) {
      setNoTransition(true);
      setSlideIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setNoTransition(false));
      });
    }
  }, [slideIndex, count]);

  const imageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = API_URL.replace(/\/api\/v1\/?$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const GAP_PX = 0;
  const SLIDE_OVERLAP_PX = 48;
  const SLIDE_WIDTH_RATIO = 0.75;
  const hasSize = viewportWidth > 0;
  const slideWidthPx = hasSize ? viewportWidth * SLIDE_WIDTH_RATIO : 300;
  const slideStep = slideWidthPx - SLIDE_OVERLAP_PX;
  const trackWidth =
    count > 1 ? `${displayCount * slideWidthPx - (displayCount - 1) * SLIDE_OVERLAP_PX}px` : '100%';
  const slideWidth = count > 1 ? `${slideWidthPx}px` : '100%';
  const centerOffset = hasSize ? viewportWidth * 0.5 - slideWidthPx * 0.5 : 0;
  const translatePx = count > 1 ? centerOffset - slideIndex * slideStep : 0;
  const translateOffset = `translateX(${translatePx}px)`;

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {data.block.titleMain}
            <span className={styles.titleAccent}> {data.block.titleAccent}</span>
          </h1>
        </div>

        <div className={styles.contentWrapper}>
          <div className={styles.content}>
            <p className={styles.subtitle}>{data.block.subtitle}</p>
            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => router.push('/constructor')}
              >
                Рассчитать стоимость
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push('/contact')}
              >
                Вызвать замерщика
              </button>
            </div>
            <div className={styles.features}>
              {data.features.map((f) => (
                <div key={f.id} className={styles.feature}>
                  {f.icon.startsWith('http') || f.icon.startsWith('/') ? (
                    <img src={imageUrl(f.icon)} alt="" className={styles.featureIconImg} />
                  ) : (
                    <span className={styles.featureIcon}>{f.icon}</span>
                  )}
                  <span>{f.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.imageWrapper}>
            {data.slides.length > 0 ? (
              <div className={styles.slideshow} ref={slideshowRef}>
                <div
                  className={`${styles.slideshowTrack} ${noTransition ? styles.slideshowTrackNoTransition : ''}`}
                  style={{
                    gap: 0,
                    transform: translateOffset,
                    width: trackWidth,
                  }}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {displaySlides.map((slide, i) => (
                    <div
                      key={i < count ? slide.id : `${slide.id}-clone`}
                      className={styles.slideshowSlide}
                      style={{
                        backgroundImage: `url(${imageUrl(slide.imageUrl)})`,
                        flex: `0 0 ${slideWidth}`,
                        marginRight:
                          count > 1 && i < displayCount - 1 ? `-${SLIDE_OVERLAP_PX}px` : 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.imagePlaceholder}>
                <div className={styles.imageText}>3D визуализация интерьера</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
