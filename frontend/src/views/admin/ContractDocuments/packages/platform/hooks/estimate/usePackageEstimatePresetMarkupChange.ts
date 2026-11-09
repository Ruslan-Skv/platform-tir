'use client';

import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { putContractDocumentEstimatePresets } from '@/shared/api/admin-contract-document-packages';

import {
  clampEstimateAdditionalMarkupPercent,
  parseOptionalPercentInput,
  recomputePackageEstimateSnapshots,
} from '../../estimates/applyEstimatePresetIds';
import { estimatePresetsCatalogKind } from '../../estimates/estimatePresetsCatalogKind';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageEstimatePresetMarkupChangeOptions = {
  signedDocsLocked: boolean;
  packageKind: ContractDocumentPackageKind;
  productDirection: boolean;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  /** Расчёты, прикреплённые к подписанным договорам/Д/с — наценка не меняется (как в «Расчётах»). */
  lockedEstimatePresetIds: Set<string>;
  setEstimatePresets: Dispatch<SetStateAction<ContractEstimatePreset[]>>;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  formRef: MutableRefObject<PackageFormData>;
  schedulePersistDebounced: () => void;
  setDirty: (dirty: boolean) => void;
  setError: Dispatch<SetStateAction<string | null>>;
};

/**
 * Смена наценки расчёта со вкладки «Смета»/«Счёт-заказ» (синхронно с разделом «Расчёты»):
 * сохраняет `additionalMarkupPercent` пресета общим PUT каталога расчётов и пересчитывает
 * снимки сметы этого пакета (осн. смета и неподписанные Д/с) с суммами договора.
 */
export function usePackageEstimatePresetMarkupChange({
  signedDocsLocked,
  packageKind,
  productDirection,
  estimatePresets,
  estimateGroups,
  lockedEstimatePresetIds,
  setEstimatePresets,
  setForm,
  formRef,
  schedulePersistDebounced,
  setDirty,
  setError,
}: UsePackageEstimatePresetMarkupChangeOptions) {
  const { canEdit } = useAdminSectionCanEdit();
  const [estimateMarkupSaving, setEstimateMarkupSaving] = useState(false);

  const onEstimatePresetMarkupChange = useCallback(
    async (presetId: string, raw: string) => {
      if (!canEdit || signedDocsLocked || estimateMarkupSaving) return;
      if (lockedEstimatePresetIds.has(presetId)) return;
      const current = estimatePresets.find((it) => it.id === presetId);
      if (!current) return;
      const parsed = parseOptionalPercentInput(raw);
      const hadExplicit = typeof current.additionalMarkupPercent === 'number';
      if (parsed === undefined && !hadExplicit) return;

      const nextItems = estimatePresets.map((it) => {
        if (it.id !== presetId) return it;
        if (parsed === undefined) {
          const { additionalMarkupPercent: _drop, ...rest } = it;
          return rest as ContractEstimatePreset;
        }
        return { ...it, additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsed) };
      });

      setEstimateMarkupSaving(true);
      setError(null);
      try {
        await putContractDocumentEstimatePresets({
          kind: estimatePresetsCatalogKind(packageKind),
          items: nextItems,
          groups: estimateGroups,
        });
        setEstimatePresets(nextItems);
        setForm((prev) => {
          const next = recomputePackageEstimateSnapshots(
            prev,
            [presetId],
            nextItems,
            estimateGroups,
            productDirection
          );
          formRef.current = next;
          schedulePersistDebounced();
          return next;
        });
        setDirty(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить наценку расчёта');
      } finally {
        setEstimateMarkupSaving(false);
      }
    },
    [
      canEdit,
      estimateGroups,
      estimateMarkupSaving,
      estimatePresets,
      formRef,
      lockedEstimatePresetIds,
      packageKind,
      productDirection,
      schedulePersistDebounced,
      setDirty,
      setError,
      setEstimatePresets,
      setForm,
      signedDocsLocked,
    ]
  );

  return { estimateMarkupSaving, onEstimatePresetMarkupChange };
}
