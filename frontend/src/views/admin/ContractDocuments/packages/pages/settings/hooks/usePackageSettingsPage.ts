'use client';

import { useState } from 'react';

import { useAuth } from '@/features/auth';

export function usePackageSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
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
