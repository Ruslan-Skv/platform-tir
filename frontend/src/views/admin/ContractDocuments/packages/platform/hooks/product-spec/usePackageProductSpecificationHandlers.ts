import { useCallback } from 'react';

import type { PackageFormData } from '../../form/packageForm';

export type UsePackageProductSpecificationHandlersOptions = {
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
  setError: (message: string | null) => void;
};

export function usePackageProductSpecificationHandlers({
  setForm,
  touchPackageData,
  setError,
}: UsePackageProductSpecificationHandlersOptions) {
  const onProductSpecificationAmountChange = useCallback(
    (value: string) => {
      setForm((p) => ({ ...p, productSpecificationAmount: value }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onProductSpecificationFileAttached = useCallback(
    ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
      setForm((p) => ({
        ...p,
        productSpecificationFileUrl: fileUrl,
        productSpecificationFileName: fileName,
      }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onProductSpecificationFileClear = useCallback(() => {
    setForm((p) => ({
      ...p,
      productSpecificationFileUrl: '',
      productSpecificationFileName: '',
    }));
    touchPackageData();
  }, [setForm, touchPackageData]);

  const onDoorsSpecificationLinesChange = useCallback(
    (lines: PackageFormData['doorsSpecificationLines']) => {
      setForm((p) => ({ ...p, doorsSpecificationLines: lines }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onDoorsSpecificationDiscountPercentChange = useCallback(
    (value: string) => {
      setForm((p) => ({ ...p, doorsSpecificationDiscountPercent: value }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onCeilingsSpecificationChange = useCallback(
    (ceilingsSpecification: PackageFormData['ceilingsSpecification']) => {
      setForm((p) => ({ ...p, ceilingsSpecification }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  return {
    onProductSpecificationAmountChange,
    onProductSpecificationFileAttached,
    onProductSpecificationFileClear,
    onDoorsSpecificationLinesChange,
    onDoorsSpecificationDiscountPercentChange,
    onCeilingsSpecificationChange,
    onError: setError,
  };
}
