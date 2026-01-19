'use client';

import React from 'react';

import { useRouter } from 'next/navigation';

import styles from './HeroSection.module.css';

export const HeroSection: React.FC = () => {
  const router = useRouter();

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        {/* Заголовок в отдельной строке */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            Создаем интерьеры мечты
            <span className={styles.titleAccent}> в Мурманске</span>
          </h1>
        </div>

        {/* Основной контент в двух колонках */}
        <div className={styles.contentWrapper}>
          <div className={styles.content}>
            <p className={styles.subtitle}>
              Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки,
              жалюзи, мягкая мебель, кровати, матрасы .....
            </p>
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
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🏭</span>
                <span>Собственное производство</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>📐</span>
                <span>Бесплатный замер</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>🛡️</span>
                <span>Гарантия 3 года</span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>⚡</span>
                <span>Сроки от 1 дня</span>
              </div>
            </div>
          </div>

          <div className={styles.imageWrapper}>
            <div className={styles.imagePlaceholder}>
              {/* Можно добавить реальное изображение или 3D сцену */}
              <div className={styles.imageText}>3D визуализация интерьера</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
