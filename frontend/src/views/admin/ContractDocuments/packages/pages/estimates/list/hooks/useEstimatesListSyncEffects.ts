import { useEffect } from 'react';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';

import type { EstimatesListViewMode } from '../estimatesListFilters';
import {
  type EstimateLayoutBlock,
  isExpandedAddressKeyVisibleInLayout,
} from '../estimatesListLayout';

export type UseEstimatesListSyncEffectsParams = {
  loading: boolean;
  listViewMode: EstimatesListViewMode;
  expandedAddressKeys: string[];
  setExpandedAddressKeys: (keys: string[]) => void;
  estimateLayoutBlocks: EstimateLayoutBlock[];
  managerFilter: string;
  setManagerFilter: (value: string) => void;
  managerOptions: ContractSignatoryProfile[];
  workScopeModalPresetId: string | null;
  setWorkScopeModalPresetId: (id: string | null) => void;
  copyChoicePresetId: string | null;
  setCopyChoicePresetId: (id: string | null) => void;
  items: ContractEstimatePreset[];
  totalTableRows: number;
  limit: number;
  page: number;
  setPage: (page: number) => void;
};

export function useEstimatesListSyncEffects({
  loading,
  listViewMode,
  expandedAddressKeys,
  setExpandedAddressKeys,
  estimateLayoutBlocks,
  managerFilter,
  setManagerFilter,
  managerOptions,
  workScopeModalPresetId,
  setWorkScopeModalPresetId,
  copyChoicePresetId,
  setCopyChoicePresetId,
  items,
  totalTableRows,
  limit,
  page,
  setPage,
}: UseEstimatesListSyncEffectsParams) {
  useEffect(() => {
    if (loading || listViewMode !== 'by_object' || expandedAddressKeys.length === 0) return;
    const visibleKeys = expandedAddressKeys.filter((key) =>
      isExpandedAddressKeyVisibleInLayout(estimateLayoutBlocks, key)
    );
    if (visibleKeys.length !== expandedAddressKeys.length) {
      setExpandedAddressKeys(visibleKeys);
    }
  }, [loading, listViewMode, estimateLayoutBlocks, expandedAddressKeys, setExpandedAddressKeys]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalTableRows / limit));
    if (page > totalPages) setPage(totalPages);
  }, [totalTableRows, limit, page, setPage]);

  useEffect(() => {
    if (!managerFilter) return;
    if (!managerOptions.some((p) => p.crmUserId === managerFilter)) {
      setManagerFilter('');
    }
  }, [managerFilter, managerOptions, setManagerFilter]);

  useEffect(() => {
    if (workScopeModalPresetId && !items.some((x) => x.id === workScopeModalPresetId)) {
      setWorkScopeModalPresetId(null);
    }
  }, [workScopeModalPresetId, items, setWorkScopeModalPresetId]);

  useEffect(() => {
    if (copyChoicePresetId && !items.some((x) => x.id === copyChoicePresetId)) {
      setCopyChoicePresetId(null);
    }
  }, [copyChoicePresetId, items, setCopyChoicePresetId]);
}
