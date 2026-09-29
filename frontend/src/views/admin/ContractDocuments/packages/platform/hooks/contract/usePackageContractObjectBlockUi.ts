import { useCallback, useMemo } from 'react';

import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  type PackageContractObjectBlockFieldId,
  snapshotPackageContractObjectBlockFields,
} from '../../editor/shared/packageContractObjectBlock';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageContractObjectBlockUiOptions = {
  form: PackageFormData;
  signedDocsLocked: boolean;
  contractObjectBlockBaseline: Record<PackageContractObjectBlockFieldId, string> | null;
};

export function usePackageContractObjectBlockUi({
  form,
  signedDocsLocked,
  contractObjectBlockBaseline,
}: UsePackageContractObjectBlockUiOptions) {
  const contractObjectBlockEditedFlags = useMemo(() => {
    if (!contractObjectBlockBaseline || signedDocsLocked) {
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
  }, [form, contractObjectBlockBaseline, signedDocsLocked]);

  const contractObjectBlockFieldClassName = useCallback(
    (fieldId: PackageContractObjectBlockFieldId): string | undefined => {
      if (signedDocsLocked) {
        return `${cdBase.autoFilledInput} ${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;
      }
      if (contractObjectBlockEditedFlags[fieldId]) {
        return `${cdBase.packageContractObjectFieldEdited} ${cdDataTab.packageContractObjectFieldEdited} ${cdEstimateTab.packageContractObjectFieldEdited}`;
      }
      return undefined;
    },
    [signedDocsLocked, contractObjectBlockEditedFlags]
  );

  return { contractObjectBlockFieldClassName };
}
