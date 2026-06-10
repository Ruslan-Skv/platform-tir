import { useCallback, useMemo } from 'react';

import cdBase from '../../../styles/base.module.css';
import cdDataTab from '../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import {
  type PackageContractObjectBlockFieldId,
  snapshotPackageContractObjectBlockFields,
} from '../editor/packageContractObjectBlock';
import type { PackageFormData } from '../form/packageForm';

export type UsePackageContractObjectBlockUiOptions = {
  form: PackageFormData;
  contractAndEstimateLocked: boolean;
  contractObjectBlockBaseline: Record<PackageContractObjectBlockFieldId, string> | null;
};

export function usePackageContractObjectBlockUi({
  form,
  contractAndEstimateLocked,
  contractObjectBlockBaseline,
}: UsePackageContractObjectBlockUiOptions) {
  const contractObjectBlockEditedFlags = useMemo(() => {
    if (!contractObjectBlockBaseline || contractAndEstimateLocked) {
      return {} as Partial<Record<PackageContractObjectBlockFieldId, boolean>>;
    }
    const current = snapshotPackageContractObjectBlockFields(form);
    const flags: Partial<Record<PackageContractObjectBlockFieldId, boolean>> = {};
    for (const fieldId of Object.keys(
      contractObjectBlockBaseline
    ) as PackageContractObjectBlockFieldId[]) {
      flags[fieldId] = contractObjectBlockBaseline[fieldId] !== current[fieldId];
    }
    return flags;
  }, [form, contractObjectBlockBaseline, contractAndEstimateLocked]);

  const contractObjectBlockFieldClassName = useCallback(
    (fieldId: PackageContractObjectBlockFieldId): string | undefined => {
      if (contractAndEstimateLocked) {
        return `${cdBase.autoFilledInput} ${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;
      }
      if (contractObjectBlockEditedFlags[fieldId]) {
        return `${cdBase.packageContractObjectFieldEdited} ${cdDataTab.packageContractObjectFieldEdited} ${cdEstimateTab.packageContractObjectFieldEdited}`;
      }
      return undefined;
    },
    [contractAndEstimateLocked, contractObjectBlockEditedFlags]
  );

  return { contractObjectBlockFieldClassName };
}
