'use client';

import Link from 'next/link';

import { ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF } from '@/views/admin/ContractDocuments/contractDocumentsContractsRoutes';

import styles from './ContractDocuments.module.css';

export function ContractDocumentsDirectionPlaceholderPage({ title }: { title: string }) {
  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href={ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}>
        ← Договора
      </Link>
      <h1 className={styles.title} style={{ marginTop: 8 }}>
        Договора — {title}
      </h1>
      <p className={styles.subtitle}>Раздел будет добавлен позже.</p>
    </div>
  );
}
