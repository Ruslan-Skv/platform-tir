import { useEffect } from 'react';

export function useEstimateWorkspaceActiveCategory(
  estimateCategorySlugs: string[],
  activeCategorySlug: string,
  setActiveCategorySlug: (slug: string) => void
) {
  useEffect(() => {
    if (estimateCategorySlugs.length === 0) {
      if (activeCategorySlug) setActiveCategorySlug('');
      return;
    }
    if (!estimateCategorySlugs.includes(activeCategorySlug)) {
      setActiveCategorySlug(estimateCategorySlugs[0]);
    }
  }, [estimateCategorySlugs, activeCategorySlug, setActiveCategorySlug]);
}
