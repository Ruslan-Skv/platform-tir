'use client';

import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { packageKindUiLabel } from '../../../config';
import { packageDiscountFieldHelp } from '../../estimates/packageDiscountFieldHelp';
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
  contractAndEstimateLocked: boolean;
  isSuperAdmin: boolean;
  form: PackageFormData;
};

export function usePackageDataTabFieldHelp({
  packageKind,
  isProductDirectionPackage,
  contractAndEstimateLocked,
  isSuperAdmin,
  form,
}: UsePackageDataTabFieldHelpOptions) {
  const workPeriodFieldHelp = useMemo(
    () =>
      buildWorkPeriodFieldHelp({
        packageKindLabel: packageKindUiLabel(packageKind),
        contractLocked: contractAndEstimateLocked,
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
      contractAndEstimateLocked,
      form.contract.workPeriodIsManual,
      form.contract.workPeriod,
      isSuperAdmin,
      isProductDirectionPackage,
    ]
  );

  const discountFieldHelp = useMemo(
    () =>
      packageDiscountFieldHelp({
        isWindowsPackage: isProductDirectionPackage,
        contractLocked: contractAndEstimateLocked,
      }),
    [isProductDirectionPackage, contractAndEstimateLocked]
  );

  const contractDateFieldHelp = useMemo(
    () =>
      buildContractDateFieldHelp({
        isWindowsPackage: isProductDirectionPackage,
        contractLocked: contractAndEstimateLocked,
      }),
    [isProductDirectionPackage, contractAndEstimateLocked]
  );

  return {
    workPeriodFieldHelp,
    discountFieldHelp,
    contractDateFieldHelp,
  };
}
