import { useCallback, useMemo, useState } from 'react';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { persistEstimateWorkspacePresets } from '../estimateWorkspacePersist';
import {
  buildEstimateWorkspaceSaveBatch,
  validateEstimateWorkspaceSave,
} from '../estimateWorkspaceSave';
import {
  ESTIMATES_LIST_HREF,
  type WorkspaceBaseline,
  calculatorDraftStorageKey,
} from '../estimateWorkspaceUtils';

export type UseEstimateWorkspaceSaveParams = {
  router: AppRouterInstance;
  baseline: WorkspaceBaseline | null;
  items: ContractEstimatePreset[];
  setItems: (items: ContractEstimatePreset[]) => void;
  estimateGroups: ContractEstimateGroup[];
  setEstimateGroups: (groups: ContractEstimateGroup[]) => void;
  estimateCategories: Array<{ slug: string; name: string }>;
  estimateCategorySlugs: string[];
  estimateNameDraft: string;
  selectedEstimateId: string;
  setSelectedEstimateId: (id: string) => void;
  crmCustomerId: string | null;
  customerName: string;
  objectAddress: string;
  copyFromId: string | null;
  splitInstanceFromUrl: boolean;
  newSplitBundleFromUrl: boolean;
  joinSplitBundleIdFromUrl: string;
  fromMeasurementId: string | null;
  setCopySessionPendingSave: (value: boolean) => void;
  setError: (msg: string | null) => void;
  setOk: (msg: string | null) => void;
  setEstimateNameError: (msg: string | null) => void;
  setEstimateCustomerError: (msg: string | null) => void;
  setEstimateObjectAddressError: (msg: string | null) => void;
  setEstimateCalculatorError: (msg: string | null) => void;
  setExitConfirmOpen: (open: boolean) => void;
};

export function useEstimateWorkspaceSave({
  router,
  baseline,
  items,
  setItems,
  estimateGroups,
  setEstimateGroups,
  estimateCategories,
  estimateCategorySlugs,
  estimateNameDraft,
  selectedEstimateId,
  setSelectedEstimateId,
  crmCustomerId,
  customerName,
  objectAddress,
  copyFromId,
  splitInstanceFromUrl,
  newSplitBundleFromUrl,
  joinSplitBundleIdFromUrl,
  fromMeasurementId,
  setCopySessionPendingSave,
  setError,
  setOk,
  setEstimateNameError,
  setEstimateCustomerError,
  setEstimateObjectAddressError,
  setEstimateCalculatorError,
  setExitConfirmOpen,
}: UseEstimateWorkspaceSaveParams) {
  const [saving, setSaving] = useState(false);

  const isEditingExisting = useMemo(
    () => Boolean(selectedEstimateId) && items.some((it) => it.id === selectedEstimateId),
    [selectedEstimateId, items]
  );

  const abandonChangesAndLeave = useCallback(() => {
    if (baseline) {
      for (const slug of baseline.categorySlugs) {
        const k = calculatorDraftStorageKey(slug);
        const d = baseline.draftsByCategory[slug] ?? null;
        if (d !== null) window.localStorage.setItem(k, d);
        else window.localStorage.removeItem(k);
      }
    }
    setExitConfirmOpen(false);
    router.push(ESTIMATES_LIST_HREF);
  }, [baseline, router, setExitConfirmOpen]);

  const saveCurrentEstimate = useCallback(async () => {
    setError(null);
    setEstimateNameError(null);
    setEstimateCustomerError(null);
    setEstimateObjectAddressError(null);
    setEstimateCalculatorError(null);

    const validation = validateEstimateWorkspaceSave({
      estimateNameDraft,
      crmCustomerId,
      customerName,
      objectAddress,
      estimateCategorySlugs,
      isEditingExisting,
    });
    if (!('draftSlugs' in validation)) {
      if (validation.error) setError(validation.error);
      if (validation.estimateNameError) setEstimateNameError(validation.estimateNameError);
      if (validation.estimateCustomerError)
        setEstimateCustomerError(validation.estimateCustomerError);
      if (validation.estimateObjectAddressError) {
        setEstimateObjectAddressError(validation.estimateObjectAddressError);
      }
      if (validation.estimateCalculatorError) {
        setEstimateCalculatorError(validation.estimateCalculatorError);
      }
      return;
    }

    const { draftsByCategory, draftSlugs } = validation;

    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const { nextItem, nextItems } = await buildEstimateWorkspaceSaveBatch({
        items,
        selectedEstimateId,
        estimateNameDraft,
        crmCustomerId: crmCustomerId!,
        customerName,
        objectAddress,
        estimateCategories,
        draftsByCategory,
        draftSlugs,
        copyFromId,
        splitInstanceFromUrl,
        newSplitBundleFromUrl,
        joinSplitBundleIdFromUrl,
        fromMeasurementId,
      });
      setSelectedEstimateId(nextItem.id);
      const synced = await persistEstimateWorkspacePresets(nextItems, estimateGroups);
      setItems(synced.items);
      setEstimateGroups(synced.groups);
      setOk('Сохранено.');
      setCopySessionPendingSave(false);
      router.push('/admin/contract-documents/estimates');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
    } finally {
      setSaving(false);
    }
  }, [
    estimateNameDraft,
    crmCustomerId,
    customerName,
    objectAddress,
    estimateCategorySlugs,
    isEditingExisting,
    items,
    selectedEstimateId,
    estimateCategories,
    copyFromId,
    splitInstanceFromUrl,
    newSplitBundleFromUrl,
    joinSplitBundleIdFromUrl,
    fromMeasurementId,
    estimateGroups,
    setSelectedEstimateId,
    setItems,
    setEstimateGroups,
    setCopySessionPendingSave,
    setError,
    setOk,
    setEstimateNameError,
    setEstimateCustomerError,
    setEstimateObjectAddressError,
    setEstimateCalculatorError,
    router,
  ]);

  return { saving, isEditingExisting, saveCurrentEstimate, abandonChangesAndLeave };
}
