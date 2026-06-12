'use client';

import { Suspense, use } from 'react';

import { useSearchParams } from 'next/navigation';

import { ProductEditPage } from '@/views/admin/Catalog/Products';

/**
 * key по searchParams: при повторном входе в ту же карточку Next.js может восстановить сегмент из Router Cache
 * без перемонтирования — тогда useEffect с [productId] не срабатывает и форма остаётся со старыми данными.
 * Параметр v= навигации со списка меняется каждый раз и сбрасывает кэш.
 */
function ProductEditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const remountKey = `${id}:${searchParams.toString()}`;
  return <ProductEditPage key={remountKey} productId={id} />;
}

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Загрузка…</div>}>
      <ProductEditContent params={params} />
    </Suspense>
  );
}
