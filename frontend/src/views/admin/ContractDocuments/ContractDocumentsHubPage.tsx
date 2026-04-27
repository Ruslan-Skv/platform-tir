'use client';

import Link from 'next/link';

import styles from './ContractDocuments.module.css';

export function ContractDocumentsHubPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Оформление договоров</h1>
      <p className={styles.subtitle}>
        Выберите направление. Для каждого направления — свой набор вкладок и шаблонов, как в
        Excel-книге.
      </p>
      <div className={styles.hubGrid}>
        <Link className={styles.hubCard} href="/admin/contract-documents/instruction">
          <h2 className={styles.hubCardTitle}>Инструкция по работе с разделом</h2>
          <p className={styles.hubCardHint}>
            Плейсхолдеры, Excel, CRM, печать и хранение шаблонов — всё в одном месте.
          </p>
        </Link>
        <Link className={styles.hubCard} href="/admin/contract-documents/repair">
          <h2 className={styles.hubCardTitle}>Ремонт</h2>
          <p className={styles.hubCardHint}>
            Договор, смета, акты, ПКО, анкеты, заказ-наряды и др.
          </p>
        </Link>
        <div className={`${styles.hubCard} ${styles.hubCardDisabled}`}>
          <h2 className={styles.hubCardTitle}>Окна</h2>
          <p className={styles.hubCardHint}>Раздел будет добавлен позже.</p>
        </div>
        <div className={`${styles.hubCard} ${styles.hubCardDisabled}`}>
          <h2 className={styles.hubCardTitle}>Двери</h2>
          <p className={styles.hubCardHint}>Раздел будет добавлен позже.</p>
        </div>
        <div className={`${styles.hubCard} ${styles.hubCardDisabled}`}>
          <h2 className={styles.hubCardTitle}>Потолки</h2>
          <p className={styles.hubCardHint}>Раздел будет добавлен позже.</p>
        </div>
        <div className={`${styles.hubCard} ${styles.hubCardDisabled}`}>
          <h2 className={styles.hubCardTitle}>Жалюзи</h2>
          <p className={styles.hubCardHint}>Раздел будет добавлен позже.</p>
        </div>
        <div className={`${styles.hubCard} ${styles.hubCardDisabled}`}>
          <h2 className={styles.hubCardTitle}>Мебель</h2>
          <p className={styles.hubCardHint}>Раздел будет добавлен позже.</p>
        </div>
      </div>
    </div>
  );
}
