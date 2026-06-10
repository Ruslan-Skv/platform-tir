import { useMemo } from 'react';

import type { ContractDocumentPackageStatus } from '@/shared/api/admin-contract-document-packages';

import { formatContractConcludedDateForHeader } from '../editor/formatContractConcludedDateForHeader';
import { getPackageContractNumberDisplayForForm } from '../form/packageContractDisplay';
import type { PackageFormData } from '../form/packageForm';
import { getPackageAddendumTabAddState } from '../hub/packageAddendumTabState';
import { getSignedAddendumOrdinals, getUnsignedAddendumOrdinals } from '../hub/packagePipeline';

export type UsePackageEditorHeaderStateOptions = {
  form: PackageFormData;
  packageFlowStatus: ContractDocumentPackageStatus;
};

export function usePackageEditorHeaderState({
  form,
  packageFlowStatus,
}: UsePackageEditorHeaderStateOptions) {
  const headerContractNumberLabel = useMemo(
    () => getPackageContractNumberDisplayForForm(form),
    [form.contract.number, form._repairCopyContractNumberBaseline]
  );

  const unsignedAddendumOrdinals = useMemo(
    () => getUnsignedAddendumOrdinals(form, packageFlowStatus),
    [form, packageFlowStatus]
  );

  const signedAddendumOrdinals = useMemo(() => getSignedAddendumOrdinals(form), [form]);

  const { disabled: addendumTabAddDisabled, addTitle: addendumTabAddTitle } =
    getPackageAddendumTabAddState(form, packageFlowStatus);

  const headerContractConcludedDateLabel =
    packageFlowStatus === 'CONTRACT_CONCLUDED'
      ? formatContractConcludedDateForHeader(form.contractConcludedAt)
      : null;

  return {
    headerContractNumberLabel,
    unsignedAddendumOrdinals,
    signedAddendumOrdinals,
    addendumTabAddDisabled,
    addendumTabAddTitle,
    headerContractConcludedDateLabel,
  };
}
