import { useEffect, useState } from 'react';

import { parseOptionalPercentInput } from '../../list/estimatesListUtils';
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
  additionalMarkupRaw: string;
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
  additionalMarkupRaw,
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

  // Черновики калькулятора живут в localStorage, а не в React-состоянии:
  // считаем dirty на каждом рендере, включая тик поллинга (draftPollTick),
  // иначе правки только в калькуляторе не показывают кнопку сохранения.
  const dirty = isEstimateWorkspaceDirty({
    copySessionPendingSave,
    baseline,
    estimateCategorySlugs,
    estimateNameDraft,
    crmCustomerId,
    customerName,
    objectAddress,
    additionalMarkupRaw,
  });

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
      const markupDirty =
        parseOptionalPercentInput(additionalMarkupRaw) !== baseline.additionalMarkupPercent;
      const isDirty =
        !sameSlugs ||
        estimateNameDraft !== baseline.name ||
        draftsDirty ||
        customerDirty ||
        markupDirty;
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
    additionalMarkupRaw,
  ]);

  return { dirty, draftPollTick };
}
