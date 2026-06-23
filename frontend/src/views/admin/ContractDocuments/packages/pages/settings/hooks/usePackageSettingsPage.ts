'use client';

import { useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';

export function usePackageSettingsPage() {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return {
    isSuperAdmin,
    error,
    ok,
    setError,
    setOk,
  };
}

export type PackageSettingsPageModel = ReturnType<typeof usePackageSettingsPage>;
