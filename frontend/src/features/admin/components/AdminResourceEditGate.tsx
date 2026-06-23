'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAdminResourcePermission } from '@/features/admin/contexts/AdminAccessibleResourcesContext';

type AdminResourceEditGateProps = {
  resourceId: string;
  children: React.ReactNode;
  redirectTo?: string;
};

/** Перенаправляет с страниц создания/редактирования при уровне доступа «только просмотр». */
export function AdminResourceEditGate({
  resourceId,
  children,
  redirectTo = '/admin',
}: AdminResourceEditGateProps) {
  const router = useRouter();
  const { canEdit, isLoading } = useAdminResourcePermission(resourceId);

  useEffect(() => {
    if (!isLoading && !canEdit) {
      router.replace(redirectTo);
    }
  }, [canEdit, isLoading, redirectTo, router]);

  if (isLoading || !canEdit) {
    return null;
  }

  return <>{children}</>;
}
