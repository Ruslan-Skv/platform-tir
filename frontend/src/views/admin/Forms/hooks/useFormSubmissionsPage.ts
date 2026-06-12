'use client';

import { useCallback, useEffect, useState } from 'react';

import { type AdminFormSubmission, getAdminFormSubmissions } from '@/shared/api/admin-forms';

export function useFormSubmissionsPage() {
  const [submissions, setSubmissions] = useState<AdminFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<
    'measurement' | 'callback' | 'director' | 'quote' | ''
  >('');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminFormSubmissions(1, 100, typeFilter || undefined);
      setSubmissions(res.data);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return {
    submissions,
    loading,
    typeFilter,
    setTypeFilter,
    loadSubmissions,
  };
}

export type FormSubmissionsPageModel = ReturnType<typeof useFormSubmissionsPage>;
