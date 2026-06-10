import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  estimateWorkspaceCustomerDirty,
  isEstimateWorkspaceDirty,
} from '../estimateWorkspaceDirtyState';
import {
  type WorkspaceBaseline,
  calculatorDraftStorageKey,
  countCalculatorSelectedLines,
  normalizeUniqueCategorySlugs,
} from '../estimateWorkspaceUtils';

export type UseEstimateWorkspaceDirtyStateParams = {
  copySessionPendingSave: boolean;
  baseline: WorkspaceBaseline | null;
  estimateCategorySlugs: string[];
  estimateNameDraft: string;
  crmCustomerId: string | null;
  customerName: string;
  objectAddress: string;
  estimateCalculatorError: string | null;
  setEstimateCalculatorError: (value: string | null) => void;
};

export function useEstimateWorkspaceDirtyState({
  copySessionPendingSave,
  baseline,
  estimateCategorySlugs,
  estimateNameDraft,
  crmCustomerId,
  customerName,
  objectAddress,
  estimateCalculatorError,
  setEstimateCalculatorError,
}: UseEstimateWorkspaceDirtyStateParams) {
  const [draftPollTick, setDraftPollTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setDraftPollTick((n) => n + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!estimateCalculatorError) return;
    const draftsByCategory: Record<string, string> = {};
    for (const slug of normalizeUniqueCategorySlugs(estimateCategorySlugs)) {
      const draft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
      if (draft) draftsByCategory[slug] = draft;
    }
    if (countCalculatorSelectedLines(draftsByCategory) > 0) {
      setEstimateCalculatorError(null);
    }
  }, [draftPollTick, estimateCalculatorError, estimateCategorySlugs, setEstimateCalculatorError]);

  const dirty = useMemo(
    () =>
      isEstimateWorkspaceDirty({
        copySessionPendingSave,
        baseline,
        estimateCategorySlugs,
        estimateNameDraft,
        crmCustomerId,
        customerName,
        objectAddress,
      }),
    [
      copySessionPendingSave,
      baseline,
      estimateCategorySlugs,
      estimateNameDraft,
      draftPollTick,
      crmCustomerId,
      customerName,
      objectAddress,
    ]
  );

  useEffect(() => {
    if (!baseline && !copySessionPendingSave) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (copySessionPendingSave) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      if (!baseline) return;
      const selectedSlugs = normalizeUniqueCategorySlugs(estimateCategorySlugs);
      const baselineSlugs = normalizeUniqueCategorySlugs(baseline.categorySlugs);
      const sameSlugs =
        selectedSlugs.length === baselineSlugs.length &&
        selectedSlugs.every((slug, idx) => slug === baselineSlugs[idx]);
      let draftsDirty = false;
      for (const slug of selectedSlugs) {
        const currentDraft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
        const baselineDraft = baseline.draftsByCategory[slug] ?? null;
        if ((currentDraft ?? '') !== (baselineDraft ?? '')) {
          draftsDirty = true;
          break;
        }
      }
      const customerDirty = estimateWorkspaceCustomerDirty(baseline, {
        crmCustomerId,
        customerName,
        objectAddress,
      });
      const isDirty =
        !sameSlugs || estimateNameDraft !== baseline.name || draftsDirty || customerDirty;
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [
    baseline,
    copySessionPendingSave,
    estimateCategorySlugs,
    estimateNameDraft,
    crmCustomerId,
    customerName,
    objectAddress,
  ]);

  return { dirty, draftPollTick };
}
