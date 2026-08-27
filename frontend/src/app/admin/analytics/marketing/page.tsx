'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

export default function AdminMarketingAnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/advertising-strategy/metrics');
  }, [router]);

  return <p style={{ padding: 24, color: 'var(--admin-text-muted)' }}>Перенаправление…</p>;
}
