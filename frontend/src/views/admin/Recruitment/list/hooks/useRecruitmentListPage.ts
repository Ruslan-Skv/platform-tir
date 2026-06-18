'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  type SalesCandidate,
  type SalesCandidateStatus,
  deleteCandidate,
  fetchCandidates,
  getFullName,
} from '@/shared/api/admin-recruitment';

export type RecruitmentListPageModel = ReturnType<typeof useRecruitmentListPage>;

export function useRecruitmentListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SalesCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalesCandidateStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [campaignId, setCampaignId] = useState<string | undefined>(
    searchParams.get('campaign') ?? undefined
  );

  const updateCampaignId = useCallback(
    (id: string | undefined) => {
      setCampaignId(id);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('campaign', id);
      else params.delete('campaign');
      const qs = params.toString();
      router.replace(qs ? `/admin/recruitment?${qs}` : '/admin/recruitment');
    },
    [router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchCandidates({
        search: search || undefined,
        status: status || undefined,
        campaignId,
        page,
        limit: 20,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, status, page, campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить кандидата «${name}»?`)) return;
    try {
      await deleteCandidate(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка удаления');
    }
  };

  const analyticsHref = campaignId
    ? `/admin/recruitment/analytics?campaign=${encodeURIComponent(campaignId)}`
    : '/admin/recruitment/analytics';

  return {
    router,
    items,
    loading,
    error,
    search,
    setSearch,
    setPage,
    status,
    setStatus,
    page,
    totalPages,
    campaignId,
    updateCampaignId,
    load,
    handleDelete,
    analyticsHref,
    getFullName,
  };
}
