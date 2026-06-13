'use client';

import styles from './HomeSectionsPage.module.css';
import { HomeSectionsSection } from './HomeSectionsSection';

export function HomeSectionsPageView() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Главная страница</h1>
        <p className={styles.subtitle}>Управление секциями главной страницы сайта</p>
      </header>
      <HomeSectionsSection />
    </div>
  );
}
