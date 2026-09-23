import { useCallback, useMemo, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  type EstimateWorkspacePreviewResult,
  buildEstimatePresetPreviewModel,
} from '../../workspace/estimateWorkspacePreview';

export type EstimatesListPreview = {
  /** Расчёт, для которого открыт предпросмотр (null — закрыт / пресет исчез). */
  preset: ContractEstimatePreset | null;
  result: EstimateWorkspacePreviewResult | null;
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

  const preset = useMemo(
    () => (previewPresetId == null ? null : (items.find((x) => x.id === previewPresetId) ?? null)),
    [previewPresetId, items]
  );
  const result = useMemo(
    () => (preset ? buildEstimatePresetPreviewModel(preset, groups) : null),
    [preset, groups]
  );

  const open = useCallback((presetId: string) => setPreviewPresetId(presetId), []);
  const close = useCallback(() => setPreviewPresetId(null), []);

  return { preset, result, open, close };
}
