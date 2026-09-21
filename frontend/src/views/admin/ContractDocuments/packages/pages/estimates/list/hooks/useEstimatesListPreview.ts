import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  type EstimateWorkspacePreviewResult,
  buildEstimatePresetPreviewModel,
  loadEstimatePreviewDirectorName,
} from '../../workspace/estimateWorkspacePreview';

export type EstimatesListPreview = {
  /** Расчёт, для которого открыт предпросмотр (null — закрыт / пресет исчез). */
  preset: ContractEstimatePreset | null;
  result: EstimateWorkspacePreviewResult | null;
  /** Директор из карточек подписантов «Ремонт» — для блока подписей как в договоре. */
  directorName: string;
  open: (presetId: string) => void;
  close: () => void;
};

/** Быстрый предпросмотр расчёта из списка: модель собирается из сохранённого снимка пресета. */
export function useEstimatesListPreview({
  items,
  groups,
}: {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
}): EstimatesListPreview {
  const [previewPresetId, setPreviewPresetId] = useState<string | null>(null);
  const [directorName, setDirectorName] = useState('');

  const preset = useMemo(
    () => (previewPresetId == null ? null : (items.find((x) => x.id === previewPresetId) ?? null)),
    [previewPresetId, items]
  );
  const result = useMemo(
    () => (preset ? buildEstimatePresetPreviewModel(preset, groups) : null),
    [preset, groups]
  );

  useEffect(() => {
    if (preset == null) return;
    let cancelled = false;
    void loadEstimatePreviewDirectorName().then((name) => {
      if (!cancelled) setDirectorName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [preset]);

  const open = useCallback((presetId: string) => setPreviewPresetId(presetId), []);
  const close = useCallback(() => setPreviewPresetId(null), []);

  return { preset, result, directorName, open, close };
}
