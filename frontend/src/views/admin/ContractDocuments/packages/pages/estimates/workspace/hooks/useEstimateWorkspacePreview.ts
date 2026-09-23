import { useCallback, useRef, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  type EstimateWorkspacePreviewModel,
  buildEstimateWorkspacePreview,
} from '../estimateWorkspacePreview';

export type EstimateWorkspacePreview = {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  model: EstimateWorkspacePreviewModel | null;
  open: () => void;
  close: () => void;
};

export type UseEstimateWorkspacePreviewParams = {
  estimateCategorySlugs: string[];
  estimateCategories: Array<{ slug: string; name: string }>;
  estimateGroups: ContractEstimateGroup[];
  additionalMarkupRaw: string;
  selectedEstimateId: string;
  items: ContractEstimatePreset[];
};

/** Предпросмотр текущего расчёта «как во вкладке «Смета»/«Счёт-заказ» договора» — без сохранения и прикрепления. */
export function useEstimateWorkspacePreview({
  estimateCategorySlugs,
  estimateCategories,
  estimateGroups,
  additionalMarkupRaw,
  selectedEstimateId,
  items,
}: UseEstimateWorkspacePreviewParams): EstimateWorkspacePreview {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<EstimateWorkspacePreviewModel | null>(null);
  const openGenRef = useRef(0);

  const open = useCallback(() => {
    const gen = ++openGenRef.current;
    setIsOpen(true);
    setLoading(true);
    setError(null);

    const existingPreset = selectedEstimateId
      ? items.find((it) => it.id === selectedEstimateId)
      : undefined;

    void (async () => {
      const result = await buildEstimateWorkspacePreview({
        estimateCategorySlugs,
        estimateCategories,
        estimateGroups,
        additionalMarkupRaw,
        existingPreset,
      });
      if (gen !== openGenRef.current) return;
      setLoading(false);
      if ('model' in result) {
        setModel(result.model);
      } else {
        setModel(null);
        setError(result.error);
      }
    })();
  }, [
    estimateCategorySlugs,
    estimateCategories,
    estimateGroups,
    additionalMarkupRaw,
    selectedEstimateId,
    items,
  ]);

  const close = useCallback(() => {
    openGenRef.current++;
    setIsOpen(false);
  }, []);

  return { isOpen, loading, error, model, open, close };
}
