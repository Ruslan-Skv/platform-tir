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
        <Link className={styles.hubCard} href="/admin/contract-documents/requisites">
          <h2 className={styles.hubCardTitle}>Исполнители</h2>
          <p className={styles.hubCardHint}>
            Наборы реквизитов Исполнителя для быстрого выбора в договоре.
          </p>
        </Link>
        <Link className={styles.hubCard} href="/admin/contract-documents/signatories">
          <h2 className={styles.hubCardTitle}>Менеджеры</h2>
          <p className={styles.hubCardHint}>
            Карточки менеджера для договоров: ФИО, основание полномочий, офис продаж и связь с CRM.
          </p>
        </Link>
        <Link className={styles.hubCard} href="/admin/contract-documents/templates">
          <h2 className={styles.hubCardTitle}>Библиотека шаблонов</h2>
          <p className={styles.hubCardHint}>
            Договор, акты, ПКО и производственный журнал для направления «Ремонт».
          </p>
        </Link>
        <Link className={styles.hubCard} href="/admin/contract-documents/settings">
          <h2 className={styles.hubCardTitle}>Сроки договоров</h2>
          <p className={styles.hubCardHint}>
            Срок по умолчанию для «Ремонт» и «Окна» (рабочие дни); меняет только суперадмин.
          </p>
        </Link>
      </div>
    </div>
  );
}
