'use client';

import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { packageKindUiLabel } from '../../../config';
import { contractDateFieldHelp as buildContractDateFieldHelp } from '../../form/contractDateFieldHelp';
import {
  DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
} from '../../form/contractWorkPeriod';
import type { PackageFormData } from '../../form/packageForm';
import { workPeriodFieldHelp as buildWorkPeriodFieldHelp } from '../../form/workPeriodFieldHelp';

export type UsePackageDataTabFieldHelpOptions = {
  packageKind: ContractDocumentPackageKind;
  isProductDirectionPackage: boolean;
  signedDocsLocked: boolean;
  isSuperAdmin: boolean;
  form: PackageFormData;
};

export function usePackageDataTabFieldHelp({
  packageKind,
  isProductDirectionPackage,
  signedDocsLocked,
  isSuperAdmin,
  form,
}: UsePackageDataTabFieldHelpOptions) {
  const workPeriodFieldHelp = useMemo(
    () =>
      buildWorkPeriodFieldHelp({
        packageKindLabel: packageKindUiLabel(packageKind),
        contractLocked: signedDocsLocked,
        workPeriodIsManual: form.contract.workPeriodIsManual === true,
        isSuperAdmin,
        placeholderDays:
          form.contract.workPeriod.trim() ||
          (isProductDirectionPackage
            ? String(DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS)
            : String(DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS)),
      }),
    [
      packageKind,
      signedDocsLocked,
      form.contract.workPeriodIsManual,
      form.contract.workPeriod,
      isSuperAdmin,
      isProductDirectionPackage,
    ]
  );

  const contractDateFieldHelp = useMemo(
    () =>
      buildContractDateFieldHelp({
        isWindowsPackage: isProductDirectionPackage,
        contractLocked: signedDocsLocked,
      }),
    [isProductDirectionPackage, signedDocsLocked]
  );

  return {
    workPeriodFieldHelp,
    contractDateFieldHelp,
  };
}
