import { useCallback } from 'react';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { EstimatePipelineTab } from '../../../../platform/estimates/estimatePipelineStage';

export function useEstimatesListNavigation(
  pathname: string,
  router: AppRouterInstance,
  searchParams: URLSearchParams,
  setPage: (page: number) => void
) {
  const navigatePipelineTab = useCallback(
    (nextTab: EstimatePipelineTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === 'active') params.delete('pipeline');
      else params.set('pipeline', nextTab);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setPage(1);
    },
    [pathname, router, searchParams, setPage]
  );

  return { navigatePipelineTab };
}
