'use client';

import { use, useEffect } from 'react';

import { useRouter } from 'next/navigation';

export default function AdminCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/admin/catalog/categories?edit=${encodeURIComponent(id)}`);
  }, [id, router]);

  return null;
}
