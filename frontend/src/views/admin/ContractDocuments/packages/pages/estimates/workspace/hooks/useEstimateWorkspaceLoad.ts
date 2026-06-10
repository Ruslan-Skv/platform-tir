import { useEffect, useRef, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimateCrmCustomerFields } from '../../../../platform/estimates/estimateCrmCustomer';
import {
  type EstimateWorkspaceLoadParams,
  loadEstimateWorkspaceSession,
} from '../estimateWorkspaceLoad';
import type { WorkspaceBaseline } from '../estimateWorkspaceUtils';

export type UseEstimateWorkspaceLoadParams = EstimateWorkspaceLoadParams & {
  applyCustomerFromLoader: (fields: EstimateCrmCustomerFields) => void;
  resetCustomerLoadGuard: () => void;
  setError: (msg: string | null) => void;
  setOk: (msg: string | null) => void;
};

export function useEstimateWorkspaceLoad({
  estimateIdFromUrl,
  copyFromId,
  splitInstanceFromUrl,
  fromMeasurementId,
  applyCustomerFromLoader,
  resetCustomerLoadGuard,
  setError,
  setOk,
}: UseEstimateWorkspaceLoadParams) {
  const workspaceLoadGenRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [estimateGroups, setEstimateGroups] = useState<ContractEstimateGroup[]>([]);
  const [estimateCategories, setEstimateCategories] = useState<
    Array<{ slug: string; name: string }>
  >([]);
  const [estimateCategorySlugs, setEstimateCategorySlugs] = useState<string[]>([]);
  const [activeCategorySlug, setActiveCategorySlug] = useState('');
  const [estimateNameDraft, setEstimateNameDraft] = useState('');
  const [selectedEstimateId, setSelectedEstimateId] = useState('');
  const [baseline, setBaseline] = useState<WorkspaceBaseline | null>(null);
  const [copySessionPendingSave, setCopySessionPendingSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadGen = ++workspaceLoadGenRef.current;
    resetCustomerLoadGuard();

    void (async () => {
      setLoading(true);
      setError(null);
      setOk(null);
      setBaseline(null);
      setCopySessionPendingSave(false);
      try {
        const result = await loadEstimateWorkspaceSession(
          { estimateIdFromUrl, copyFromId, splitInstanceFromUrl, fromMeasurementId },
          (fields) => {
            if (cancelled || workspaceLoadGenRef.current !== loadGen) return;
            applyCustomerFromLoader(fields);
          }
        );
        if (cancelled || workspaceLoadGenRef.current !== loadGen) return;
        setItems(result.items);
        setEstimateGroups(result.groups);
        setEstimateCategories(result.categories);
        setEstimateCategorySlugs(result.estimateCategorySlugs);
        setActiveCategorySlug(result.activeCategorySlug);
        setEstimateNameDraft(result.estimateNameDraft);
        setSelectedEstimateId(result.selectedEstimateId);
        setCopySessionPendingSave(result.copySessionPendingSave);
        setBaseline(result.baseline);
        if (result.error) setError(result.error);
      } catch (e) {
        if (!cancelled && workspaceLoadGenRef.current === loadGen) {
          setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
        }
      } finally {
        if (!cancelled && workspaceLoadGenRef.current === loadGen) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    estimateIdFromUrl,
    copyFromId,
    splitInstanceFromUrl,
    fromMeasurementId,
    applyCustomerFromLoader,
    resetCustomerLoadGuard,
    setError,
    setOk,
  ]);

  return {
    loading,
    items,
    setItems,
    estimateGroups,
    setEstimateGroups,
    estimateCategories,
    estimateCategorySlugs,
    setEstimateCategorySlugs,
    activeCategorySlug,
    setActiveCategorySlug,
    estimateNameDraft,
    setEstimateNameDraft,
    selectedEstimateId,
    setSelectedEstimateId,
    baseline,
    setBaseline,
    copySessionPendingSave,
    setCopySessionPendingSave,
  };
}
