import { useCallback } from 'react';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type { EstimatePipelineTab } from '../../../../platform/estimates/estimatePipelineStage';

export function useEstimatesListNavigation(
  pathname: string,
  router: AppRouterInstance,
  searchParams: URLSearchParams,
  setPage: (page: number) => void
) {
  const navigateArchiveView = useCallback(
    (nextArchive: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextArchive) {
        params.set('archive', '1');
        params.delete('pipeline');
      } else params.delete('archive');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const navigatePipelineTab = useCallback(
    (nextTab: EstimatePipelineTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === 'prospect') params.set('pipeline', 'prospect');
      else params.delete('pipeline');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      setPage(1);
    },
    [pathname, router, searchParams, setPage]
  );

  return { navigateArchiveView, navigatePipelineTab };
}
