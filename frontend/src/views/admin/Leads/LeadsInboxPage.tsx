'use client';

import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { LeadsInboxPageView } from './LeadsInboxPageView';
import { useLeadsInboxPage } from './hooks/useLeadsInboxPage';

export function LeadsInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const model = useLeadsInboxPage();

  useEffect(() => {
    if (searchParams.get('source') === 'form_director') {
      router.replace('/admin/director-messages');
    }
  }, [router, searchParams]);

  if (searchParams.get('source') === 'form_director') {
    return <p>Перенаправление...</p>;
  }

  return <LeadsInboxPageView model={{ ...model, setPage: (page) => model.setPage(page) }} />;
}
