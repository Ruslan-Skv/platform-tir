'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { type ComparisonAnalytics, fetchComparisonAnalytics } from '@/shared/api/admin-recruitment';

export type RecruitmentAnalyticsPageModel = ReturnType<typeof useRecruitmentAnalyticsPage>;

export function useRecruitmentAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ComparisonAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaignId, setCampaignId] = useState<string | undefined>(
    searchParams.get('campaign') ?? undefined
  );

  const updateCampaignId = useCallback(
    (id: string | undefined) => {
      setCampaignId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('campaign', id);
      else params.delete('campaign');
      const qs = params.toString();
      router.replace(qs ? `/admin/recruitment/analytics?${qs}` : '/admin/recruitment/analytics');
    },
    [router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchComparisonAnalytics(campaignId);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const listHref = campaignId
    ? `/admin/recruitment?campaign=${encodeURIComponent(campaignId)}`
    : '/admin/recruitment';

  return {
    router,
    data,
    loading,
    error,
    campaignId,
    updateCampaignId,
    load,
    listHref,
  };
}
