import type { EstimateCrmCustomerFields } from '../../../platform/estimates/estimateCrmCustomer';
import {
  type WorkspaceBaseline,
  calculatorDraftStorageKey,
  normalizeUniqueCategorySlugs,
} from './estimateWorkspaceUtils';

export type EstimateWorkspaceDirtyStateParams = {
  copySessionPendingSave: boolean;
  baseline: WorkspaceBaseline | null;
  estimateCategorySlugs: string[];
  estimateNameDraft: string;
  crmCustomerId: string | null;
  customerName: string;
  objectAddress: string;
  draftPollTick: number;
};

export function isEstimateWorkspaceDirty({
  copySessionPendingSave,
  baseline,
  estimateCategorySlugs,
  estimateNameDraft,
  crmCustomerId,
  customerName,
  objectAddress,
}: Omit<EstimateWorkspaceDirtyStateParams, 'draftPollTick'>): boolean {
  if (copySessionPendingSave) return true;
  if (!baseline) return false;
  const selectedSlugs = normalizeUniqueCategorySlugs(estimateCategorySlugs);
  const baselineSlugs = normalizeUniqueCategorySlugs(baseline.categorySlugs);
  const sameSlugs =
    selectedSlugs.length === baselineSlugs.length &&
    selectedSlugs.every((slug, idx) => slug === baselineSlugs[idx]);
  if (!sameSlugs) return true;
  if (estimateNameDraft !== baseline.name) return true;
  if ((crmCustomerId ?? '') !== (baseline.customer.crmCustomerId ?? '')) return true;
  if (customerName !== baseline.customer.customerName) return true;
  if (objectAddress !== baseline.customer.objectAddress) return true;
  for (const slug of selectedSlugs) {
    const currentDraft = window.localStorage.getItem(calculatorDraftStorageKey(slug));
    const baselineDraft = baseline.draftsByCategory[slug] ?? null;
    if ((currentDraft ?? '') !== (baselineDraft ?? '')) return true;
  }
  return false;
}

export function estimateWorkspaceCustomerDirty(
  baseline: WorkspaceBaseline,
  fields: EstimateCrmCustomerFields
): boolean {
  return (
    (fields.crmCustomerId ?? '') !== (baseline.customer.crmCustomerId ?? '') ||
    fields.customerName !== baseline.customer.customerName ||
    fields.objectAddress !== baseline.customer.objectAddress
  );
}
