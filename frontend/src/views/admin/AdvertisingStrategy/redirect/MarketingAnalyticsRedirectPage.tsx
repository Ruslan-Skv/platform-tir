'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import styles from './MarketingAnalyticsRedirectPage.module.css';

export function MarketingAnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/advertising-strategy/metrics');
  }, [router]);

  return <p className={styles.message}>Перенаправление…</p>;
}
