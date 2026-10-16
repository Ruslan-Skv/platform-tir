'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import {
  type InstallerAdvanceSheetItemParams,
  createInstallerAdvanceSheet,
} from '@/shared/api/crm/admin-installer-advance-sheets';

import { isIasSheetAuthor } from '../shared/installer-advance-sheets-page.constants';

export function useInstallerAdvanceSheetCreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const canCreateSheets = isIasSheetAuthor(user?.role);

  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInstallers()
      .then((registry) => {
        if (!cancelled) setInstallers(registry);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : 'Не удалось загрузить справочник мастеров'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(
    async (values: {
      installerId: string;
      note?: string;
      items: InstallerAdvanceSheetItemParams[];
    }) => {
      setSubmitting(true);
      try {
        const created = await createInstallerAdvanceSheet(values);
        router.push(`/admin/installer-advance-sheets/${created.id}`);
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  return {
    canCreateSheets,
    installers,
    loading,
    submitting,
    message,
    submit,
  };
}

export type InstallerAdvanceSheetCreatePageModel = ReturnType<
  typeof useInstallerAdvanceSheetCreatePage
>;
