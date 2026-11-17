'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { MeetingsPageView } from './MeetingsPageView';
import { useMeetingsPage } from './hooks/useMeetingsPage';

function MeetingsPageInner() {
  const params = useSearchParams();
  const joinId = params?.get('join');
  const model = useMeetingsPage(joinId);
  return <MeetingsPageView model={model} />;
}

/** Раздел «Онлайн-собрания»: список + вход в комнату по ?join={id}. */
export function MeetingsPage() {
  return (
    <Suspense fallback={null}>
      <MeetingsPageInner />
    </Suspense>
  );
}
