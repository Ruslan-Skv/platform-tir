import { useMemo } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { contractDateToDdMmYyyy } from '../../../../core/contractDateFormat';
import { buildEstimateSectionsFromPresetIds } from '../../estimates/packageEstimateDocPrintEmbedHtml';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageEditorEstimateDerivedStateOptions = {
  form: PackageFormData;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
};

export function usePackageEditorEstimateDerivedState({
  form,
  estimatePresets,
  estimateGroups,
}: UsePackageEditorEstimateDerivedStateOptions) {
  const selectedEstimateSections = useMemo(
    () =>
      buildEstimateSectionsFromPresetIds(
        form.estimate.selectedPresetIds,
        estimatePresets,
        estimateGroups
      ),
    [form.estimate.selectedPresetIds, estimatePresets, estimateGroups]
  );

  const estimateAppendixContractRef = useMemo(() => {
    const num = form.contract.number.trim() || '—';
    const raw = form.contract.date.trim();
    const date = !raw ? '—' : contractDateToDdMmYyyy(raw) || raw;
    return { num, date };
  }, [form.contract.number, form.contract.date]);

  return { selectedEstimateSections, estimateAppendixContractRef };
}
