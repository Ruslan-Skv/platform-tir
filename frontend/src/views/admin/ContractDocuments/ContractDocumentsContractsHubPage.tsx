'use client';

import Link from 'next/link';

import {
  ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF,
  ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_REPAIR_HREF,
} from '@/views/admin/ContractDocuments/contractDocumentsContractsRoutes';

import styles from './ContractDocuments.module.css';

const DIRECTIONS: { href: string; title: string; hint: string; ready: boolean }[] = [
  {
    href: ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_REPAIR_HREF,
    title: 'Ремонт',
    hint: 'Договор, смета, акты, ПКО, анкеты, заказ-наряды и др.',
    ready: true,
  },
  {
    href: `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/windows`,
    title: 'Окна',
    hint: 'Раздел будет добавлен позже.',
    ready: false,
  },
  {
    href: `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/doors`,
    title: 'Двери',
    hint: 'Раздел будет добавлен позже.',
    ready: false,
  },
  {
    href: `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/ceilings`,
    title: 'Потолки',
    hint: 'Раздел будет добавлен позже.',
    ready: false,
  },
  {
    href: `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/blinds`,
    title: 'Жалюзи',
    hint: 'Раздел будет добавлен позже.',
    ready: false,
  },
  {
    href: `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/furniture`,
    title: 'Мебель',
    hint: 'Раздел будет добавлен позже.',
    ready: false,
  },
];

export function ContractDocumentsContractsHubPage() {
  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href="/admin/contract-documents">
        ← К разделу «Оформление договоров»
      </Link>
      <h1 className={styles.title} style={{ marginTop: 8 }}>
        Договора
      </h1>
      <p className={styles.subtitle}>
        Выберите направление. Для каждого направления — свой набор вкладок и шаблонов.
      </p>
      <div className={styles.hubGrid}>
        {DIRECTIONS.map((d) => (
          <Link
            key={d.href}
            className={`${styles.hubCard} ${d.ready ? '' : styles.hubCardMuted}`}
            href={d.href}
          >
            <h2 className={styles.hubCardTitle}>{d.title}</h2>
            <p className={styles.hubCardHint}>{d.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
